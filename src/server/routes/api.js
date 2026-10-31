// Admin-only surface. The read-only dashboard endpoints a guest is allowed to
// see live in routes/dashboard.js; everything here either exposes credentials
// and filesystem paths, or changes something.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { paths } from "../paths.js";
import { get as getServer, update as updateServer } from "../data/serverStore.js";
import { readManagedFile, writeManagedFile, sendFileError } from "../util/managedFiles.js";
import { singleFile } from "../middleware/uploadErrors.js";
import serverWindowRoutes from "./serverWindowRoutes.js";
import { isServerRunning } from "../services/serverState.js";
import { describePorts, checkPorts, applyPorts, portsOverview } from "../services/serverPorts.js";
import { planRemoval, removeServerCompletely } from "../services/serverRemoval.js";
import { forgetServerInSchedules } from "../services/scheduler.js";
import { forgetPlayers } from "../services/playerTracker.js";
import { forgetMetrics } from "../services/metrics.js";
import { listVersions, readVersion } from "../services/configHistory.js";
import { MotdError, readMotd, writeMotd } from "../services/motdService.js";
import { CloneError, startClone, getCloneJob } from "../services/cloneService.js";
import { BundleError } from "../services/serverBundle.js";
import { startExportJob, getExportJob, takeExportFile, isExportJobId } from "../services/exportJobs.js";
import { planImport } from "../services/bundleImport.js";
import { startImportJob, getImportJob, isImportJobId } from "../services/importJobs.js";
import { stageUpload, stagedFile, discardUpload, sweepStaleUploads } from "../services/bundleUploads.js";
import { BusyError } from "../services/serverOps.js";
import { RotationError, describeRotation, rotateRconPassword } from "../services/rconRotation.js";
import { PresetError, listPresets, savePreset, deletePreset, applyPreset } from "../services/presetService.js";
import { extractModpackZip, cleanupUpload } from "../services/modpackService.js";
import { SUPPORTED_MODLOADER_FAMILIES } from "../data/gameTemplates.js";
import { pollServers } from "../services/pollingService.js";
import { GAME_MODULES } from "../data/games/index.js";
import {
	isAutoUpdateEnabled,
	setAutoUpdateEnabled,
} from "../services/autoUpdateSettings.js";
import {
	listTemplates,
	suggestParams,
	createServer,
	getJob,
} from "../services/serverCreationService.js";

const router = express.Router();

// Every route with :serverName resolves it once, here, instead of repeating
// the lookup and the 404 in each handler.
router.param("serverName", (req, res, next, name) => {
	const server = getServer(name);
	if (!server) return res.status(404).json({ error: "Server not found" });
	req.server = server;
	next();
});

// Window mode, launch details and console output for one server.
router.use("/server/:serverName", serverWindowRoutes);

// Some games are set up (wholly or partly) by arguments on the command that starts them: Valheim has no settings file at all, and
// the others take a few settings there. The start script is offered as one more settings file, "Launch options": the interface
// reads the arguments out of its launch line and writes edits back (see ui/src/configParsers).
const LAUNCH_OPTIONS_FILE = "Launch options";
const LAUNCH_OPTION_GAMES = new Set(["valheim", "rust", "corekeeper", "satisfactory", "7days", "vrising", "sotf", "zomboid", ...GAME_MODULES.filter((m) => m.launchOptions).map((m) => m.template.type)]);
const launchOptionsFile = (server) => (LAUNCH_OPTION_GAMES.has(String(server.type).toLowerCase()) && server.startScriptPath ? server.startScriptPath : null);
const ownsNoConfig = (server) => !server.configPaths && !server.configPath;

/** The names of a server's settings files, as the interface lists them. */
export function configNamesOf(server) {
	const names = server.configPaths ? Object.keys(server.configPaths) : server.configPath ? ["config"] : [];
	return launchOptionsFile(server) ? [...names, LAUNCH_OPTIONS_FILE] : names;
}

/** Which file a config request means: a named one, or the server's single file. */
function configPathFor(server, name) {
	if (name === LAUNCH_OPTIONS_FILE) return launchOptionsFile(server) ?? undefined;
	// Own names only: "constructor" and the like exist on every object and are not files.
	if (server.configPaths) return typeof name === "string" && Object.hasOwn(server.configPaths, name) ? server.configPaths[name] : undefined;
	return server.configPath;
}

// Basic info about a single server
router.get("/server/:serverName", async (req, res) => {
	const server = req.server;
	res.json({
		name: server.name,
		type: server.type,
		configNames: configNamesOf(server),
		hasUpdate: Boolean(server.updateAppId),
		hasRcon: Boolean(server.rconPort && server.rconPassword),
		hasAutoUpdate: Boolean(server.updateAppId),
		autoUpdateEnabled: server.updateAppId
			? await isAutoUpdateEnabled(server)
			: false,
	});
});

// Toggle whether this server participates in the Steam-build auto-update
// checker. Takes effect on the next check — no restart needed.
router.post("/server/:serverName/auto-update", async (req, res) => {
	const server = req.server;
	if (!server.updateAppId) {
		return res.status(400).json({ error: "This server has no update configured." });
	}

	const { enabled } = req.body || {};
	if (typeof enabled !== "boolean") {
		return res.status(400).json({ error: "`enabled` (boolean) is required." });
	}

	await setAutoUpdateEnabled(server.name, enabled);
	res.json({ success: true, autoUpdateEnabled: enabled });
});

// --- Tags: free labels for finding and grouping servers on the dashboard ---

const TAG = /^[\p{L}\p{N} ._-]{1,24}$/u;

router.put("/server/:serverName/tags", async (req, res) => {
	const raw = req.body?.tags;
	if (!Array.isArray(raw)) return res.status(400).json({ error: "tags must be a list." });
	const tags = [];
	for (const item of raw) {
		if (typeof item !== "string") return res.status(400).json({ error: "Each tag must be text.", code: "bad_tag" });
		const tag = item.trim().replace(/\s+/g, " ");
		if (!TAG.test(tag)) return res.status(400).json({ error: `"${tag.slice(0, 30)}" isn't a valid tag: use up to 24 letters, numbers, spaces, dots, dashes or underscores.`, code: "bad_tag" });
		if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
	}
	if (tags.length > 10) return res.status(400).json({ error: "A server can have up to 10 tags.", code: "too_many_tags" });
	const updated = await updateServer(req.server.name, { tags });
	pollServers().catch(() => {});
	res.json({ tags: updated.tags });
});

// What the dashboard and Discord show as this server's Session. Blank means "automatic": the public address and the game port.
// It is a label only: it does not rename the server inside the game.
router.put("/server/:serverName/session", async (req, res) => {
	const raw = req.body?.sessionLabel;
	if (typeof raw !== "string") return res.status(400).json({ error: "sessionLabel must be text (blank for automatic).", code: "bad_session" });
	const label = raw.replace(/\s+/g, " ").trim();
	if (label.length > 100) return res.status(400).json({ error: "Keep it to 100 characters or fewer.", code: "bad_session" });
	const updated = await updateServer(req.server.name, { sessionLabel: label });
	pollServers().catch(() => {});
	res.json({ sessionLabel: updated.sessionLabel ?? "" });
});

// --- Ports ---

// Every server and the ports it uses (administrators): the list behind "Show server port list".
router.get("/ports", async (req, res) => res.json(await portsOverview()));

router.get("/server/:serverName/ports", async (req, res) => {
	res.json({ ...(await describePorts(req.server)), running: await isServerRunning(req.server) });
});

// Live validation for the ports form: the same check the save runs.
router.post("/server/:serverName/ports/check", async (req, res) => {
	res.json(await checkPorts(req.server, req.body?.ports));
});

router.put("/server/:serverName/ports", async (req, res) => {
	// A running game keeps the ports it started with, so a change would be
	// recorded as done while the server carried on using the old ones.
	if (await isServerRunning(req.server)) {
		return res.status(409).json({ error: "Stop the server first: a running game keeps the ports it started with.", code: "server_running" });
	}
	try {
		const result = await applyPorts(req.server, req.body?.ports);
		pollServers().catch(() => {});
		res.json({ success: true, ...result, ...(await describePorts(getServer(req.server.name))) });
	} catch (err) {
		if (err.code === "port_conflict") return res.status(400).json({ error: err.message, code: err.code });
		console.error(`Port change failed for ${req.server.name}:`, err);
		res.status(500).json({ error: `Couldn't change the ports: ${err.message}` });
	}
});

// --- Removing a server ---

router.get("/server/:serverName/removal", async (req, res) => {
	res.json({ ...planRemoval(req.server), running: await isServerRunning(req.server) });
});

router.delete("/server/:serverName", async (req, res) => {
	const { deleteFiles = false, confirmName } = req.body ?? {};
	if (confirmName !== req.server.name) {
		return res.status(400).json({ error: "Type the server's exact name to confirm.", code: "confirm_mismatch" });
	}
	if (await isServerRunning(req.server)) {
		return res.status(409).json({ error: "Stop the server first. A running server can't be removed.", code: "server_running" });
	}
	try {
		const removed = await removeServerCompletely(req.server, { deleteFiles: deleteFiles === true });
		await forgetServerInSchedules(req.server.name);
		forgetPlayers(req.server.name);
		await forgetMetrics(`server:${req.server.name}`);
		res.json({ success: true, ...removed });
	} catch (err) {
		const status = err.code === "files_protected" ? 400 : 500;
		if (status === 500) console.error(`Removing ${req.server.name} failed:`, err);
		res.status(status).json({ error: err.message, code: err.code });
	}
});

// --- Settings history: every version of a settings or start-script file the panel wrote ---

/** The files a server's history covers: its settings files and its start script. */
function historyFiles(server) {
	const files = server.configPaths
		? Object.entries(server.configPaths).map(([key, file]) => ({ key, file }))
		: server.configPath
			? [{ key: "config", file: server.configPath }]
			: [];
	// A game whose settings file is its start script lists it once, under the name the settings page uses.
	if (launchOptionsFile(server) && ownsNoConfig(server)) files.push({ key: LAUNCH_OPTIONS_FILE, file: launchOptionsFile(server) });
	else if (server.startScriptPath) files.push({ key: "start script", file: server.startScriptPath });
	return files;
}

router.get("/server/:serverName/history", async (req, res) => {
	const out = [];
	for (const { key, file } of historyFiles(req.server)) out.push({ key, versions: (await listVersions(file)).length });
	res.json(out);
});

router.get("/server/:serverName/history/:key", async (req, res) => {
	const target = historyFiles(req.server).find((f) => f.key === req.params.key);
	if (!target) return res.status(404).json({ error: "No such file." });
	res.json(await listVersions(target.file));
});

router.get("/server/:serverName/history/:key/:id", async (req, res) => {
	const target = historyFiles(req.server).find((f) => f.key === req.params.key);
	if (!target) return res.status(404).json({ error: "No such file." });
	const content = await readVersion(target.file, req.params.id);
	if (content === null) return res.status(404).json({ error: "No such version." });
	res.json({ content });
});

// Put an earlier version back. The restore is itself a new version, so it can be undone too.
router.post("/server/:serverName/history/:key/:id/restore", async (req, res) => {
	const target = historyFiles(req.server).find((f) => f.key === req.params.key);
	if (!target) return res.status(404).json({ error: "No such file." });
	const content = await readVersion(target.file, req.params.id);
	if (content === null) return res.status(404).json({ error: "No such version." });
	if (await isServerRunning(req.server)) {
		return res.status(409).json({ error: "Stop the server first: a running game writes its settings back when it stops.", code: "server_running" });
	}
	try {
		await writeManagedFile(target.file, content, "restored an earlier version");
		res.json({ success: true });
	} catch (err) {
		sendFileError(res, err, `the ${req.params.key} file`);
	}
});

// --- Message of the day ---

router.get("/server/:serverName/motd", async (req, res) => {
	res.json({ ...(await readMotd(req.server)), running: await isServerRunning(req.server) });
});

router.put("/server/:serverName/motd", async (req, res) => {
	try {
		res.json(await writeMotd(req.server, req.body?.value));
	} catch (err) {
		if (err instanceof MotdError) return res.status(err.status).json({ error: err.message, code: err.code });
		sendFileError(res, err, "the settings file");
	}
});

// --- Cloning and presets ---

// Copies the whole server under a new name, ports and RCON password. Returns at once;
// the copy carries on in the background (progress on the live stream and at clone-jobs).
router.post("/server/:serverName/clone", async (req, res) => {
	try {
		const { name, sessionName, ports } = req.body ?? {};
		res.status(202).json(
			await startClone(req.server, name, {
				sessionName: typeof sessionName === "string" && sessionName.trim() ? sessionName.trim() : undefined,
				ports: ports && typeof ports === "object" ? ports : undefined,
			}),
		);
	} catch (err) {
		if (err instanceof CloneError || err.code) return res.status(err.status ?? 400).json({ error: err.message, code: err.code });
		console.error(`Cloning ${req.server.name} failed:`, err);
		res.status(500).json({ error: err.message });
	}
});

// Replace the RCON password everywhere it is kept. The preview says which servers and files would change,
// including servers that share them; the change itself needs the server stopped.
router.get("/server/:serverName/rcon-password/rotation", async (req, res) => {
	try {
		res.json(await describeRotation(req.server));
	} catch (err) {
		if (err instanceof RotationError) return res.status(err.status).json({ error: err.message, code: err.code });
		res.status(500).json({ error: err.message });
	}
});

router.post("/server/:serverName/rcon-password/rotate", async (req, res) => {
	if (req.body?.confirm !== true) return res.status(400).json({ error: "Confirm the change to rotate the password.", code: "not_confirmed" });
	try {
		res.json(await rotateRconPassword(req.server));
	} catch (err) {
		if (err instanceof RotationError) return res.status(err.status).json({ error: err.message, code: err.code });
		console.error(`Rotating the RCON password of ${req.server.name} failed:`, err);
		res.status(500).json({ error: err.message });
	}
});

router.get("/clone-jobs/:id", (req, res) => {
	const job = getCloneJob(req.params.id);
	job ? res.json(job) : res.status(404).json({ error: "No such job." });
});

// Exports a stopped server as one .gpserver file. Returns at once; the export runs in the background and the file waits
// to be downloaded once (see exportJobs.js). Administrators only: the whole server and its passwords (if asked) go in the file.
router.post("/server/:serverName/export", async (req, res) => {
	// An omitted value takes the default; a value of the wrong type (null included) is refused, not coerced.
	const include = req.body?.include === undefined ? "saves" : req.body.include;
	const secrets = req.body?.secrets === undefined ? false : req.body.secrets;
	try {
		const job = await startExportJob(req.server, { include, secrets });
		res.status(202).json(job);
	} catch (err) {
		if (err instanceof BundleError || err instanceof BusyError) return res.status(err.status).json({ error: err.message, code: err.code });
		console.error(`Exporting ${req.server.name} failed:`, err);
		res.status(500).json({ error: err.message });
	}
});

router.get("/export-jobs/:id", (req, res) => {
	const job = isExportJobId(req.params.id) ? getExportJob(req.params.id) : null;
	job ? res.json(job) : res.status(404).json({ error: "No such job." });
});

// The finished file, once. The job and its temp folder go when the download has been sent (or has failed).
router.get("/export-jobs/:id/download", async (req, res) => {
	const taken = isExportJobId(req.params.id) ? await takeExportFile(req.params.id) : null;
	if (!taken) return res.status(404).json({ error: "No export is ready to download, or it was already downloaded." });
	res.setHeader("Content-Type", "application/octet-stream");
	res.download(taken.file, taken.name, (err) => {
		taken.done();
		// The error text may carry the temp path, so the person only hears that sending failed.
		if (err && !res.headersSent) res.status(500).json({ error: "Sending the export failed." });
	});
});

// --- Importing a server bundle ---

// The bundle is only put aside on disk here (its contents are read when it is planned), so the upload is a plain copy, up to 20 GB.
const bundleUploadDir = path.join(paths.uploadsDir, "incoming-bundles");
const bundleUpload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			fs.mkdirSync(bundleUploadDir, { recursive: true });
			cb(null, bundleUploadDir);
		},
		filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.part`),
	}),
	limits: { fileSize: 20 * 1024 * 1024 * 1024 },
});

// A bundle error keeps its own reason and status. Anything else may carry a folder name, so the person only hears that it failed.
function sendBundleError(res, err, what) {
	if (err instanceof BundleError) return res.status(err.status).json({ error: err.message, code: err.code });
	console.error(`${what} failed:`, err);
	res.status(500).json({ error: "The request failed. The panel's log has the details." });
}

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// The bundle a plan or an import reads: exactly one of a staged upload's id or a full path on this PC. Anything else is refused.
async function bundleSource(body) {
	const hasId = body?.uploadId !== undefined;
	const hasPath = body?.path !== undefined;
	if (hasId === hasPath) throw new BundleError("Give either an uploadId or a path, not both or neither.", "bad_input");
	if (hasId) {
		if (typeof body.uploadId !== "string") throw new BundleError("uploadId must be text.", "bad_input");
		const file = await stagedFile(body.uploadId);
		if (!file) throw new BundleError("That upload is gone. Upload the bundle again.", "no_such_upload", 404);
		return { file, source: { uploadId: body.uploadId }, uploadId: body.uploadId };
	}
	if (typeof body.path !== "string" || !path.isAbsolute(body.path)) throw new BundleError("Give the full path of a .gpserver file.", "bad_file");
	// A network address would make this PC sign in to whatever machine the address names, so only local paths are read.
	if (body.path.startsWith("\\") || body.path.startsWith("//")) throw new BundleError("Give a path on this PC, not a network address.", "bad_file");
	return { file: body.path, source: { path: body.path }, uploadId: null };
}

router.post("/uploads/bundle", singleFile(bundleUpload, "bundleFile", "20 GB"), async (req, res) => {
	if (!req.file) return res.status(400).json({ error: "A bundleFile is required.", code: "bad_input" });
	try {
		res.json(await stageUpload(req.file.path));
	} catch (err) {
		sendBundleError(res, err, "Saving a bundle upload");
	}
});

// Says what the import would do (the name, ports and any notes) by reading only the bundle's manifest.
router.post("/import/plan", async (req, res) => {
	try {
		await sweepStaleUploads();
		const { file, source } = await bundleSource(req.body);
		res.json({ ...(await planImport(file)), source });
	} catch (err) {
		sendBundleError(res, err, "Planning an import");
	}
});

// Starts the import in the background and answers with the job. The new server always goes in the panel's own servers folder:
// no folder is taken from the request. A staged upload is removed when the job ends, a path the person gave is never touched.
router.post("/import", async (req, res) => {
	const body = req.body ?? {};
	try {
		if (typeof body.name !== "string") throw new BundleError("Give the new server a name.", "bad_input");
		if (body.ports !== undefined && !isPlainObject(body.ports)) throw new BundleError("ports must be an object of port numbers.", "bad_input");
		const { file, uploadId } = await bundleSource(body);
		// The hourly sweep goes by the file's age; touching it keeps a bundle that is being imported from being swept mid-way.
		if (uploadId) await fs.promises.utimes(file, new Date(), new Date()).catch(() => {});
		const job = startImportJob({
			file,
			name: body.name,
			ports: body.ports,
			cleanup: uploadId ? () => discardUpload(uploadId) : null,
		});
		res.status(202).json(job);
	} catch (err) {
		sendBundleError(res, err, "Starting an import");
	}
});

router.get("/import-jobs/:id", (req, res) => {
	const job = isImportJobId(req.params.id) ? getImportJob(req.params.id) : null;
	job ? res.json(job) : res.status(404).json({ error: "No such job." });
});

router.get("/presets", (req, res) => {
	res.json(listPresets());
});

router.post("/server/:serverName/presets", async (req, res) => {
	try {
		res.json(await savePreset(req.server, req.body?.name));
	} catch (err) {
		if (err instanceof PresetError) return res.status(err.status).json({ error: err.message, code: err.code });
		console.error("Saving a preset failed:", err);
		res.status(500).json({ error: err.message });
	}
});

router.delete("/presets/:id", async (req, res) => {
	(await deletePreset(req.params.id)) ? res.json({ success: true }) : res.status(404).json({ error: "No such preset." });
});

router.post("/server/:serverName/presets/:id/apply", async (req, res) => {
	try {
		res.json({ success: true, ...(await applyPreset(req.server, req.params.id, { keepIdentity: req.body?.keepIdentity !== false })) });
	} catch (err) {
		if (err instanceof PresetError) return res.status(err.status).json({ error: err.message, code: err.code });
		console.error("Applying a preset failed:", err);
		res.status(500).json({ error: err.message });
	}
});

// A byte-order mark in front of a settings file (V Rising's own default has one) makes the form's JSON.parse fail, so the form is
// sent the text without it and the mark is put back when the file is saved.
const BOM = String.fromCharCode(0xfeff);
const BOM_AT_START = new RegExp(`^${BOM}`);

// Get content of a specific config file
router.get("/config/:serverName", async (req, res) => {
	const target = configPathFor(req.server, req.query.file);
	if (!target) {
		return res.status(400).json({ error: "Valid config file must be specified." });
	}
	try {
		res.json({ content: (await readManagedFile(target)).replace(BOM_AT_START, "") });
	} catch (err) {
		sendFileError(res, err, `the config for ${req.server.name}`);
	}
});

// Save a config file
router.post("/config/:serverName", async (req, res) => {
	const { fileName, content } = req.body ?? {};
	const target = configPathFor(req.server, fileName);
	if (!target) {
		return res.status(400).json({ error: "A valid fileName must be provided." });
	}
	if (typeof content !== "string") {
		return res.status(400).json({ error: "The file could not be saved because its text wasn't sent in the expected form. Reload the page and try again." });
	}
	try {
		const hadMark = await readManagedFile(target).then((t) => t.startsWith(BOM), () => false);
		await writeManagedFile(target, hadMark && !content.startsWith(BOM) ? `${BOM}${content}` : content);
		res.json({ success: true, message: `${fileName ?? "Config"} saved successfully!` });
	} catch (err) {
		sendFileError(res, err, `the config for ${req.server.name}`);
	}
});

// --- Dynamic server creation ---

// On disk while it arrives: held in memory, a 500 MB upload cost the panel 500 MB (and AdmZip then needed as much again).
const modpackUploadDir = path.join(paths.uploadsDir, "incoming");
const modpackUpload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			fs.mkdirSync(modpackUploadDir, { recursive: true });
			cb(null, modpackUploadDir);
		},
		filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.upload`),
	}),
	limits: { fileSize: 500 * 1024 * 1024 },
});

// Upload + parse a CurseForge modpack export zip. Fast (zip I/O + JSON
// parse, no network calls) — responds synchronously with what was detected
// so the admin can confirm before the real creation job (which does the
// heavy mod-downloading) kicks off via the usual POST /servers below.
router.post("/uploads/modpack", singleFile(modpackUpload, "modpackZip", "500 MB"), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: "A modpackZip file is required." });
	}
	let extracted;
	let failure = null;
	try {
		extracted = await extractModpackZip(req.file.path);
	} catch (e) {
		failure = e;
	}
	// The panel keeps its own copy (under the upload's id); this one was only the way in. Removed before answering, so the
	// answer is never ahead of the tidying.
	await fs.promises.rm(req.file.path, { force: true }).catch(() => {});
	if (failure) return res.status(400).json({ error: failure.message });
	const { uploadId, manifest, hasOverrides } = extracted;
	if (!SUPPORTED_MODLOADER_FAMILIES.includes(manifest.modLoaderFamily)) {
		await cleanupUpload(uploadId);
		return res.status(400).json({
			error: `Unsupported modloader "${manifest.modLoaderFamily}" — only NeoForge, Forge, and Fabric modpacks are supported.`,
		});
	}
	res.json({
		uploadId,
		mcVersion: manifest.mcVersion,
		modLoaderFamily: manifest.modLoaderFamily,
		modLoaderVersion: manifest.modLoaderVersion,
		modCount: manifest.files.length,
		hasOverrides,
		packName: manifest.packName,
	});
});

// List the one-click game templates available for creation.
router.get("/templates", (req, res) => {
	res.json(listTemplates());
});

// Suggested defaults for a template (next-free ports, and whether a shared
// install — e.g. ARK ASA — already exists so the UI can say "adding a map
// to your existing cluster" instead of "installing a new server").
router.get("/templates/:id/suggest", async (req, res) => {
	try {
		res.json(await suggestParams(req.params.id));
	} catch (e) {
		res.status(404).json({ error: e.message });
	}
});

// Kick off creating a new server from a template. Long-running (SteamCMD
// install) — returns a jobId immediately; poll it at GET /servers/create/:jobId.
router.post("/servers", async (req, res) => {
	const { templateId, ...params } = req.body || {};
	if (!templateId) {
		return res.status(400).json({ error: "templateId is required." });
	}
	try {
		const jobId = await createServer(templateId, params);
		res.json({ success: true, jobId });
	} catch (e) {
		// 409: the person has to agree to a download first (SteamCMD, or a game's GitHub release zip); the form asks and sends again.
		const needsConsent = e.code === "steamcmd-not-installed" || e.code === "zip-download-not-accepted" || e.code === "web-download-not-accepted";
		res.status(needsConsent ? 409 : 400).json({ error: e.message, code: e.code, ...(e.details ? { details: e.details } : {}) });
	}
});

router.get("/servers/create/:jobId", async (req, res) => {
	const job = await getJob(req.params.jobId);
	if (!job) {
		return res.status(404).json({ error: "Unknown job." });
	}
	res.json(job);
});

export default router;

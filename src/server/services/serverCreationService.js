import { spawn } from "child_process";
import crypto from "node:crypto";
import { promises as fs } from "fs";
import path from "path";
import { all as allServers, add as addServer } from "../data/serverStore.js";
import { GAME_TEMPLATES, getTemplate } from "../data/gameTemplates.js";
import { startServer, stopServer } from "./serverControl.js";
import { pollServers } from "./pollingService.js";
import { paths } from "../paths.js";
import { getConfig } from "../config/configStore.js";
import { getSecrets } from "../config/secretsStore.js";
import { ensureSteamCmd, isSteamCmdInstalled } from "./steamCmdProvisioner.js";
import { assertStorageHeadroom } from "./storageService.js";
import { inspectFolder } from "./folderCheck.js";
import { resolveResource } from "../../shared/resources.js";
import { deriveLaunch } from "./batchLaunch.js";
import { writeMarker } from "./serverRemoval.js";
import {
	trackSteamCmd,
	untrackSteamCmd,
	markJobActive,
	markJobDone,
} from "./processRegistry.js";

// Job tracking — creation jobs are long-running (SteamCMD installs can take
// many minutes) so the API returns a jobId immediately and the frontend
// polls for progress, same pattern as the update-logs flow. Kept in memory
// for speed, but also persisted to disk: a successful job ends by
// restarting the API itself (see runJob), which wipes the in-memory Map —
// without the disk copy, a poll landing just after that restart would see
// "Unknown job" instead of the "done" status it just missed.
const jobs = new Map();
const JOBS_DIR = paths.creationLogsDir;

async function saveJobState(jobId, job) {
	try {
		await fs.mkdir(JOBS_DIR, { recursive: true });
		await fs.writeFile(
			path.join(JOBS_DIR, `${jobId}.json`),
			JSON.stringify(job),
			"utf8",
		);
	} catch {
		// Best-effort — the in-memory copy is still authoritative for as
		// long as this process is alive.
	}
}

function setStatus(jobId, patch) {
	const job = jobs.get(jobId);
	if (!job) return;
	Object.assign(job, patch);
	saveJobState(jobId, job);
}

export function listTemplates() {
	// Strip the generator functions — only the frontend-relevant metadata.
	return GAME_TEMPLATES.map((t) => ({
		id: t.id,
		displayName: t.displayName,
		type: t.type,
		sharedInstall: Boolean(t.sharedInstall),
		fields: t.fields,
		ports: t.ports,
		implicitPorts: t.implicitPorts ?? [],
		mapChoices: t.mapChoices ?? null,
		fieldMeta: t.fieldMeta ?? null,
		requiresEula: Boolean(t.requiresEula),
	}));
}

export async function getJob(jobId) {
	const inMemory = jobs.get(jobId);
	if (inMemory) return inMemory;
	try {
		const raw = await fs.readFile(path.join(JOBS_DIR, `${jobId}.json`), "utf8");
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function slugify(name) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 40);
}

/** The ports a game takes for itself, given the game port chosen for it. */
export function impliedPortsFor(template, ports) {
	if (!ports?.port) return [];
	return (template?.implicitPorts ?? []).map(({ offset, label }) => ({ port: ports.port + offset, offset, label }));
}

// `exclude` leaves one server's own ports out, for checking a change to them.
export async function usedPorts(extraScanDir, { excludeName, excludeScript } = {}) {
	const used = new Set();
	for (const s of allServers()) {
		if (s.name === excludeName) continue;
		for (const key of ["port", "queryPort", "rconPort"]) {
			if (s[key]) used.add(s[key]);
		}
		// A server's implied ports are as taken as the ones written in its entry.
		const template = GAME_TEMPLATES.find((t) => t.type === s.type && t.implicitPorts);
		for (const { port } of impliedPortsFor(template, s)) used.add(port);
	}

	// ARK's shared-install maps don't store their actual game/query port in
	// servers.js at all (only rconPort is tracked there — those two are
	// baked directly into each map's Start_<Map>.bat) — so for a shared
	// install, scan the existing start scripts for -Port=/-QueryPort=
	// values too, or a fresh ARK map would happily suggest a port one of
	// its siblings is already using.
	if (extraScanDir) {
		try {
			const files = await fs.readdir(extraScanDir);
			for (const file of files) {
				if (!/^Start_.*\.bat$/i.test(file)) continue;
				if (excludeScript && path.win32.join(extraScanDir, file).toLowerCase() === String(excludeScript).toLowerCase()) continue;
				const content = await fs.readFile(path.win32.join(extraScanDir, file), "utf8");
				for (const m of content.matchAll(/-(?:Port|QueryPort|RCONPort)=(\d+)/g)) {
					used.add(Number(m[1]));
				}
			}
		} catch {
			// Directory doesn't exist yet (no shared install) — nothing to scan.
		}
	}

	return used;
}

// Steps a port up until it's free. The stride and any explicitly reserved
// ports are configurable, since what's free depends on the machine.
async function nextFreePort(preferred, extraScanDir) {
	const { portAllocation } = getConfig();
	const used = await usedPorts(extraScanDir);
	const reserved = new Set(portAllocation.reservedPorts);
	const step = Math.max(1, portAllocation.step);

	let port = preferred;
	while ((used.has(port) || reserved.has(port)) && port <= 65535) port += step;
	return port;
}

/**
 * A per-server RCON password by default, rather than the shared "adminpass"
 * the original used. That password is effectively a remote console key, and
 * reusing one across every server on a machine that's about to be reachable
 * from the LAN is not a good default.
 */
function suggestRconPassword() {
	const { servers } = getConfig();
	if (servers.defaultRconPasswordMode === "fixed") {
		return getSecrets().fixedRconPassword || crypto.randomBytes(12).toString("base64url");
	}
	return crypto.randomBytes(12).toString("base64url");
}

export async function suggestParams(templateId) {
	const template = getTemplate(templateId);
	if (!template) throw new Error(`Unknown template: ${templateId}`);

	let sharedInstallDir = null;
	if (template.sharedInstall) {
		const sibling = allServers().find(
			(s) => s.type === template.type && s.updateAppId === template.updateAppId,
		);
		sharedInstallDir = sibling?.installDir?.replace(/\\$/, "") ?? null;
	}

	const ports = {};
	for (const p of template.ports) {
		ports[p.key] = await nextFreePort(p.default, sharedInstallDir);
	}

	return {
		ports,
		sharedInstallDir,
		rconPassword: suggestRconPassword(),
		// Shown as the form's default so it's clear where this will go.
		defaultInstallParent: inspectFolder(getConfig().paths.serversRoot).resolved,
	};
}

async function validateNewServer(template, name, ports, sharedInstallDir) {
	if (!name || !name.trim()) throw new Error("A server name is required.");
	if (allServers().some((s) => s.name === name)) {
		throw new Error(`A server named "${name}" already exists.`);
	}
	const labelOf = (key) => template.ports.find((p) => p.key === key)?.label ?? key;
	const entries = Object.entries(ports);

	// Two of this server's own ports can't be the same.
	const seen = new Map();
	for (const [key, value] of entries) {
		if (seen.has(value)) {
			throw new Error(`${labelOf(seen.get(value))} and ${labelOf(key)} are both ${value}. Each needs its own port.`);
		}
		seen.set(value, key);
	}

	const used = await usedPorts(sharedInstallDir);

	// Ports the game takes for itself next to the game port. Choosing one of them
	// for something else is what makes a server that starts but can't be reached.
	for (const { port, offset, label } of impliedPortsFor(template, ports)) {
		const clash = entries.find(([, value]) => value === port);
		if (clash) {
			throw new Error(
				`${labelOf(clash[0])} ${port} is the game port + ${offset}, which ${template.displayName} uses for ${label}. ` +
					`Pick a different ${labelOf(clash[0]).toLowerCase()} — ${port + 1} or higher is safe.`,
			);
		}
		if (used.has(port)) {
			throw new Error(
				`${template.displayName} also needs port ${port} (game port + ${offset}, for ${label}), and another server is already using it. Choose a different game port.`,
			);
		}
	}

	for (const [key, value] of entries) {
		if (used.has(value)) {
			throw new Error(`Port ${value} (${labelOf(key)}) is already used by another server.`);
		}
	}
}

async function runSteamCmd(installDir, appId, logStream) {
	// Resolves the configured path, or downloads SteamCMD from Valve the first
	// time it's needed — a fresh install has none, and making the user go and
	// find it is a poor first experience.
	const steamCmdPath = await ensureSteamCmd((msg) => logStream.write(`${msg}\n`));

	return new Promise((resolve, reject) => {
		const args = [
			"+force_install_dir",
			installDir,
			"+login",
			"anonymous",
			"+app_update",
			String(appId),
			"validate",
			"+quit",
		];
		const child = spawn(steamCmdPath, args, {
			windowsHide: true,
			stdio: ["ignore", logStream, logStream],
		});
		trackSteamCmd(child.pid);
		child.on("error", (err) => {
			untrackSteamCmd(child.pid);
			reject(err);
		});
		child.on("exit", (code) => {
			untrackSteamCmd(child.pid);
			// SteamCMD's own exit-code quirk (self-update relaunch reporting
			// non-zero even after a real success) is already documented
			// elsewhere in this codebase — treat any exit as "done" and let
			// the caller verify the install actually produced files, rather
			// than trusting the code alone.
			resolve(code);
		});
	});
}

/** The end of a file, as text — enough to read SteamCMD's verdict. */
async function tailOfFile(file, bytes = 64 * 1024) {
	const handle = await fs.open(file, "r");
	try {
		const { size } = await handle.stat();
		const length = Math.min(bytes, size);
		const buf = Buffer.alloc(length);
		await handle.read(buf, 0, length, size - length);
		return buf.toString("utf8");
	} finally {
		await handle.close();
	}
}

/**
 * Install a game with SteamCMD and only return once SteamCMD itself says it
 * worked.
 *
 * The exit code can't be used (a self-update relaunch reports non-zero after a
 * real success), and neither can "did some files appear": a failed install
 * still leaves an empty steamapps folder behind, which is how a Conan server
 * with no game in it once got registered as successfully created. SteamCMD's
 * own closing line is the reliable signal.
 *
 * A freshly downloaded SteamCMD very often fails its first real install with
 * "Missing configuration" and succeeds on the next run, so that one failure is
 * retried. Anything else (disk full, no such app) fails straight away with
 * SteamCMD's actual error rather than looping.
 */
async function installWithRetries(installDir, appId, logStream, logPath, log, maxAttempts = 3) {
	const success = new RegExp(`Success! App '${appId}' (fully installed|already up to date)`, "i");

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		const code = await runSteamCmd(installDir, appId, logStream);
		log(`SteamCMD exited with code ${code}.`);

		// Let the log stream flush what SteamCMD wrote before reading it back.
		await new Promise((resolve) => setImmediate(resolve));
		const tail = await tailOfFile(logPath).catch(() => "");
		if (success.test(tail)) return;

		const errorLine = [...tail.matchAll(/^ERROR!.*$/gim)].map((m) => m[0].trim()).pop();
		if (/Missing configuration/i.test(tail) && attempt < maxAttempts) {
			log("SteamCMD needs a second run after its first-time setup — trying again.");
			continue;
		}
		throw new Error(
			errorLine
				? `SteamCMD couldn't install the game: ${errorLine.replace(/^ERROR!\s*/i, "")}`
				: "SteamCMD finished without confirming the install — check the log for the real error.",
		);
	}
}

async function writeFileEnsuringDir(fullPath, content) {
	await fs.mkdir(path.dirname(fullPath), { recursive: true });
	await fs.writeFile(fullPath, content, "utf8");
}

async function runJob(jobId, template, params) {
	const logDir = paths.creationLogsDir;
	await fs.mkdir(logDir, { recursive: true });
	const logPath = path.join(logDir, `${jobId}.log`);
	const logFd = await fs.open(logPath, "a");
	const logStream = logFd.createWriteStream();
	setStatus(jobId, { logPath });
	markJobActive(jobId, { kind: "create", label: `Creating ${params.name}`, serverName: params.name });

	const log = (msg) => logStream.write(`${msg}\n`);

	try {
		let installDir = params.installDir;
		let skipInstall = false;

		if (template.sharedInstall && params.sharedInstallDir) {
			installDir = params.sharedInstallDir;
			skipInstall = true;
			log(`Reusing existing shared install at ${installDir} — no reinstall needed.`);
		}

		await fs.mkdir(installDir, { recursive: true });

		// Templates with no updateAppId (e.g. the Minecraft modpack template)
		// have no Steam install at all — everything is written directly.
		if (!skipInstall && template.updateAppId) {
			setStatus(jobId, { status: "installing" });
			log(`Installing appid ${template.updateAppId} to ${installDir} ...`);
			await installWithRetries(installDir, template.updateAppId, logStream, logPath, log);
		}

		setStatus(jobId, { status: "configuring" });
		const p = {
			...params,
			installDir,
			steamCmdRoot: getConfig().paths.serversRoot,
			// The copy the install above actually used. Entries used to record
			// <installDir>steamcmd.exe, which nothing ever put there, so the first
			// panel-driven update of a new server failed with a missing file.
			steamCmdExe: getConfig().paths.steamCmdPath,
			slug: params.slug,
			// Template builder functions (buildStartScript, buildServerEntry,
			// etc.) only ever see this params object, never the template
			// itself — installLayoutRoot has to be copied over explicitly or
			// every ${p.installLayoutRoot} in them silently renders as the
			// literal string "undefined" (exactly what happened here).
			installLayoutRoot: template.installLayoutRoot,
			startScriptFilename: template.buildStartScriptFilename
				? template.buildStartScriptFilename(params)
				: null,
		};

		const scriptRelDir =
			template.installLayoutRoot && !template.scriptAtRoot
				? path.win32.join(installDir, template.installLayoutRoot)
				: installDir;

		if (template.buildStartScript) {
			const scriptFullPath = path.win32.join(scriptRelDir, p.startScriptFilename);
			log(`Writing start script: ${scriptFullPath}`);
			await writeFileEnsuringDir(scriptFullPath, template.buildStartScript(p));
		}

		if (template.buildInnerStartScript) {
			const innerPath = path.win32.join(scriptRelDir, "Start_Server.bat");
			log(`Writing inner start script: ${innerPath}`);
			await writeFileEnsuringDir(innerPath, template.buildInnerStartScript(p));
		}

		if (template.buildConfigFile) {
			// Config files live wherever the game actually reads them from —
			// under installLayoutRoot when set — regardless of scriptAtRoot
			// (Enshrouded's launcher sits at the install root, but its config
			// is still nested under installLayoutRoot).
			const configBaseDir = template.installLayoutRoot
				? path.win32.join(installDir, template.installLayoutRoot)
				: installDir;
			const { relPath, content } = template.buildConfigFile(p);
			const configFullPath = path.win32.join(configBaseDir, relPath);
			log(`Writing config file: ${configFullPath}`);
			await writeFileEnsuringDir(configFullPath, content);
		}

		if (template.rconConfigRelPath) {
			// Enable RCON in the freshly-installed config, matching the fix
			// already applied to the hand-set-up Conan server — a fresh
			// install ships with it off by default. Same installLayoutRoot
			// caveat as buildConfigFile above.
			const rconBaseDir = template.installLayoutRoot
				? path.win32.join(installDir, template.installLayoutRoot)
				: installDir;
			const rconPath = path.win32.join(rconBaseDir, template.rconConfigRelPath);
			log(`Enabling RCON in: ${rconPath}`);
			let content = await fs.readFile(rconPath, "utf8").catch(() => null);
			if (content !== null) {
				content = content
					.replace(/RconEnabled=\d/, "RconEnabled=1")
					.replace(/RconPassword=\S*/, `RconPassword=${p.rconPassword}`)
					.replace(/RconPort=\d+/, `RconPort=${p.rconPort}`);
				await fs.writeFile(rconPath, content, "utf8");
			} else {
				log(`(RCON config not found yet at ${rconPath} — skipping, enable manually if needed.)`);
			}
		}

		if (template.copyStaticAssets) {
			const templatesRoot = resolveResource("templates");
			for (const asset of template.copyStaticAssets) {
				const src = path.win32.join(templatesRoot, asset.from);
				const dest = path.win32.join(installDir, asset.to);
				log(`Copying static asset: ${asset.from} -> ${dest}`);
				await fs.mkdir(path.dirname(dest), { recursive: true });
				await fs.copyFile(src, dest);
			}
		}

		if (template.buildExtraFiles) {
			for (const { relPath, content } of template.buildExtraFiles(p)) {
				const fullPath = path.win32.join(installDir, relPath);
				log(`Writing file: ${fullPath}`);
				await writeFileEnsuringDir(fullPath, content);
			}
		}

		// Heavier, template-specific async work (mod resolution/downloads,
		// overrides copy, etc.) — runs before the server is registered so a
		// still-downloading server never shows up as "live" on the dashboard.
		let postWriteWarnings = [];
		if (template.postWrite) {
			const result = await template.postWrite(p, {
				log,
				setStatus: (patch) => setStatus(jobId, patch),
			});
			if (result?.warnings?.length) postWriteWarnings = result.warnings;
		}

		const entry = template.buildServerEntry(p);

		// Read the direct launch out of the script just written, so "no window"
		// is available for this server from the start. Not every game's script
		// can be read (Minecraft's is already hidden and doesn't need it), and
		// that's fine: those servers simply use the hidden mode.
		if (entry.type !== "minecraft" && entry.startScriptPath) {
			const found = deriveLaunch(entry.startScriptPath, { workingDir: entry.workingDir });
			if (found.ok) {
				entry.launch = found.launch;
				log("Direct launch details recorded (\"no window\" mode is available).");
			} else {
				log(`Direct launch not recorded: ${found.reason}`);
			}
		}
		// A small marker in the server's own folder, so that deleting it later can
		// confirm the folder really is one the panel made for this server. Shared
		// installs (extra ARK maps) don't get one: the folder isn't theirs alone.
		if (!template.sharedInstall) {
			await writeMarker(installDir, entry).catch((err) => log(`Couldn't write the folder marker: ${err.message}`));
		}
		log(`Registering "${entry.name}".`);
		await addServer(entry);

		if (template.patchAfterFirstBoot) {
			setStatus(jobId, { status: "first-boot" });
			log("Booting once to let the server generate its own default config...");
			await startServer(entry);
			// Give it a reasonable window to write its config, then stop it
			// again — this is a best-effort wait, not a guarantee.
			await new Promise((r) => setTimeout(r, 20_000));
			await stopServer(entry).catch(() => {});
			await new Promise((r) => setTimeout(r, 3_000));

			const patchPath = path.win32.join(scriptRelDir, template.patchAfterFirstBoot.relPath);
			const raw = await fs.readFile(patchPath, "utf8").catch(() => null);
			if (raw !== null) {
				const patched = template.patchAfterFirstBoot.apply(raw, p);
				await fs.writeFile(patchPath, patched, "utf8");
				log(`Patched ${patchPath} with the requested name/password.`);
			} else {
				log(
					`(Expected config at ${patchPath} wasn't created on first boot — set name/password manually via the config editor.)`,
				);
			}
		}

		setStatus(jobId, {
			status: "done",
			serverName: entry.name,
			warnings: postWriteWarnings,
		});
		log(`Done. "${entry.name}" is live — no API restart needed.`);
		if (postWriteWarnings.length > 0) {
			log(`WARNING: ${postWriteWarnings.length} mod(s) could not be resolved automatically — see above.`);
		}
		logStream.end();

		// Get real status flowing immediately rather than making the
		// dashboard wait up to one full interval (7.5s) for the next
		// scheduled tick to reach the new entry.
		pollServers().catch(() => {});
		return;
	} catch (e) {
		setStatus(jobId, { status: "error", error: e.message });
		log(`ERROR: ${e.message}`);
	} finally {
		markJobDone(jobId);
		logStream.end();
	}
}

export async function createServer(templateId, rawParams) {
	const template = getTemplate(templateId);
	if (!template) throw new Error(`Unknown template: ${templateId}`);

	const suggested = await suggestParams(templateId);
	const ports = {};
	for (const portDef of template.ports) {
		ports[portDef.key] = Number(rawParams[portDef.key]) || suggested.ports[portDef.key];
	}

	await validateNewServer(template, rawParams.name, ports, suggested.sharedInstallDir);

	// Checked up front so it fails the request rather than dying partway
	// through a multi-gigabyte download.

	// Downloading a program from the internet is not something to do silently
	// as a side effect of pressing Create. The UI asks, then resends with
	// acceptSteamCmdDownload.
	const willInstall = template.updateAppId && !(template.sharedInstall && suggested.sharedInstallDir);
	if (willInstall && !isSteamCmdInstalled() && rawParams.acceptSteamCmdDownload !== true) {
		const err = new Error(
			"SteamCMD isn't installed yet. It's Valve's official tool for downloading game servers, and needs to be downloaded once.",
		);
		err.code = "steamcmd-not-installed";
		throw err;
	}

	if (template.requiresEula && rawParams.eulaAccepted !== true) {
		throw new Error("EULA acknowledgment is required.");
	}

	const slug = slugify(rawParams.slug || rawParams.name);

	// Where this server goes: a folder chosen for it, else the panel-wide
	// setting. Shared installs (extra ARK maps) reuse the existing folder and
	// ignore both, since the game is already on disk.
	const reusingShared = Boolean(template.sharedInstall && suggested.sharedInstallDir);
	const parentDir = String(rawParams.installParent ?? "").trim() || getConfig().paths.serversRoot;
	if (!reusingShared) {
		const check = inspectFolder(parentDir);
		if (!check.ok) throw new Error(check.errors[0]);
	}
	const installDir = reusingShared
		? suggested.sharedInstallDir
		: path.win32.join(parentDir, slug);
	if (!reusingShared) {
		// Free space on the drive it's actually going to, not the first one tracked.
		assertStorageHeadroom(template.estimatedInstallBytes ?? 0, installDir);
	}
	// Always derived from this specific server's own name, never the shared
	// folder's slug — used for per-instance filenames/save-dir names so a
	// second ARK map added to the same shared install doesn't collide with
	// the first (see the "Writing start script" bug this caught).
	const instanceSlug = slugify(rawParams.name);

	const params = {
		...rawParams,
		...ports,
		slug,
		instanceSlug,
		installDir,
		rconPassword: rawParams.rconPassword || suggested.rconPassword,
		sharedInstallDir: template.sharedInstall ? suggested.sharedInstallDir : null,
	};

	// Lets a template re-derive params server-side from something it doesn't
	// trust the client to have echoed back correctly (e.g. the Minecraft
	// modpack template re-reading modloader family/version from the actual
	// saved manifest.json rather than whatever the client's form state said).
	if (template.resolveParams) {
		Object.assign(params, await template.resolveParams(rawParams));
	}

	const jobId = `${slug}-${Date.now()}`;
	jobs.set(jobId, { status: "queued", template: templateId, name: rawParams.name });
	await saveJobState(jobId, jobs.get(jobId));

	// Fire and forget — the caller polls getJob(jobId) for progress.
	runJob(jobId, template, params).catch((e) => {
		setStatus(jobId, { status: "error", error: e.message });
	});

	return jobId;
}

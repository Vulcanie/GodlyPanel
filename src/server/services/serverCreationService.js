import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { SERVERS_TO_QUERY } from "../data/serverList.js";
import { GAME_TEMPLATES, getTemplate } from "../data/gameTemplates.js";
import { startServer, stopServer } from "./serverControl.js";
import { pollServers, registerNewServer } from "./pollingService.js";
import { paths } from "../paths.js";
import { resolveResource } from "../../shared/resources.js";
import {
	trackSteamCmd,
	untrackSteamCmd,
	markJobActive,
	markJobDone,
} from "./processRegistry.js";

const SERVERS_ROOT = paths.serversRoot;
// Becomes a real configurable setting (with an auto-download offer) in Stage 2.
const SHARED_STEAMCMD =
	process.env.GHP_STEAMCMD_PATH || path.win32.join(paths.dataDir, "tools", "steamcmd", "steamcmd.exe");
const SERVERS_JS_PATH = paths.serversFile;

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

async function usedPorts(extraScanDir) {
	const used = new Set();
	for (const s of SERVERS_TO_QUERY) {
		for (const key of ["port", "queryPort", "rconPort"]) {
			if (s[key]) used.add(s[key]);
		}
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

// Bumps a port up by 10s until it's not already claimed by another server.
async function nextFreePort(preferred, extraScanDir) {
	const used = await usedPorts(extraScanDir);
	let port = preferred;
	while (used.has(port)) port += 10;
	return port;
}

export async function suggestParams(templateId) {
	const template = getTemplate(templateId);
	if (!template) throw new Error(`Unknown template: ${templateId}`);

	let sharedInstallDir = null;
	if (template.sharedInstall) {
		const sibling = SERVERS_TO_QUERY.find(
			(s) => s.type === template.type && s.updateAppId === template.updateAppId,
		);
		sharedInstallDir = sibling?.installDir?.replace(/\\$/, "") ?? null;
	}

	const ports = {};
	for (const p of template.ports) {
		ports[p.key] = await nextFreePort(p.default, sharedInstallDir);
	}

	return { ports, sharedInstallDir, rconPassword: "adminpass" };
}

async function validateNewServer(name, ports, sharedInstallDir) {
	if (!name || !name.trim()) throw new Error("A server name is required.");
	if (SERVERS_TO_QUERY.some((s) => s.name === name)) {
		throw new Error(`A server named "${name}" already exists.`);
	}
	const used = await usedPorts(sharedInstallDir);
	for (const [key, value] of Object.entries(ports)) {
		if (used.has(value)) {
			throw new Error(`Port ${value} (${key}) is already used by another server.`);
		}
	}
}

// Turns a plain JS value into the literal source text servers.js already
// uses (tab-indented, double-backslash-escaped strings) so the generated
// entry reads identically to the hand-written ones around it.
function serializeValue(value, indent) {
	if (typeof value === "string") {
		return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (value && typeof value === "object") {
		const inner = Object.entries(value)
			.map(([k, v]) => `${indent}\t"${k}": ${serializeValue(v, indent + "\t")},`)
			.join("\n");
		return `{\n${inner}\n${indent}}`;
	}
	return "null";
}

function serializeEntry(entry) {
	const lines = Object.entries(entry).map(
		([key, value]) => `\t\t${key}: ${serializeValue(value, "\t\t")},`,
	);
	return `\t{\n${lines.join("\n")}\n\t},\n`;
}

async function appendServerEntry(entry) {
	const text = await fs.readFile(SERVERS_JS_PATH, "utf8");
	const closingIdx = text.lastIndexOf("];");
	if (closingIdx === -1) {
		throw new Error("Could not find the end of SERVERS_TO_QUERY in servers.js.");
	}
	const entryText = serializeEntry(entry);
	const newText = text.slice(0, closingIdx) + entryText + text.slice(closingIdx);
	await fs.writeFile(SERVERS_JS_PATH, newText, "utf8");
}

function runSteamCmd(installDir, appId, logStream) {
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
		const child = spawn(SHARED_STEAMCMD, args, {
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
			const code = await runSteamCmd(installDir, template.updateAppId, logStream);
			log(`SteamCMD exited with code ${code}.`);

			// Verify something actually landed, since SteamCMD's exit code
			// alone isn't trustworthy (see runSteamCmd above).
			const entries = await fs.readdir(installDir).catch(() => []);
			if (entries.length === 0) {
				throw new Error(
					"SteamCMD did not install any files — check the log for the real error.",
				);
			}
		}

		setStatus(jobId, { status: "configuring" });
		const p = {
			...params,
			installDir,
			steamCmdRoot: SERVERS_ROOT,
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
		log(`Adding "${entry.name}" to servers.js`);
		await appendServerEntry(entry);
		// Mutating in place (not reassigning) — every module that imported
		// SERVERS_TO_QUERY holds this same array object, so they all see the
		// new entry immediately without needing to re-import the file.
		SERVERS_TO_QUERY.push(entry);
		registerNewServer(entry);

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

	await validateNewServer(rawParams.name, ports, suggested.sharedInstallDir);

	if (template.requiresEula && rawParams.eulaAccepted !== true) {
		throw new Error("EULA acknowledgment is required.");
	}

	const slug = slugify(rawParams.slug || rawParams.name);
	const installDir =
		template.sharedInstall && suggested.sharedInstallDir
			? suggested.sharedInstallDir
			: `${SERVERS_ROOT}\\${slug}`;
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

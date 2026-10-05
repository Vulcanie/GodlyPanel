import path from "node:path";
// Not `node:fs`: see util/rawFs.js. An update is full of files called app.asar.
import { rawFs as fs, rawFsp as fsp } from "../util/rawFs.js";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic } from "../util/atomicJson.js";
import { listZip, extractZip, unsafeEntries } from "../util/tarZip.js";
import { downloadVerified } from "../util/downloadVerified.js";
import { currentVersion, latestRelease, trustedUrl, updateStatus } from "./panelUpdate.js";
import { allOperations } from "./serverOps.js";
import { hasActiveJobs } from "./processRegistry.js";
import { logActivity } from "./activityLog.js";
import { broadcastSseEvent } from "./sseHub.js";
import crypto from "node:crypto";

// "Update now": download the new version, check it, and have the desktop app swap it in and restart itself.
//
// Most releases only change the app's own files (the `resources` folder, a few MB). Those are fetched on their own, and
// the Electron program that runs them (~250 MB) stays as it is. When a release moves to a different Electron, the whole
// package is fetched instead and everything but `data` is replaced. Either way:
//
//   - it is only fetched from GitHub, by the names the release's own manifest gives, and has to match the SHA-256 the
//     release publishes (a release with no checksum is never installed by itself)
//   - once unpacked, every file is checked again against the manifest inside the archive
//   - nothing is replaced while a backup, restore, install or update is running
//   - the replacing is done by apply-update.ps1 after the app has closed, which starts the new version, waits for it to
//     say it is up (markHealthy), and puts the old one back if it doesn't
//
// Game servers are separate programs and keep running throughout.

const UPDATES_DIR = path.join(paths.dataDir, "updates");
const RESULT_FILE = path.join(paths.dataDir, "state", "update-result.json");
const HEALTH_FILE = path.join(paths.dataDir, "state", "update-health.json");
const STATE_FILE = path.join(paths.dataDir, "state", "self-update.json");
const IN_PROGRESS = ["downloading", "verifying", "restarting"];
const HANDOVER_TIMEOUT_MS = 60_000;

// What a test sets to stand in for the real Electron; nothing in the app's own settings can.
const runningElectron = () => process.env.GHP_ELECTRON_VERSION || process.versions.electron || null;

const refuse = (message, status = 400) => Object.assign(new Error(message), { status });

// ---- can this copy replace itself? ------------------------------------------

let writableChecked = { at: 0, ok: true };

/** The installed app this is running inside, or why this copy can't update itself. */
export function selfUpdateSupport() {
	const appDir = process.env.GHP_APP_DIR;
	const exePath = process.env.GHP_APP_EXE;
	if (process.env.GHP_SELF_UPDATE !== "1" || !appDir || !exePath) {
		return { ok: false, reason: "This copy of GodlyPanel isn't the installed app (it is running from source), so it can't replace itself. Download the package and unzip it instead." };
	}
	if (typeof process.send !== "function") {
		return { ok: false, reason: "The panel can't reach the desktop app that would restart it, so it can't update itself. Download the package and unzip it instead." };
	}
	if (Date.now() - writableChecked.at > 60_000) {
		const probe = path.join(appDir, ".update-write-test");
		try {
			fs.writeFileSync(probe, "x");
			fs.rmSync(probe, { force: true });
			writableChecked = { at: Date.now(), ok: true };
		} catch {
			writableChecked = { at: Date.now(), ok: false };
		}
	}
	if (!writableChecked.ok) {
		return { ok: false, reason: `This Windows account can't change the files in ${appDir}, so the panel can't update itself there. Run it from a folder you own, or download the package and unzip it instead.` };
	}
	return { ok: true, appDir, exePath };
}

// ---- which download? --------------------------------------------------------

/**
 * The download that updates this install: the small app-only one when the release was built on the Electron that is
 * running here, otherwise the whole package. A release without a manifest (anything before this feature) can only be
 * the whole package, and only when its notes give a checksum. Null when there is nothing the panel may install.
 * @returns {{ kind: "app"|"full", name: string, size: number, sha256: string, url: string, checksumSource: string } | null}
 */
export function choosePayload(latest, electron = runningElectron()) {
	if (!latest) return null;
	const m = latest.manifest;
	if (m?.app && electron && m.electron === electron) return { kind: "app", ...m.app, checksumSource: "release's update manifest" };
	if (m?.full) return { kind: "full", ...m.full, checksumSource: "release's update manifest" };
	if (latest.asset?.sha256) return { kind: "full", name: latest.asset.name, size: latest.asset.size, sha256: latest.asset.sha256, url: latest.asset.url, checksumSource: "release notes" };
	return null;
}

// ---- state ------------------------------------------------------------------

let install = { phase: "idle" };
let remembered = { lastUpdate: null };

export const installState = () => ({ ...install });

function setInstall(patch) {
	install = { ...install, ...patch };
	broadcastSseEvent({ type: "panel_update_progress", install: { phase: install.phase } }, (c) => c.role === "admin");
}

/** What the update card needs to know beyond the version check. */
export async function selfUpdateInfo() {
	// The update script writes its verdict once the new version has said it is up, which is after that version started,
	// so it can't be left to the start-up read alone.
	await pickUpResult();
	const support = selfUpdateSupport();
	const payload = choosePayload(latestRelease());
	return {
		support: support.ok ? { ok: true } : { ok: false, reason: support.reason },
		plan: payload ? { kind: payload.kind, name: payload.name, size: payload.size } : null,
		install: installState(),
		lastUpdate: remembered.lastUpdate,
	};
}

export async function dismissLastUpdate() {
	remembered = { ...remembered, lastUpdate: null };
	await writeJsonAtomic(STATE_FILE, remembered).catch(() => {});
}

// ---- what must not be interrupted -------------------------------------------

function busyWith() {
	const ops = Object.entries(allOperations()).map(([name, { op }]) => `${name} (${op})`);
	const jobs = hasActiveJobs().map((j) => j.label ?? j.id);
	return [...ops, ...jobs];
}

const busyMessage = (list) => `Wait until ${list.join(", ")} ${list.length === 1 ? "has" : "have"} finished, then update. Restarting now would cut ${list.length === 1 ? "it" : "them"} off.`;

// ---- unpacking and checking -------------------------------------------------

async function walk(dir, visit, base = dir) {
	for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		await visit(full, entry, path.relative(base, full).replaceAll("\\", "/"));
		if (entry.isDirectory()) await walk(full, visit, base);
	}
}

async function rejectLinks(dir) {
	await walk(dir, (full, entry) => {
		if (entry.isSymbolicLink()) throw new Error("The update contains a link, which an update never should, so it was not used.");
	});
}

const sha256File = async (file) => crypto.createHash("sha256").update(await fsp.readFile(file)).digest("hex");

/** Unpack a downloaded archive into `stageDir` and check what came out. Throws, with the folder removed, if anything is off. */
export async function unpackAndCheck(zip, stageDir, kind, version) {
	try {
		const names = await listZip(zip);
		if (names.length === 0) throw new Error("The download is empty.");
		const unsafe = unsafeEntries(names);
		if (unsafe.length > 0) throw new Error(`The download holds paths outside its own folder (${unsafe[0]}), so it was not used.`);
		const tops = new Set(names.map((n) => n.replaceAll("\\", "/").split("/")[0]));
		if (kind === "app") {
			const stray = [...tops].find((t) => t !== "resources" && t !== "update-manifest.json");
			if (stray) throw new Error(`The app update holds "${stray}", which isn't part of the app's own files, so it was not used.`);
		}
		await fsp.rm(stageDir, { recursive: true, force: true });
		await fsp.mkdir(stageDir, { recursive: true });
		await extractZip(zip, stageDir);
		await rejectLinks(stageDir);

		if (kind === "app") {
			let manifest;
			try {
				manifest = JSON.parse(await fsp.readFile(path.join(stageDir, "update-manifest.json"), "utf8"));
			} catch {
				throw new Error("The app update has no readable list of its files, so it was not used.");
			}
			if (manifest?.format !== 1 || manifest.version !== version) throw new Error("The app update is for a different version than the release says, so it was not used.");
			if (manifest.electron !== runningElectron()) throw new Error("The app update was built for a different Electron than the one running here, so it was not used.");
			const listed = new Map((manifest.files ?? []).map((f) => [f.path, f]));
			if (listed.size === 0) throw new Error("The app update lists no files, so it was not used.");
			const found = new Set();
			const pending = [];
			await walk(stageDir, (full, entry, rel) => {
				if (!entry.isFile() || rel === "update-manifest.json") return;
				const want = listed.get(rel);
				if (!want) throw new Error(`The app update holds ${rel}, which its own list doesn't mention, so it was not used.`);
				found.add(rel);
				pending.push((async () => {
					const stat = await fsp.stat(full);
					if (stat.size !== want.size || (await sha256File(full)) !== want.sha256) throw new Error(`${rel} in the app update isn't what its list says, so it was not used.`);
				})());
			});
			await Promise.all(pending);
			const missing = [...listed.keys()].find((p) => !found.has(p));
			if (missing) throw new Error(`${missing} is missing from the app update, so it was not used.`);
			if (!found.has("resources/app.asar")) throw new Error("The app update has no app.asar, so it was not used.");
		} else {
			for (const required of ["GodlyPanel.exe", path.join("resources", "app.asar")]) {
				if (!fs.existsSync(path.join(stageDir, required))) throw new Error(`The package has no ${required}, so it was not used.`);
			}
		}
	} catch (err) {
		await fsp.rm(stageDir, { recursive: true, force: true }).catch(() => {});
		throw err;
	}
}

// ---- installing -------------------------------------------------------------

let handoverTimer = null;

function fail(message) {
	clearTimeout(handoverTimer);
	setInstall({ phase: "failed", error: message });
	logActivity({ type: "panel.update_failed", level: "error", message: `Updating GodlyPanel to ${install.version ?? "the new version"} didn't go ahead: ${message}` });
}

/**
 * Download, check and hand over an update. Answers at once; the work carries on, and ends with this process being
 * closed and the app restarting (or with `install.phase` "failed" and a reason).
 * @param {{ fromOutside?: boolean }} options  fromOutside: the request came through the public address
 */
export function startInstall({ fromOutside = false } = {}) {
	if (fromOutside) throw refuse("Updating GodlyPanel has to be done from this PC or your home network, not through the public address.", 403);
	const support = selfUpdateSupport();
	if (!support.ok) throw refuse(support.reason);
	if (IN_PROGRESS.includes(install.phase)) throw refuse("An update is already under way.", 409);
	const status = updateStatus();
	if (!status.available) throw refuse("There is no newer version to install. Check for updates first.");
	const latest = latestRelease();
	const payload = choosePayload(latest);
	if (!payload) throw refuse("This release gives no checksum the panel can verify, so it won't install it by itself. Download the package and unzip it instead.");
	if (!payload.url || !trustedUrl(payload.url)) throw refuse("That download isn't from a place the panel trusts, so it was not fetched.");
	const busy = busyWith();
	if (busy.length > 0) throw refuse(busyMessage(busy), 409);

	install = { phase: "downloading", kind: payload.kind, version: latest.version, name: payload.name, received: 0, total: payload.size, error: null };
	setInstall({});

	(async () => {
		const zip = path.join(UPDATES_DIR, payload.name);
		const stageDir = path.join(UPDATES_DIR, `stage-${latest.version}`);
		try {
			await downloadVerified({
				url: payload.url,
				dest: zip,
				sha256: payload.sha256,
				size: payload.size,
				isTrusted: trustedUrl,
				checksumSource: payload.checksumSource,
				onProgress: (received) => {
					install.received = received;
				},
			});
			setInstall({ phase: "verifying" });
			await unpackAndCheck(zip, stageDir, payload.kind, latest.version);

			// Something may have started while it downloaded.
			const nowBusy = busyWith();
			if (nowBusy.length > 0) throw new Error(`${busyMessage(nowBusy)} (The update was downloaded and checked; press Update again when they are done.)`);

			setInstall({ phase: "restarting" });
			logActivity({ type: "panel.updating", message: `Updating GodlyPanel from ${currentVersion()} to ${latest.version} (${payload.kind === "app" ? "app files only" : "whole package"}). The panel restarts; game servers keep running.` });
			handoverTimer = setTimeout(() => fail("The desktop app didn't take over, so nothing was changed."), HANDOVER_TIMEOUT_MS);
			process.send({ type: "apply-update", mode: payload.kind, stageDir, version: latest.version, files: [zip] });
		} catch (err) {
			await fsp.rm(stageDir, { recursive: true, force: true }).catch(() => {});
			fail(err.message);
		}
	})();
	return installState();
}

/** The desktop app's answer when it won't do it (it checks the staged files itself, and for work in progress). */
export function initSelfUpdate() {
	process.on("message", (msg) => {
		if (msg?.type === "update-refused" && install.phase === "restarting") fail(String(msg.reason ?? "The desktop app refused."));
	});
	return readOutcome();
}

// ---- after a restart --------------------------------------------------------

/** Take in the update script's verdict, if it has left one: remember it, log it, and delete the file. */
async function pickUpResult() {
	const result = await readJson(RESULT_FILE, null);
	if (result && typeof result === "object") {
		remembered.lastUpdate = { ok: result.ok === true, version: String(result.version ?? ""), from: String(result.from ?? ""), message: String(result.message ?? ""), rolledBack: result.rolledBack === true, at: result.at ?? new Date().toISOString() };
		await writeJsonAtomic(STATE_FILE, remembered).catch(() => {});
		await fsp.rm(RESULT_FILE, { force: true }).catch(() => {});
		if (result.ok === true) logActivity({ type: "panel.updated", message: remembered.lastUpdate.message });
		else logActivity({ type: "panel.update_failed", level: "error", message: remembered.lastUpdate.message });
	}
}

async function readOutcome() {
	remembered = { lastUpdate: null, ...((await readJson(STATE_FILE, {})) ?? {}) };
	await pickUpResult();
	// Whatever a previous run left half-done.
	for (const name of await fsp.readdir(UPDATES_DIR).catch(() => [])) {
		if (name.startsWith("stage-") || name.endsWith(".partial")) await fsp.rm(path.join(UPDATES_DIR, name), { recursive: true, force: true }).catch(() => {});
	}
}

/** Say this version is up and serving, which is what the updater waits for before it lets go of the old files. */
export async function markHealthy() {
	const tmp = `${HEALTH_FILE}.tmp`;
	await fsp.mkdir(path.dirname(HEALTH_FILE), { recursive: true });
	await fsp.writeFile(tmp, JSON.stringify({ version: currentVersion(), pid: process.pid, at: new Date().toISOString() }));
	await fsp.rename(tmp, HEALTH_FILE);
}

export const updatesFolder = UPDATES_DIR;

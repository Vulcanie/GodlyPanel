import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { paths } from "../paths.js";
import { all as allServers, remove as removeFromStore } from "../data/serverStore.js";
import { forgetPid } from "./windowlessLauncher.js";
import { serverLogPath } from "./windowlessLauncher.js";
import { forgetAutoUpdateSetting } from "./autoUpdateSettings.js";
import { broadcastSseEvent } from "./sseHub.js";

// Removing a server has two parts of very different weight. Taking it out of the
// panel is trivially reversible (register it again). Deleting its files is not:
// a world save can't be un-deleted. So file deletion is only ever offered where
// it is unambiguous that the panel owns those files, and refused everywhere
// else, with the reason.

export const MARKER_FILE = ".godlypanel-server.json";

const norm = (p) => path.resolve(String(p)).replace(/[\\/]+$/, "").toLowerCase();
const inside = (child, parent) => child === parent || child.startsWith(parent + path.sep);

/** Nothing at or under these is ever deleted: they are the system's, not a server's. */
function systemPlaces(env = process.env) {
	return [env.SystemRoot, env.windir, env.ProgramFiles, env["ProgramFiles(x86)"], env.ProgramData].filter(Boolean).map(norm);
}

/**
 * These, and any folder that would contain them, are never deleted. A server's
 * folder can sit *inside* most of them (a servers folder on the Desktop is fine);
 * it just can't be them, or a parent that takes them along.
 */
function protectedPlaces(env = process.env) {
	const home = env.USERPROFILE || os.homedir();
	return [
		home,
		...["Desktop", "Documents", "Downloads", "AppData", "Pictures", "Videos", "Music"].map((d) => path.join(home, d)),
		os.tmpdir(),
		// The panel itself: its data, and the folder it runs from.
		paths.dataDir,
		path.dirname(paths.dataDir),
	]
		.filter(Boolean)
		.map(norm);
}

/**
 * What deleting this server's files would do, decided without touching the disk.
 *
 * @returns {{ canDeleteFiles: boolean, mode: "folder"|"script"|"none", target: string|null, script: string|null, reason: string|null }}
 */
export function planRemoval(server, servers = allServers(), env = process.env) {
	const refuse = (reason) => ({ canDeleteFiles: false, mode: "none", target: null, script: null, reason });

	if (server.source !== "created") {
		return refuse(
			"This server was imported, so GodlyPanel won't delete files it didn't create. Remove it from the panel, then delete its folder yourself if you want it gone.",
		);
	}
	if (!server.installDir) return refuse("This server has no install folder recorded.");

	const dir = norm(server.installDir);
	const parsed = path.parse(dir);
	if (dir === parsed.root.replace(/[\\/]+$/, "").toLowerCase() || path.dirname(dir) === dir) {
		return refuse("Its install folder is the top of a drive, which is never deleted.");
	}
	if (systemPlaces(env).some((place) => inside(dir, place) || inside(place, dir))) {
		return refuse("Its install folder is in a Windows system location, so nothing is deleted.");
	}
	for (const place of protectedPlaces(env)) {
		// The place itself, something inside it that the panel doesn't own, or a
		// parent that would take a protected place with it.
		if (dir === place || inside(place, dir)) {
			return refuse(`Its install folder (${server.installDir}) is, or contains, a protected location, so nothing is deleted.`);
		}
	}

	// A script outside the install folder means the entry doesn't look like one the
	// panel laid out; don't guess.
	const script = server.startScriptPath ? path.resolve(server.startScriptPath) : null;
	if (script && !inside(norm(script), dir)) {
		return refuse("Its start script isn't inside its install folder, so it doesn't look like a folder the panel laid out.");
	}

	// Other servers using the same folder (or one nested in it, or containing it).
	const others = servers.filter((s) => s.name !== server.name && s.installDir);
	const shared = others.some((s) => {
		const other = norm(s.installDir);
		return inside(other, dir) || inside(dir, other);
	});
	if (shared) {
		if (!script) return refuse("Its install is shared with other servers and it has no start script of its own to remove.");
		return { canDeleteFiles: true, mode: "script", target: null, script, reason: "Its install is shared with other servers, so only this server's own start script is removed; the game install stays." };
	}

	return { canDeleteFiles: true, mode: "folder", target: path.resolve(server.installDir), script, reason: null };
}

async function readMarker(dir) {
	try {
		return JSON.parse(await fs.readFile(path.join(dir, MARKER_FILE), "utf8"));
	} catch {
		return null;
	}
}

/** Written into a new server's own folder, so deletion can tell it's really the panel's. */
export async function writeMarker(dir, server) {
	await fs.writeFile(
		path.join(dir, MARKER_FILE),
		JSON.stringify({ name: server.name, createdAt: new Date().toISOString(), note: "Created by GodlyPanel. Safe to leave; the panel checks it before deleting this folder." }, null, 2),
	);
}

async function removeStateFor(server) {
	await forgetPid(server.name).catch(() => {});
	await forgetAutoUpdateSetting(server.name).catch(() => {});
	for (const file of [serverLogPath(server), `${serverLogPath(server)}.1`]) {
		await fs.rm(file, { force: true }).catch(() => {});
	}
}

/**
 * Take a server out of the panel, and optionally delete its files. Refuses to
 * delete anything the plan doesn't allow. Files go first: if they can't all be
 * deleted (something is holding them open) the server stays registered, so the
 * owner can stop whatever it is and try again.
 */
export async function removeServerCompletely(server, { deleteFiles = false } = {}) {
	const plan = planRemoval(server);
	const result = { removedFromPanel: false, filesDeleted: false, deleted: null, note: null };

	if (deleteFiles) {
		if (!plan.canDeleteFiles) {
			const err = new Error(plan.reason);
			err.code = "files_protected";
			throw err;
		}

		if (plan.mode === "folder") {
			// If the folder carries a marker, it has to be this server's.
			const marker = await readMarker(plan.target);
			if (marker && marker.name && marker.name !== server.name) {
				const err = new Error(`That folder belongs to a server named "${marker.name}", so nothing was deleted.`);
				err.code = "files_protected";
				throw err;
			}
			await fs.rm(plan.target, { recursive: true, force: true, maxRetries: 6, retryDelay: 400 });
			const remains = await fs.stat(plan.target).then(() => true, () => false);
			if (remains) {
				const err = new Error("Some files couldn't be deleted, usually because a program still has them open. The server was left in the panel; close whatever is using them and try again.");
				err.code = "files_in_use";
				throw err;
			}
			result.deleted = plan.target;
		} else if (plan.mode === "script" && plan.script) {
			await fs.rm(plan.script, { force: true });
			await fs.rm(`${plan.script}.bak`, { force: true });
			result.deleted = plan.script;
		}
		result.filesDeleted = true;
		result.note = plan.reason;
	}

	await removeFromStore(server.name);
	await removeStateFor(server);
	broadcastSseEvent({ type: "server_removed", serverName: server.name });
	result.removedFromPanel = true;
	return result;
}

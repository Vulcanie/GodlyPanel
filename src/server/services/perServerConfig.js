import { promises as fs } from "node:fs";
import path from "node:path";
import { asaConfigSync } from "../data/configSync.js";
import { update as updateServer, all as allServers } from "../data/serverStore.js";

// Servers that share one install (the ARK: Survival Ascended maps) also share the one folder the game reads its settings
// from, so whichever server booted last decided what every server's settings page showed. Here each server keeps its own copy
// of those files in a folder of its own, and the copy is put where the game looks for it just before that server starts.
//
// A server opts in with `configSync: { dir, live }`: `dir` is its own folder, `live` maps each file name to the shared path the
// game reads. Its `configPaths` point into `dir`, so the settings page and the config editor use the server's own files.

const ASA_APP_ID = "2430930";

// How long the next start waits after a server was launched, so the game has read its settings before they are replaced.
let settleMs = 15_000;
export function __setSettleMsForTests(ms) {
	settleMs = ms;
}

const exists = (file) => fs.access(file).then(() => true, () => false);

async function copyFile(from, to) {
	await fs.mkdir(path.dirname(to), { recursive: true });
	await fs.copyFile(from, to);
}

/**
 * Takes in any file the game made in the shared folder that this server doesn't have its own copy of yet (a server that has never
 * run, or whose game wrote its defaults after the last start). Never replaces a copy the server already has.
 */
export async function adoptMissingConfig(server) {
	const sync = server?.configSync;
	if (!sync) return;
	for (const [name, live] of Object.entries(sync.live)) {
		const own = path.join(sync.dir, name);
		if (!(await exists(own)) && (await exists(live))) await copyFile(live, own).catch(() => {});
	}
}

// One chain per shared folder, so two servers starting together don't put their settings in each other's way.
const chains = new Map();

/**
 * Puts the server's own settings where the game reads them. Resolves to a function to call once the server has been launched; the
 * shared folder stays held for a short while after that so the next server's settings don't replace these before the game read them.
 * A server with no copy of its own yet starts with whatever is in the shared folder, and that is kept as its copy.
 */
export async function applyServerConfig(server) {
	const sync = server?.configSync;
	if (!sync) return () => {};
	const key = path.dirname(Object.values(sync.live)[0] ?? sync.dir).toLowerCase();
	const before = chains.get(key) ?? Promise.resolve();
	let open;
	const held = new Promise((resolve) => {
		open = resolve;
	});
	chains.set(key, before.then(() => held));
	await before;
	let released = false;
	const release = () => {
		if (released) return;
		released = true;
		if (settleMs <= 0) return open();
		setTimeout(open, settleMs).unref?.();
	};
	try {
		await adoptMissingConfig(server);
		for (const [name, live] of Object.entries(sync.live)) {
			const own = path.join(sync.dir, name);
			if (await exists(own)) await copyFile(own, live);
		}
	} catch (err) {
		release();
		throw err;
	}
	return release;
}

/**
 * Gives every ASA server saved before this change its own settings folder: its copy starts as what the shared folder holds now,
 * and its config paths point at that copy. Safe to run on every start of the panel; a server that has been moved over is skipped.
 */
export async function migrateSharedConfigs() {
	for (const server of allServers()) {
		if (server.configSync || server.updateAppId !== ASA_APP_ID || !server.installDir) continue;
		const slug = slugOf(server);
		if (!slug) continue;
		const wanted = asaConfigSync(server.installDir, slug);
		const live = wanted.configSync.live;
		const old = server.configPaths ?? {};
		// Only a server whose settings really are the shared files; one pointed somewhere else by hand is left as it is.
		const shared = Object.keys(old).length > 0 && Object.entries(old).every(([name, file]) => live[name] && String(file).toLowerCase() === live[name].toLowerCase());
		if (!shared) continue;
		try {
			const fresh = { ...server, ...wanted };
			await adoptMissingConfig(fresh);
			await updateServer(server.name, wanted);
			console.log(`[config] "${server.name}" now keeps its own settings in ${wanted.configSync.dir}`);
		} catch (err) {
			console.warn(`[config] couldn't give "${server.name}" its own settings: ${err.message}`);
		}
	}
}

// The name of the start script ("Start_Ragnarok.bat") is the map's slug; it is what the panel made the folder name from.
function slugOf(server) {
	const file = path.win32.basename(String(server.startScriptPath ?? ""));
	const match = /^Start_(.+)\.bat$/i.exec(file);
	const slug = (match ? match[1] : server.name).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
	return slug || null;
}

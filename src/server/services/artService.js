import path from "node:path";
import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import { paths } from "../paths.js";
import { all as allServers } from "../data/serverStore.js";
import { GAME_TEMPLATES } from "../data/gameTemplates.js";
import { get as getAppearance, safeTypeKey } from "../data/appearanceStore.js";

// Game artwork, resolved rather than tabulated.
//
// This used to be a hardcoded map of server type -> Steam appid inside the art
// route, which meant any game the panel hadn't been taught about got a plain
// gradient even though the information needed was sitting right there in the
// server's own install. Now the appid is worked out from the server entry, in
// this order:
//
//   1. an appid the user typed in themselves (Settings -> Appearance)
//   2. steam_appid.txt inside the install — SteamCMD server builds drop this
//      next to the executable, and it holds the CLIENT appid, which is the one
//      that actually has store artwork. On the 21-server setup this alone
//      resolves ARK, Valheim, Enshrouded, Palworld, 7 Days and Subsistence
//      with no configuration at all, including for imported servers the panel
//      has no template for.
//   3. the template's storeAppId, for the games whose server build doesn't
//      ship that file (Conan, Dragonwilds, Windrose, ARK: SE).
//   4. the server's own updateAppId — the dedicated-server tool. Usually has
//      no artwork (only 2 of the 10 checked did), but it costs one request and
//      it's the only candidate available for a game nobody has taught us.
//
// Anything not on Steam falls through to a colour or an uploaded image, and
// failing that a gradient, so a Minecraft card still looks deliberate.

const ASSETS = ["library_hero.jpg", "header.jpg"];
const cdnUrl = (appId, asset) =>
	`https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/${asset}`;

// Walking an install to find steam_appid.txt is bounded hard: this runs only
// on a cache miss, but an ARK install is a quarter of a million files and the
// event loop is shared with polling and live updates.
const MAX_DEPTH = 6;
const MAX_DIRS = 300;
// Directories that are large, deep, and never hold steam_appid.txt.
const SKIP_DIRS = new Set([
	"content",
	"saved",
	"savegames",
	"logs",
	"mods",
	"world",
	"worlds",
	"backup",
	"backups",
	"cache",
	"appcache",
	"depotcache",
	"shadercache",
	"userdata",
	"package",
	"crashes",
	"libraries",
	"node_modules",
	"paks",
	"downloading",
	"temp",
]);

const inFlight = new Map();
// Types with nothing to show. Without this, a dashboard on a machine with no
// internet would re-walk every install and re-attempt every fetch on every
// page load.
const misses = new Map();
const MISS_TTL_MS = 10 * 60 * 1000;

function templateAppIds(type) {
	const key = String(type ?? "").toLowerCase();
	const ids = [];
	for (const template of GAME_TEMPLATES) {
		if (String(template.type ?? "").toLowerCase() !== key) continue;
		if (template.storeAppId) ids.push(String(template.storeAppId));
		if (template.updateAppId) ids.push(String(template.updateAppId));
	}
	return ids;
}

/** Breadth-first so a shallow Binaries/Win64 is found before a deep asset tree. */
async function findSteamAppIdFile(root) {
	let queue = [root];
	let visited = 0;

	for (let depth = 0; depth <= MAX_DEPTH && queue.length > 0; depth += 1) {
		const next = [];
		for (const dir of queue) {
			if (visited >= MAX_DIRS) return null;
			visited += 1;

			let entries;
			try {
				entries = await fs.readdir(dir, { withFileTypes: true });
			} catch {
				continue; // Unreadable or gone; not worth reporting.
			}

			for (const entry of entries) {
				if (entry.isFile() && entry.name.toLowerCase() === "steam_appid.txt") {
					try {
						const raw = await fs.readFile(path.join(dir, entry.name), "utf8");
						const match = raw.match(/\d{3,10}/);
						if (match) return match[0];
					} catch {
						// Keep looking; another copy may be readable.
					}
				}
			}
			for (const entry of entries) {
				if (!entry.isDirectory()) continue;
				if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
				next.push(path.join(dir, entry.name));
			}
		}
		queue = next;
	}
	return null;
}

async function discoveredAppIds(servers) {
	const roots = [];
	for (const server of servers) {
		for (const dir of [server.workingDir, server.installDir]) {
			if (typeof dir !== "string" || dir.trim() === "") continue;
			const normalised = path.resolve(dir);
			if (!roots.includes(normalised) && existsSync(normalised)) roots.push(normalised);
		}
	}

	const found = [];
	for (const root of roots) {
		const appId = await findSteamAppIdFile(root);
		if (appId && !found.includes(appId)) found.push(appId);
	}
	return found;
}

/** Every appid worth trying for a type, best candidate first, deduplicated. */
export async function resolveAppIds(type) {
	const key = safeTypeKey(type);
	if (!key) return [];

	const candidates = [];
	const push = (id) => {
		const value = id == null ? "" : String(id).trim();
		if (/^\d{1,10}$/.test(value) && !candidates.includes(value)) candidates.push(value);
	};

	push(getAppearance(key)?.appId);

	const servers = allServers().filter((s) => String(s.type ?? "").toLowerCase() === key);
	for (const id of await discoveredAppIds(servers)) push(id);
	for (const id of templateAppIds(key)) push(id);
	for (const server of servers) push(server.updateAppId);

	return candidates;
}

async function fetchFirstAvailable(appIds) {
	for (const appId of appIds) {
		for (const asset of ASSETS) {
			try {
				const res = await fetch(cdnUrl(appId, asset), { signal: AbortSignal.timeout(15000) });
				if (!res.ok) continue;
				const buf = Buffer.from(await res.arrayBuffer());
				// Guard against caching an error page as if it were artwork.
				if (buf.length < 1024 || buf[0] !== 0xff || buf[1] !== 0xd8) continue;
				return { buf, appId, asset };
			} catch {
				// Offline, DNS failure, timeout — try the next candidate.
			}
		}
	}
	return null;
}

function cachePath(type) {
	return path.join(paths.artCacheDir, `${type}.jpg`);
}

/**
 * The cached Steam artwork for a type, fetching it once if needed.
 * @returns {Promise<string|null>} a file path, or null if there is none to be had.
 */
export async function ensureSteamArt(type) {
	const key = safeTypeKey(type);
	if (!key) return null;

	const file = cachePath(key);
	if (existsSync(file)) return file;

	const missedAt = misses.get(key);
	if (missedAt && Date.now() - missedAt < MISS_TTL_MS) return null;

	// The dashboard asks for every card's artwork at once on first load, so
	// concurrent requests for the same type share one walk and one download.
	if (!inFlight.has(key)) {
		const work = (async () => {
			const appIds = await resolveAppIds(key);
			if (appIds.length === 0) return null;

			const hit = await fetchFirstAvailable(appIds);
			if (!hit) return null;

			await fs.mkdir(paths.artCacheDir, { recursive: true });
			await fs.writeFile(file, hit.buf);
			console.log(`[art] Cached ${hit.asset} for "${key}" from Steam app ${hit.appId}.`);
			return file;
		})()
			.catch((err) => {
				console.warn(`[art] Could not resolve artwork for "${key}": ${err.message}`);
				return null;
			})
			.finally(() => inFlight.delete(key));
		inFlight.set(key, work);
	}

	const result = await inFlight.get(key);
	if (!result) misses.set(key, Date.now());
	return result;
}

/** Forget the cached artwork for a type so the next request resolves it again. */
export async function forgetSteamArt(type) {
	const key = safeTypeKey(type);
	if (!key) return;
	misses.delete(key);
	await fs.rm(cachePath(key), { force: true });
}

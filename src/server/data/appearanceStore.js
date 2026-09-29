import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";

// How each game type looks on the dashboard, when the automatic Steam artwork
// isn't what the user wants — or can't exist at all, which is the normal case
// for Minecraft and anything else that never came from SteamCMD.
//
// Keyed by server type, because that's the unit the dashboard actually draws:
// GameCard groups every instance of a type under one banner, so per-server
// artwork would have nowhere to appear.

const SCHEMA_VERSION = 1;
const enqueue = createWriteQueue();

export const MODES = ["auto", "color", "image"];

let byType = {};

/** Types are used as filenames and URL segments, so they get narrowed hard. */
export function safeTypeKey(type) {
	const key = String(type ?? "")
		.toLowerCase()
		.trim();
	return /^[a-z0-9][a-z0-9._-]{0,39}$/.test(key) ? key : null;
}

function isHexColor(value) {
	return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export async function initAppearanceStore() {
	const stored = await readJson(paths.appearanceFile, null);
	byType = stored && typeof stored.types === "object" && stored.types !== null ? stored.types : {};
	const count = Object.keys(byType).length;
	if (count > 0) console.log(`[appearance] Loaded overrides for ${count} game type(s).`);
	return byType;
}

export function all() {
	return byType;
}

export function get(type) {
	const key = safeTypeKey(type);
	return (key && byType[key]) || null;
}

async function persist() {
	await writeJsonAtomic(paths.appearanceFile, { schemaVersion: SCHEMA_VERSION, types: byType });
}

/**
 * Merge a patch into one type's appearance. Unknown and malformed fields are
 * dropped rather than rejected — the same forgiving approach the config store
 * takes, since a bad colour is not worth failing a save over.
 *
 * `updatedAt` doubles as a cache-buster: artwork is served with a long
 * max-age, so without a version in the URL an upload wouldn't show up for a
 * week.
 */
export async function set(type, patch) {
	const key = safeTypeKey(type);
	if (!key) throw new Error("Unrecognised game type.");

	return enqueue(async () => {
		const current = byType[key] ?? {};
		const next = { ...current };

		if (patch.mode !== undefined) {
			if (!MODES.includes(patch.mode)) throw new Error(`Unknown appearance mode "${patch.mode}".`);
			next.mode = patch.mode;
		}
		// Colours are kept even while in image mode, so switching back and
		// forth doesn't lose the one you're not currently using.
		for (const field of ["color", "color2"]) {
			if (patch[field] === undefined) continue;
			if (patch[field] === null || patch[field] === "") delete next[field];
			else if (isHexColor(patch[field])) next[field] = patch[field];
		}
		if (patch.appId !== undefined) {
			const digits = String(patch.appId).trim();
			if (digits === "") delete next.appId;
			else if (/^\d{1,10}$/.test(digits)) next.appId = digits;
			else throw new Error("A Steam app ID is a number, taken from the store page URL.");
		}
		if (patch.image !== undefined) {
			if (patch.image === null) delete next.image;
			else next.image = patch.image;
		}

		next.updatedAt = Date.now();
		byType[key] = next;
		await persist();
		return next;
	});
}

export async function remove(type) {
	const key = safeTypeKey(type);
	if (!key) return;
	return enqueue(async () => {
		delete byType[key];
		await persist();
	});
}

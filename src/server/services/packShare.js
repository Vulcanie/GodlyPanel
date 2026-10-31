import crypto from "node:crypto";
import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";
import { ModError } from "./modService.js";

// The mod pack link: the owner can share a server's client mod pack at the public address, and a player opens it with a secret token
// in the address. The token is the only thing that names the server there, so it is kept here, and a link can be turned off or changed
// at any time. Off for every server until the owner turns it on.
//
// The token is stored in plain text so the owner can see the link again. It is compared in constant time, and never written to a log.

const FILE = path.join(paths.dataDir, "state", "pack-shares.json");
const enqueue = createWriteQueue();
// 32 random bytes, base64url: always 43 characters of letters, digits, "-" and "_".
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const TOKEN_BYTES = 32;

// The entries are keyed by a hash of the server's name, so whatever the name holds, the key is plain hex.
const keyOf = (serverName) => crypto.createHash("sha256").update(String(serverName)).digest("hex").slice(0, 24);

// A file that is missing, damaged or the wrong shape reads as no shares at all. Never throws.
async function load() {
	const data = await readJson(FILE, null);
	const shares = data && typeof data === "object" && data.shares && typeof data.shares === "object" && !Array.isArray(data.shares) ? data.shares : {};
	return shares;
}

const save = (shares) => writeJsonAtomic(FILE, { shares });

const statusOf = (entry) => (entry ? { enabled: true, token: entry.token, createdAt: entry.createdAt } : { enabled: false, token: null, createdAt: null });

/** Whether a server's pack is shared, with its link's token if so. */
export async function shareStatus(serverName) {
	return statusOf((await load())[keyOf(serverName)]);
}

/** Turns the share on, or keeps the link it already has. */
export function enableShare(serverName) {
	return enqueue(async () => {
		const shares = await load();
		const key = keyOf(serverName);
		if (!shares[key]) {
			shares[key] = { server: String(serverName), token: crypto.randomBytes(TOKEN_BYTES).toString("base64url"), createdAt: new Date().toISOString() };
			await save(shares);
		}
		return statusOf(shares[key]);
	});
}

/** A new link. The old one stops working at once. Only a share that is on can be given a new link. */
export function rotateShare(serverName) {
	return enqueue(async () => {
		const shares = await load();
		const key = keyOf(serverName);
		if (!shares[key]) throw new ModError("Turn the share on before making a new link.", "not_enabled", 409);
		shares[key] = { ...shares[key], token: crypto.randomBytes(TOKEN_BYTES).toString("base64url") };
		await save(shares);
		return statusOf(shares[key]);
	});
}

/** Turns the share off: the link stops working. Nothing happens if there was no share. */
export function disableShare(serverName) {
	return enqueue(async () => {
		const shares = await load();
		const key = keyOf(serverName);
		if (!shares[key]) return;
		delete shares[key];
		await save(shares);
	});
}

/**
 * The name of the server a token belongs to, or null. Anything that isn't a token of the right shape is refused before the file is
 * read. Every stored token is compared, with no stop at the first mismatch, so the time taken doesn't reveal how much of a token was right.
 */
export async function serverForToken(token) {
	if (typeof token !== "string" || !TOKEN.test(token)) return null;
	const given = Buffer.from(token, "utf8");
	let found = null;
	for (const entry of Object.values(await load())) {
		if (!entry || typeof entry.token !== "string" || typeof entry.server !== "string") continue;
		const stored = Buffer.from(entry.token, "utf8");
		if (stored.length !== given.length) continue;
		if (crypto.timingSafeEqual(stored, given)) found = entry.server;
	}
	return found;
}

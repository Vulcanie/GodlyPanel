import crypto from "node:crypto";
import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";
import { dropStreamsForSession } from "./sseHub.js";

// Every sign-in, as a record the panel keeps: when, from where, on what, and when it was last used. The sign-in token carries the
// record's id, so a single sign-in can be ended (a phone that was lost, a browser left open on someone else's PC) without
// signing the person out everywhere, and the person can see what is signed in as them.
//
// A token is only good while its record exists, on top of everything it was already subject to (the account still exists and
// isn't suspended, and its password hasn't changed since).

const FILE = path.join(paths.dataDir, "state", "sessions.json");
const enqueue = createWriteQueue();
const MAX_PER_USER = 20;
const SAVE_EVERY_MS = 60_000; // "last used" changes on every request; it is written out this often, not each time
const TOUCH_EVERY_MS = 30_000;

/** @type {Map<string, object>} */
let sessions = new Map();
let dirty = false;
let timer = null;

const save = () =>
	enqueue(async () => {
		dirty = false;
		await writeJsonAtomic(FILE, { sessions: Object.fromEntries(sessions) });
	});

function saveSoon() {
	dirty = true;
	if (timer) return;
	timer = setTimeout(() => {
		timer = null;
		if (dirty) save().catch((err) => console.warn("[sessions] Couldn't save:", err.message));
	}, SAVE_EVERY_MS);
	timer.unref?.();
}

function prune(now = Date.now()) {
	let changed = false;
	for (const [sid, s] of sessions) {
		if (s.expiresAt <= now) {
			sessions.delete(sid);
			changed = true;
		}
	}
	return changed;
}

export async function initSessions() {
	const raw = await readJson(FILE, { sessions: {} });
	sessions = new Map(Object.entries(raw?.sessions ?? {}));
	if (prune()) await save();
}

/**
 * Make the record for a new sign-in and return its id.
 * @param {{ user: {id: string, username: string, sessionVersion: number}, ip?: string, userAgent?: string, via?: string, expiresAt: number }} input
 */
export function createSession({ user, ip = "", userAgent = "", via = "panel", expiresAt }) {
	const mine = [...sessions.values()].filter((s) => s.userId === user.id).sort((a, b) => a.lastSeen - b.lastSeen);
	for (const old of mine.slice(0, Math.max(0, mine.length - (MAX_PER_USER - 1)))) {
		sessions.delete(old.id);
		dropStreamsForSession(old.id);
	}
	const now = Date.now();
	const id = crypto.randomBytes(16).toString("hex");
	sessions.set(id, { id, userId: user.id, username: user.username, sv: user.sessionVersion, createdAt: now, lastSeen: now, expiresAt, ip, userAgent: String(userAgent).slice(0, 300), via });
	save().catch((err) => console.warn("[sessions] Couldn't save:", err.message));
	return id;
}

/** The record for this id if it is still good, else null. */
export function findSession(id) {
	const s = sessions.get(id);
	if (!s) return null;
	if (s.expiresAt <= Date.now()) {
		sessions.delete(id);
		return null;
	}
	return s;
}

/** Note that a session was just used (and from where). Cheap enough to call on every request. */
export function touchSession(s, ip) {
	const now = Date.now();
	if (now - s.lastSeen < TOUCH_EVERY_MS && (!ip || ip === s.ip)) return;
	s.lastSeen = now;
	if (ip) s.ip = ip;
	saveSoon();
}

/** A user's sessions, newest use first. Records from before their password last changed are dropped as they are found. */
export function listSessions({ userId = null, getUser }) {
	const out = [];
	let changed = prune();
	for (const s of sessions.values()) {
		if (userId && s.userId !== userId) continue;
		const user = getUser(s.userId);
		if (!user || user.disabled || user.sessionVersion !== s.sv) {
			sessions.delete(s.id);
			dropStreamsForSession(s.id);
			changed = true;
			continue;
		}
		out.push({ ...s, role: user.role });
	}
	if (changed) save().catch(() => {});
	return out.sort((a, b) => b.lastSeen - a.lastSeen);
}

/** End one sign-in. Returns whether there was one. */
export function revokeSession(id) {
	if (!sessions.delete(id)) return false;
	dropStreamsForSession(id);
	save().catch((err) => console.warn("[sessions] Couldn't save:", err.message));
	return true;
}

/** End all of a person's sign-ins (optionally keeping one). Returns how many. */
export function revokeUserSessions(userId, exceptId = null) {
	let count = 0;
	for (const s of [...sessions.values()]) {
		if (s.userId !== userId || s.id === exceptId) continue;
		sessions.delete(s.id);
		dropStreamsForSession(s.id);
		count += 1;
	}
	if (count) save().catch((err) => console.warn("[sessions] Couldn't save:", err.message));
	return count;
}

/** Test hook: write now. */
export const flushSessions = () => save();

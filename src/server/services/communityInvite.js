import crypto from "node:crypto";
import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";
import { createUser } from "../data/userStore.js";
import { logActivity } from "./activityLog.js";

// A community code lets people make their own guest account, so the owner doesn't have to
// invent a username and password for each friend and send it over chat. The code is only a
// way to ask for a guest account: guests can look at the dashboard and nothing else, so the
// worst a leaked code allows is more people looking. It can be switched off, replaced, set
// to run out, or limited to a number of sign-ups at any time; accounts made with it stay
// until the owner removes them in Users.
//
// It is saved as plain text (not hashed) because the owner needs to read it back to share it;
// the file sits beside the other state files, and only an administrator can read it through
// the panel.

const FILE = path.join(paths.dataDir, "state", "community-invite.json");
const enqueue = createWriteQueue();

// No 0/O, 1/I/L: a code read out loud or typed from a screenshot must survive being misread.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DAY = 86_400_000;

const EMPTY = { enabled: false, code: "", createdAt: null, expiresAt: null, maxJoins: null, joins: 0 };
let state = { ...EMPTY };

const newCode = () => {
	const pick = () => Array.from(crypto.randomBytes(4), (b) => ALPHABET[b % ALPHABET.length]).join("");
	return `${pick()}-${pick()}`;
};

/** Case, spaces and dashes don't matter when someone types or pastes a code. */
export const normaliseCode = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function initCommunityInvite() {
	const stored = await readJson(FILE, null);
	state = { ...EMPTY, ...(stored ?? {}) };
}

const persist = () => writeJsonAtomic(FILE, state);

function expired(now = Date.now()) {
	return state.expiresAt !== null && now >= state.expiresAt;
}
function full() {
	return state.maxJoins !== null && state.joins >= state.maxJoins;
}

/** Why a code isn't being accepted right now, or null when it is. */
function closedBecause(now = Date.now()) {
	if (!state.enabled || !state.code) return "off";
	if (expired(now)) return "expired";
	if (full()) return "full";
	return null;
}

/** All the owner sees. */
export function inviteStatus() {
	return {
		enabled: state.enabled,
		code: state.code,
		createdAt: state.createdAt,
		expiresAt: state.expiresAt,
		maxJoins: state.maxJoins,
		joins: state.joins,
		open: closedBecause() === null,
		closedBecause: closedBecause(),
	};
}

/** All anyone else may learn: whether signing up with a code is possible at all. */
export const joiningIsOpen = () => closedBecause() === null;

/**
 * Change the settings. `regenerate` replaces the code (and starts the count again);
 * turning the invite on for the first time makes a code.
 */
export function updateInvite({ enabled, expiresInDays, maxJoins, regenerate = false }) {
	return enqueue(async () => {
		const now = Date.now();
		if (enabled !== undefined) state.enabled = Boolean(enabled);
		if (regenerate || (state.enabled && !state.code)) {
			state.code = newCode();
			state.createdAt = now;
			state.joins = 0;
		}
		if (expiresInDays !== undefined) {
			if (expiresInDays === null || expiresInDays === 0) state.expiresAt = null;
			else if (Number.isFinite(expiresInDays) && expiresInDays > 0 && expiresInDays <= 365) state.expiresAt = now + expiresInDays * DAY;
			else throw new Error("Choose between 1 and 365 days, or no limit.");
		}
		if (maxJoins !== undefined) {
			if (maxJoins === null || maxJoins === 0) state.maxJoins = null;
			else if (Number.isInteger(maxJoins) && maxJoins > 0 && maxJoins <= 1000) state.maxJoins = maxJoins;
			else throw new Error("The number of sign-ups must be a whole number from 1 to 1000, or no limit.");
		}
		await persist();
		return inviteStatus();
	});
}

// ---- joining ----------------------------------------------------------------------------

// Guessing a code is slowed the same way guessing a password is: a handful of wrong tries from
// one address, and a larger total across all addresses, then everyone waits.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_ADDRESS = 8;
const MAX_ALL = 40;
const misses = new Map(); // key -> { count, since }

const bump = (key) => {
	const now = Date.now();
	const e = misses.get(key);
	if (!e || now - e.since > WINDOW_MS) misses.set(key, { count: 1, since: now });
	else e.count += 1;
};
const waitFor = (key, max) => {
	const e = misses.get(key);
	if (!e || e.count < max) return 0;
	const left = WINDOW_MS - (Date.now() - e.since);
	return left > 0 ? Math.ceil(left / 1000) : 0;
};

/** Seconds a caller must wait before another try, 0 when allowed. */
export const joinWait = (address) => Math.max(waitFor(`ip:${address}`, MAX_PER_ADDRESS), waitFor("all", MAX_ALL));

export class JoinError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

const sameCode = (given) => {
	const a = Buffer.from(normaliseCode(given));
	const b = Buffer.from(normaliseCode(state.code));
	// Equal lengths first, so timingSafeEqual doesn't throw; the length of a code isn't secret.
	return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
};

/** Make a guest account for someone who knows the code. */
export function joinWithCode({ code, username, password }, address) {
	return enqueue(async () => {
		const wait = joinWait(address);
		if (wait > 0) throw new JoinError(`Too many wrong codes. Try again in ${Math.ceil(wait / 60)} minute(s).`, "rate_limited", 429);

		// A wrong code and a switched-off invite read the same, so someone without the code learns
		// nothing about whether one exists. Only a person holding the right code is told it has
		// run out or filled up.
		const closed = closedBecause();
		if (closed === "off" || !sameCode(code)) {
			bump(`ip:${address}`);
			bump("all");
			throw new JoinError("That code isn't right.", "bad_code", 403);
		}
		if (closed !== null) throw new JoinError("That code isn't accepting new people any more. Ask the owner for a new one.", "closed", 403);

		const user = await createUser({ username, password, role: "guest" });
		state.joins += 1;
		await persist();
		logActivity({ type: "users.joined", message: `${user.username} joined with the community code.`, data: { username: user.username } });
		return user;
	});
}

/** For tests: forget the wrong-guess counts. */
export const resetJoinLimits = () => misses.clear();

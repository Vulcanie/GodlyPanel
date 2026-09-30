import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { paths } from "../paths.js";

// Who is on each server, and who has been. The poller already learns the list of
// players every few seconds; this watches it change and keeps a record of people
// joining and leaving, so there is an answer to "who was on last night?".
//
// It stays on this PC, one small file per server, and is trimmed as it grows.
// What it knows is only what the game reports: names, not accounts.

const DIR = path.join(paths.dataDir, "state", "players");
const MAX_BYTES = 512 * 1024;
const MISSES_BEFORE_OFFLINE = 2; // a single failed poll isn't everyone leaving

const live = new Map(); // server name -> { players: Map(name -> since ms), misses }

const fileFor = (name) => path.join(DIR, `${String(name).replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40)}-${crypto.createHash("sha1").update(name).digest("hex").slice(0, 6)}.jsonl`);

function append(name, events) {
	if (events.length === 0) return;
	try {
		fs.mkdirSync(DIR, { recursive: true });
		const file = fileFor(name);
		try {
			if (fs.statSync(file).size > MAX_BYTES) {
				// Keep the newer half.
				const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
				fs.writeFileSync(file, `${lines.slice(Math.floor(lines.length / 2)).join("\n")}\n`);
			}
		} catch {
			// No file yet.
		}
		fs.appendFileSync(file, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
	} catch (err) {
		console.warn("[players] Could not record:", err.message);
	}
}

/**
 * Feed in a server's latest poll.
 * @param {string} name
 * @param {{ online: boolean, playerList?: string[] }} status
 */
export function noteServerPlayers(name, status, now = Date.now()) {
	let state = live.get(name);
	if (!state) {
		// First sight of this server since the panel started: whoever is already on
		// is noted without pretending they just joined.
		state = { players: new Map(), misses: 0, seeded: false };
		live.set(name, state);
	}

	if (!status?.online) {
		state.misses += 1;
		if (state.misses >= MISSES_BEFORE_OFFLINE && state.players.size > 0) {
			append(name, [...state.players.keys()].map((player) => ({ t: new Date(now).toISOString(), type: "leave", name: player, reason: "server went offline" })));
			state.players.clear();
		}
		return;
	}
	state.misses = 0;

	const current = new Set((status.playerList ?? []).filter(Boolean).map(String));
	const events = [];
	for (const player of current) {
		if (!state.players.has(player)) {
			state.players.set(player, now);
			if (state.seeded) events.push({ t: new Date(now).toISOString(), type: "join", name: player });
		}
	}
	for (const [player] of [...state.players]) {
		if (!current.has(player)) {
			state.players.delete(player);
			events.push({ t: new Date(now).toISOString(), type: "leave", name: player });
		}
	}
	state.seeded = true;
	append(name, events);
}

export function forgetPlayers(name) {
	live.delete(name);
	fs.rmSync(fileFor(name), { force: true });
}

function readEvents(name) {
	try {
		return fs.readFileSync(fileFor(name), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
	} catch {
		return [];
	}
}

/** Fold join/leave events into one row per player. */
export function summarise(events, onlineNow = new Map(), now = Date.now()) {
	const people = new Map();
	const row = (name) => {
		if (!people.has(name)) people.set(name, { name, sessions: 0, totalMs: 0, firstSeen: null, lastSeen: null, joinedAt: null });
		return people.get(name);
	};
	for (const e of events) {
		const p = row(e.name);
		const at = Date.parse(e.t);
		p.firstSeen ??= e.t;
		p.lastSeen = e.t;
		if (e.type === "join") {
			p.sessions += 1;
			p.joinedAt = at;
		} else if (e.type === "leave" && p.joinedAt !== null) {
			p.totalMs += at - p.joinedAt;
			p.joinedAt = null;
		}
	}
	for (const [name, since] of onlineNow) {
		const p = row(name);
		p.firstSeen ??= new Date(since).toISOString();
		p.lastSeen = new Date(now).toISOString();
		const from = p.joinedAt ?? since;
		p.totalMs += now - from;
		p.joinedAt = null;
		p.online = true;
	}
	return [...people.values()]
		.map(({ joinedAt, ...rest }) => ({ ...rest, online: rest.online === true, totalMinutes: Math.round(rest.totalMs / 60000) }))
		.map(({ totalMs, ...rest }) => rest)
		.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
}

export function playersFor(name, { recent = 100 } = {}) {
	const now = Date.now();
	const onlineNow = live.get(name)?.players ?? new Map();
	const events = readEvents(name);
	return {
		online: [...onlineNow].map(([player, since]) => ({ name: player, since: new Date(since).toISOString() })).sort((a, b) => a.name.localeCompare(b.name)),
		recent: events.slice(-recent).reverse(),
		people: summarise(events, onlineNow, now).slice(0, 200),
	};
}

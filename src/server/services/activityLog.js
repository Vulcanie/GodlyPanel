import fs from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { broadcastSseEvent } from "./sseHub.js";
import { can, canAccessServer } from "../middleware/permissions.js";

// A running record of what the panel did and what happened to servers: crashes,
// restarts, backups, updates. It feeds the Activity view and the notifier, and
// it is the answer to "why did my server restart at 4am?".
//
// One JSON object per line, appended; the file is rotated when it gets large so
// it can't grow without bound.

const FILE = path.join(paths.dataDir, "state", "activity.jsonl");
const MAX_BYTES = 2 * 1024 * 1024;
const listeners = new Set();

/**
 * @param {object} event
 * @param {string} event.type    dotted name, e.g. "server.crashed", "backup.completed"
 * @param {string|null} [event.server]
 * @param {"info"|"warn"|"error"} [event.level]
 * @param {string} event.message
 * @param {object} [event.data]
 */
export function logActivity({ type, server = null, level = "info", message, data = undefined }) {
	const event = { t: new Date().toISOString(), type, server, level, message, ...(data ? { data } : {}) };
	try {
		fs.mkdirSync(path.dirname(FILE), { recursive: true });
		try {
			if (fs.statSync(FILE).size > MAX_BYTES) fs.renameSync(FILE, `${FILE}.1`);
		} catch {
			// No file yet.
		}
		fs.appendFileSync(FILE, `${JSON.stringify(event)}\n`);
	} catch (err) {
		console.warn("[activity] Could not record an event:", err.message);
	}
	// Only people who run servers see this feed, not view-only guests, and a moderator limited to some servers sees only theirs
	// (the same rule as the activity list: what happened to a server they can't reach is not theirs to read).
	broadcastSseEvent({ type: "activity", event }, (client) => activityVisibleTo(client, event));
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (err) {
			console.warn("[activity] A listener failed:", err.message);
		}
	}
	return event;
}

/**
 * Whether a live-update client may be sent this event. Only people who may view activity get it, and one limited to some servers
 * (or holding a role on one server only) gets only the events about those servers. Fails closed: an unknown role sees nothing.
 */
export function activityVisibleTo(client, event) {
	if (!can(client, "activity.view", event.server)) return false;
	return !event.server || canAccessServer(client, event.server);
}

export function onActivity(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function readTail(file, bytes) {
	try {
		const size = fs.statSync(file).size;
		const length = Math.min(size, bytes);
		const fd = fs.openSync(file, "r");
		try {
			const buffer = Buffer.alloc(length);
			fs.readSync(fd, buffer, 0, length, size - length);
			let text = buffer.toString("utf8");
			// A tail read can start mid-line.
			if (size > length) text = text.slice(text.indexOf("\n") + 1);
			return text;
		} finally {
			fs.closeSync(fd);
		}
	} catch {
		return "";
	}
}

/**
 * Newest first. `server` limits to one server; `types` to event-type prefixes. `canSee(serverName)` leaves out the servers the
 * caller may not look at, before the limit is applied (applied afterwards, a limited moderator would get a short page because
 * the newest events belonged to other servers).
 */
export function recentActivity({ server = null, types = null, limit = 100, canSee = null } = {}) {
	const lines = (readTail(FILE, 1024 * 1024) + "\n" + (readTail(`${FILE}.1`, 512 * 1024))).split("\n");
	const events = [];
	for (const line of lines) {
		if (!line.trim()) continue;
		try {
			events.push(JSON.parse(line));
		} catch {
			// A line cut by the tail read.
		}
	}
	events.sort((a, b) => (a.t < b.t ? 1 : a.t > b.t ? -1 : 0));
	return events
		.filter((e) => (server ? e.server === server : true))
		.filter((e) => (types ? types.some((t) => e.type.startsWith(t)) : true))
		.filter((e) => !e.server || !canSee || canSee(e.server))
		.slice(0, Math.min(Math.max(1, limit), 500));
}

/**
 * Everything the log still holds (both files, not just the recent tail), oldest first, for exporting.
 * @param {{ from?: string|number|Date, to?: string|number|Date, types?: string[]|null, server?: string|null }} [filter]
 */
export function allActivity({ from = null, to = null, types = null, server = null } = {}) {
	const read = (file) => {
		try {
			return fs.readFileSync(file, "utf8");
		} catch {
			return "";
		}
	};
	const start = from == null ? -Infinity : new Date(from).getTime();
	const end = to == null ? Infinity : new Date(to).getTime();
	const events = [];
	for (const line of `${read(`${FILE}.1`)}\n${read(FILE)}`.split("\n")) {
		if (!line.trim()) continue;
		let e;
		try {
			e = JSON.parse(line);
		} catch {
			continue;
		}
		const t = Date.parse(e.t);
		if (t < start || t > end) continue;
		if (server && e.server !== server) continue;
		if (types && !types.some((p) => String(e.type).startsWith(p))) continue;
		events.push(e);
	}
	return events.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
}

/**
 * Search the whole log: by text, type prefix, level, server and time, in either order, a page at a time. `canSee(serverName)`
 * leaves out the servers the caller may not look at (events about no server in particular always stay). The lists of servers and
 * types it also returns are for the filter menus, so they cover everything the caller may see, not just this page.
 */
export function searchActivity({ q = "", types = null, levels = null, server = null, from = null, to = null, order = "desc", limit = 150, offset = 0, canSee = null } = {}) {
	const visible = allActivity({ from, to }).filter((e) => !e.server || !canSee || canSee(e.server));
	const servers = [...new Set(visible.map((e) => e.server).filter(Boolean))].sort((a, b) => a.localeCompare(b));
	const typeCounts = {};
	for (const e of visible) typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;

	const needle = String(q).trim().toLowerCase();
	const haystack = (e) => `${e.message} ${e.type} ${e.server ?? ""} ${e.data ? JSON.stringify(e.data) : ""}`.toLowerCase();
	const matches = visible.filter(
		(e) =>
			(!server || e.server === server) &&
			(!types || types.some((p) => String(e.type).startsWith(p))) &&
			(!levels || levels.includes(e.level)) &&
			(!needle || haystack(e).includes(needle)),
	);
	if (order !== "asc") matches.reverse();
	const start = Math.max(0, Number(offset) || 0);
	return { total: matches.length, events: matches.slice(start, start + Math.min(Math.max(1, Number(limit) || 150), 500)), servers, types: typeCounts };
}

const CSV_COLUMNS = ["time", "level", "type", "server", "message", "details"];

// A cell that starts with = + - @ is run as a formula by spreadsheet programs, and the message holds names people typed.
const csvCell = (value) => {
	let text = String(value ?? "");
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** Events as a CSV file (with a header row) or as JSON Lines, one event per line. */
export function formatActivity(events, format) {
	if (format === "jsonl") return events.map((e) => JSON.stringify(e)).join("\n") + (events.length ? "\n" : "");
	const rows = events.map((e) => [e.t, e.level, e.type, e.server, e.message, e.data ? JSON.stringify(e.data) : ""]);
	return [CSV_COLUMNS, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const activityFile = FILE;

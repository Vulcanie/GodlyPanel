import fs from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { broadcastSseEvent } from "./sseHub.js";

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
	// Only people who run servers see this feed, not view-only guests.
	broadcastSseEvent({ type: "activity", event }, (client) => client.role === "admin" || client.role === "moderator");
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (err) {
			console.warn("[activity] A listener failed:", err.message);
		}
	}
	return event;
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

/** Newest first. `server` limits to one server; `types` to event-type prefixes. */
export function recentActivity({ server = null, types = null, limit = 100 } = {}) {
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
		.slice(0, Math.min(Math.max(1, limit), 500));
}

export const activityFile = FILE;

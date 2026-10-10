import { promises as fs } from "node:fs";
import { listLogs } from "./logService.js";

// Valheim's Steam query reports how many players are on but gives each a blank name (a known fault in the game's server), so the
// names have to come from the server's own log. When someone joins it prints, in this order,
//
//   Got handshake from client <their id>
//   Got character ZDOID from <character name> : <number>:<number>
//
// and when they go, "Closing socket <their id>". The log only exists if the server is started with -logFile (the panel's own start
// script does that; a hand-made one may not), and only the tail of it is read.

const TAIL_BYTES = 256 * 1024;

/**
 * Who is connected, according to a stretch of the log, oldest arrival first.
 * @param {string} text
 * @returns {string[]}
 */
export function connectedFromLog(text) {
	const names = new Map(); // character name -> the connection it arrived on
	let current = null;
	for (const line of String(text).split(/\r?\n/)) {
		let m = /Got handshake from client (\S+)/.exec(line);
		if (m) {
			current = m[1];
			continue;
		}
		m = /Got character ZDOID from (.+?) : (-?\d+):(-?\d+)\s*$/.exec(line);
		if (m) {
			// 0:0 is a character that has just died; they are still connected. A name seen before keeps the connection it came in on,
			// since a respawn is not preceded by a new handshake and the last one belongs to somebody else.
			if (m[2] === "0" && m[3] === "0") continue;
			if (!names.has(m[1])) names.set(m[1], current);
			continue;
		}
		m = /Closing socket (\S+)/.exec(line);
		if (m) for (const [name, id] of [...names]) if (id === m[1]) names.delete(name);
	}
	return [...names.keys()];
}

/** The names on this server now, from its log; empty when there is no log to read. Never throws. */
export async function valheimNamesFromLog(server, { max = Infinity } = {}) {
	try {
		const log = (await listLogs(server)).find((l) => l.name === "valheim_server.log");
		if (!log) return [];
		const handle = await fs.open(log.path, "r");
		try {
			const { size } = await handle.stat();
			const start = Math.max(0, size - TAIL_BYTES);
			const buffer = Buffer.alloc(size - start);
			await handle.read(buffer, 0, buffer.length, start);
			// The most recent arrivals are the likeliest to still be there if a leaving line was missed.
			return connectedFromLog(buffer.toString("utf8")).slice(-max);
		} finally {
			await handle.close();
		}
	} catch {
		return [];
	}
}

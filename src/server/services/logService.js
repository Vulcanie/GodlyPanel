import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { LOG_TEMPLATES } from "../data/logTemplates.js";
import { templateOfServer } from "./serverCreationService.js";
import { serverLogPath } from "./windowlessLauncher.js";

// Reading a server's logs: which files there are, the tail of one, new lines since
// a point (for following it live), and searching. Files are read from the end in
// small pieces, so a log of hundreds of megabytes costs the same as a short one.
//
// What a log shows is sometimes more than a moderator should see (a command line
// with the server password on it), so those are masked for everyone but admins.

const MAX_LINES = 2000;
const MAX_CHUNK = 512 * 1024;
const MAX_SEARCH_BYTES = 64 * 1024 * 1024;
const RECENT_FILES = 8;

const hashOf = (p) => crypto.createHash("sha1").update(p.toLowerCase()).digest("hex").slice(0, 12);

const secretPatterns = [
	/(-(?:ServerPassword|RCONPassword|AdminPassword|Password|ServerAdminPassword|PalworldAdminPassword)=)\S+/gi,
	/((?:password|passwd|pwd|secret|token|api[_-]?key)["']?\s*[:=]\s*["']?)[^\s"',;]+/gi,
	/(rcon\.password=)\S*/gi,
	/(\+password\s+)\S+/gi,
];

/** Hide anything that looks like a password or key. */
export function redactSecrets(text) {
	let out = text;
	for (const pattern of secretPatterns) out = out.replace(pattern, "$1********");
	return out;
}

async function exists(p) {
	try {
		return await fs.stat(p);
	} catch {
		return null;
	}
}

/** The log files available for a server, newest first. */
export async function listLogs(server) {
	const found = [];
	const add = async (file, label) => {
		const stat = await exists(file);
		if (stat?.isFile()) found.push({ id: hashOf(file), label, name: path.basename(file), path: file, size: stat.size, modified: stat.mtime.toISOString() });
	};

	const captured = serverLogPath(server);
	await add(captured, "Output captured by the panel");

	const template = LOG_TEMPLATES[templateOfServer(server)?.id] ?? [];
	for (const spec of template) {
		const root = spec.base === "install" ? server.installDir : server.workingDir || server.installDir;
		if (!root) continue;
		const target = path.resolve(root, spec.rel);
		if (spec.kind === "file") {
			await add(target, spec.label);
			continue;
		}
		let names = [];
		try {
			names = await fs.readdir(target);
		} catch {
			continue;
		}
		const files = [];
		for (const name of names) {
			if (!/\.(log|txt)$/i.test(name)) continue;
			const stat = await exists(path.join(target, name));
			if (stat?.isFile()) files.push({ name, stat });
		}
		files.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
		for (const { name } of files.slice(0, RECENT_FILES)) await add(path.join(target, name), spec.label);
	}

	return found.sort((a, b) => (a.modified < b.modified ? 1 : -1));
}

/** Find one of a server's log files by the id listLogs gave it. Never takes a path from the caller. */
async function resolveLog(server, id) {
	return (await listLogs(server)).find((l) => l.id === id) ?? null;
}

async function readRange(file, start, length) {
	const fd = await fs.open(file, "r");
	try {
		const buffer = Buffer.alloc(length);
		const { bytesRead } = await fd.read(buffer, 0, length, start);
		return buffer.subarray(0, bytesRead).toString("utf8");
	} finally {
		await fd.close();
	}
}

const splitLines = (text) => text.split(/\r?\n/);

/**
 * @param {object} options
 * @param {number} [options.lines]   how many of the last lines (tail mode)
 * @param {number} [options.since]   a byte offset from an earlier call: only what was added after it
 * @param {boolean} [options.redact]
 * @returns {Promise<{ lines: string[], offset: number, size: number, reset: boolean }>}
 */
export async function readLog(server, id, { lines = 300, since = null, redact = true } = {}) {
	const log = await resolveLog(server, id);
	if (!log) return null;
	const stat = await fs.stat(log.path);
	const finish = (raw, offset, reset) => {
		let out = splitLines(raw);
		if (out.at(-1) === "") out.pop();
		if (redact) out = out.map(redactSecrets);
		return { lines: out, offset, size: stat.size, reset, name: log.name, label: log.label };
	};

	if (since !== null && Number.isFinite(since)) {
		// The file was replaced or rotated since: start over from its end.
		if (since > stat.size) return readLog(server, id, { lines, redact });
		const length = Math.min(stat.size - since, MAX_CHUNK);
		if (length <= 0) return finish("", since, false);
		const text = await readRange(log.path, since, length);
		// Only whole lines: a game mid-write can leave the last one unfinished.
		const cut = text.lastIndexOf("\n");
		if (cut === -1) return finish("", since, false);
		return finish(text.slice(0, cut + 1), since + Buffer.byteLength(text.slice(0, cut + 1), "utf8"), false);
	}

	const wanted = Math.min(Math.max(1, lines), MAX_LINES);
	const length = Math.min(stat.size, MAX_CHUNK);
	const start = stat.size - length;
	let text = await readRange(log.path, start, length);
	if (start > 0) text = text.slice(text.indexOf("\n") + 1); // began mid-line
	const all = splitLines(text);
	if (all.at(-1) === "") all.pop();
	const tail = all.slice(-wanted);
	let offset = stat.size;
	// Don't hand out an offset in the middle of a line still being written.
	if (text && !text.endsWith("\n")) offset = stat.size - Buffer.byteLength(tail.pop() ?? "", "utf8");
	return finish(tail.join("\n"), offset, true);
}

/** Lines containing `term` (case-insensitive), newest last, from the final part of the file. */
export async function searchLog(server, id, term, { max = 300, redact = true } = {}) {
	const log = await resolveLog(server, id);
	if (!log) return null;
	const needle = String(term).toLowerCase();
	const stat = await fs.stat(log.path);
	const start = Math.max(0, stat.size - MAX_SEARCH_BYTES);
	const matches = [];
	const fd = await fs.open(log.path, "r");
	try {
		const chunk = Buffer.alloc(4 * 1024 * 1024);
		let position = start;
		let carry = "";
		while (position < stat.size) {
			const { bytesRead } = await fd.read(chunk, 0, chunk.length, position);
			if (bytesRead === 0) break;
			position += bytesRead;
			const text = carry + chunk.subarray(0, bytesRead).toString("utf8");
			const parts = splitLines(text);
			carry = parts.pop() ?? "";
			for (const line of parts) {
				if (line.toLowerCase().includes(needle)) matches.push(line);
			}
			// Keep the newest: drop the oldest as we go instead of holding everything.
			if (matches.length > max * 4) matches.splice(0, matches.length - max);
		}
		if (carry.toLowerCase().includes(needle)) matches.push(carry);
	} finally {
		await fd.close();
	}
	const lines = matches.slice(-max);
	return { lines: redact ? lines.map(redactSecrets) : lines, searchedBytes: stat.size - start, partial: start > 0, name: log.name };
}

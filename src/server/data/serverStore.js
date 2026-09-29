import crypto from "node:crypto";
import path from "node:path";
import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";

// Replaces the old ServerData/servers.js, which was simultaneously config and
// executable source: adding a server meant string-splicing a JS object literal
// in before the closing "];" and separately push()ing onto the imported array
// to keep the running process in sync. That worked, but it made the file
// unparseable-by-anything-else, impossible to edit safely, and it could not
// support deleting or editing a server at all.
//
// Here it's plain JSON with atomic writes. Field names are kept exactly as
// they were so no consumer needs to change what it reads.

const STORE_PATH = path.join(paths.dataDir, "servers.json");
const SCHEMA_VERSION = 1;
const enqueue = createWriteQueue();

let servers = [];
const listeners = new Set();

function freeze(entry) {
	// Freezing turns "something mutated the store behind its back" from a
	// silent divergence between memory and disk into an immediate throw.
	if (entry.configPaths) Object.freeze(entry.configPaths);
	return Object.freeze(entry);
}

export async function initServerStore() {
	const stored = await readJson(STORE_PATH, null);

	if (stored && Array.isArray(stored.servers)) {
		servers = stored.servers.map(freeze);
	} else {
		servers = [];
		await writeJsonAtomic(STORE_PATH, { schemaVersion: SCHEMA_VERSION, servers: [] });
		console.log(`[servers] Created ${STORE_PATH}`);
	}

	console.log(`[servers] Loaded ${servers.length} server(s).`);
	return all();
}

/**
 * Every server, as a stable array reference that only changes when the store
 * does — so the 7.5s poll doesn't reallocate or re-read the disk.
 */
export function all() {
	return servers;
}

export function get(name) {
	return servers.find((s) => s.name === name) ?? null;
}

export function has(name) {
	return servers.some((s) => s.name === name);
}

export function onChange(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function emit(change) {
	for (const listener of listeners) {
		try {
			listener(all(), change);
		} catch (err) {
			console.error("[servers] change listener failed:", err.message);
		}
	}
}

async function persist() {
	await writeJsonAtomic(STORE_PATH, {
		schemaVersion: SCHEMA_VERSION,
		servers,
	});
}

export async function add(entry) {
	return enqueue(async () => {
		if (servers.some((s) => s.name === entry.name)) {
			throw new Error(`A server named "${entry.name}" already exists.`);
		}
		const record = freeze({
			id: entry.id ?? crypto.randomUUID(),
			createdAt: entry.createdAt ?? new Date().toISOString(),
			source: entry.source ?? "created",
			...entry,
		});
		servers = [...servers, record];
		await persist();
		emit({ type: "add", name: record.name });
		return record;
	});
}

/** Add several at once — one write, one event (used by the importer). */
export async function addMany(entries) {
	return enqueue(async () => {
		const added = [];
		let next = servers;
		for (const entry of entries) {
			if (next.some((s) => s.name === entry.name)) continue;
			const record = freeze({
				id: entry.id ?? crypto.randomUUID(),
				createdAt: entry.createdAt ?? new Date().toISOString(),
				source: entry.source ?? "imported",
				...entry,
			});
			next = [...next, record];
			added.push(record);
		}
		servers = next;
		await persist();
		emit({ type: "add-many", count: added.length });
		return added;
	});
}

export async function update(name, patch) {
	return enqueue(async () => {
		const index = servers.findIndex((s) => s.name === name);
		if (index === -1) throw new Error(`No server named "${name}".`);

		const updated = freeze({ ...servers[index], ...patch, name: patch.name ?? name });
		if (updated.name !== name && servers.some((s) => s.name === updated.name)) {
			throw new Error(`A server named "${updated.name}" already exists.`);
		}

		servers = servers.map((s, i) => (i === index ? updated : s));
		await persist();
		emit({ type: "update", name: updated.name, previousName: name });
		return updated;
	});
}

export async function remove(name) {
	return enqueue(async () => {
		if (!servers.some((s) => s.name === name)) {
			throw new Error(`No server named "${name}".`);
		}
		servers = servers.filter((s) => s.name !== name);
		await persist();
		emit({ type: "remove", name });
	});
}

export const serversPath = STORE_PATH;

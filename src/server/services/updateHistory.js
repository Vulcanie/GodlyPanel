import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";

// What each game update did to a server: the build it went from and to, whether the server came back, and which backup was taken
// first. The Update panel shows the latest few. Kept per server, newest last, so a long-running server doesn't grow the file without
// bound.

const KEEP = 20;
const enqueue = createWriteQueue();

// Server names are used as keys, so the map has no prototype: a server named "__proto__" or "constructor" must be an ordinary entry.
function emptyMap() {
	return Object.create(null);
}

async function loadAll() {
	const data = await readJson(paths.updateHistoryFile, null);
	const all = emptyMap();
	if (!data || typeof data !== "object" || Array.isArray(data)) return all;
	for (const name of Object.keys(data)) {
		if (Array.isArray(data[name])) all[name] = data[name];
	}
	return all;
}

function listOf(all, serverName) {
	return Object.hasOwn(all, serverName) ? all[serverName] : [];
}

/** Appends a record for the server, keeping only the newest 20. Writes are queued, so two servers finishing together cannot lose one. */
export function addRecord(serverName, record) {
	return enqueue(async () => {
		const all = await loadAll();
		const list = [...listOf(all, serverName), { ...record }];
		all[serverName] = list.slice(-KEEP);
		await writeJsonAtomic(paths.updateHistoryFile, all);
	});
}

/** The server's records, oldest first. Nothing recorded (or a damaged file) gives an empty list. */
export function listHistory(serverName) {
	return enqueue(async () => [...listOf(await loadAll(), serverName)]);
}

/**
 * Merges `patch` into the record whose `at` matches (the newest one, if two share a time). Does nothing when the record has been
 * trimmed away, since there is then nothing to say about it.
 */
export function patchRecord(serverName, at, patch) {
	return enqueue(async () => {
		const all = await loadAll();
		const list = [...listOf(all, serverName)];
		let index = -1;
		for (let i = list.length - 1; i >= 0; i -= 1) {
			if (list[i].at === at) {
				index = i;
				break;
			}
		}
		if (index < 0) return;
		list[index] = { ...list[index], ...patch };
		all[serverName] = list;
		await writeJsonAtomic(paths.updateHistoryFile, all);
	});
}

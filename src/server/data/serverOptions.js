import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";

// Per-server settings for the operations features: what to do when it crashes,
// whether to start it with the panel, and what to back up. Kept apart from the
// server's own entry (which is about how to reach and run it) so the two can
// change independently and an imported setup needs nothing added to it.

const FILE = path.join(paths.dataDir, "state", "server-options.json");
const enqueue = createWriteQueue();
let stored = {};

export const OPTION_DEFAULTS = Object.freeze({
	// Restart the server if it dies while it is meant to be running. Off until
	// asked for: a server someone closes by hand shouldn't come back on its own.
	autoRestart: false,
	// Start it when the panel starts (which, with "start with Windows", means when
	// the PC starts).
	autoStart: false,
	// Restart it when its program is running but it has stopped answering, after this
	// many minutes. Off by default: a server mid-save can look unresponsive for a while.
	restartWhenUnresponsive: false,
	unresponsiveMinutes: 10,
	backup: Object.freeze({
		// null = the game's usual save folders; otherwise [{ path, label? }].
		paths: null,
		// "auto" = stop the server for the copy unless the game can save on command;
		// "stop" always stops it; "live" never does.
		mode: "auto",
		// null = the panel-wide setting.
		keepCount: null,
		keepDays: null,
	}),
});

export async function initServerOptions() {
	stored = (await readJson(FILE, {})) ?? {};
}

const merge = (name) => {
	const own = stored[name] ?? {};
	return { ...OPTION_DEFAULTS, ...own, backup: { ...OPTION_DEFAULTS.backup, ...(own.backup ?? {}) } };
};

export function getOptions(name) {
	return merge(name);
}

/** Shallow-merges top-level keys; `backup` is merged one level down. */
export function setOptions(name, patch) {
	return enqueue(async () => {
		const current = stored[name] ?? {};
		const next = { ...current, ...patch };
		if (patch.backup) next.backup = { ...(current.backup ?? {}), ...patch.backup };
		stored = { ...stored, [name]: next };
		await writeJsonAtomic(FILE, stored);
		return merge(name);
	});
}

export function forgetOptions(name) {
	return enqueue(async () => {
		if (!(name in stored)) return;
		const { [name]: _gone, ...rest } = stored;
		stored = rest;
		await writeJsonAtomic(FILE, stored);
	});
}

export const serverOptionsFile = FILE;

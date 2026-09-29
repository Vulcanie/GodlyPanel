import path from "node:path";
import { all as allServers } from "../data/serverStore.js";
import { getConfig } from "../config/configStore.js";

// Config and launch-script editing writes to whatever absolute path the
// server entry names, with no check that it's anywhere near that server's
// folder. On a single-user local tool that was merely untidy. Now that the
// panel listens on the network and has more than one account, a bad or
// tampered entry shouldn't be able to point an editor at, say, a file in
// System32 — and the .bak the config save writes alongside its target had
// the same reach.

function normalise(p) {
	return path.resolve(String(p)).toLowerCase().replace(/[\\/]+$/, "");
}

/** Directories the panel is allowed to read and write within. */
export function allowedRoots() {
	const roots = new Set();
	const { paths: configured } = getConfig();
	if (configured.serversRoot) roots.add(normalise(configured.serversRoot));

	// Imported servers legitimately live outside the configured root — their
	// own install and working directories are what make them reachable.
	for (const server of allServers()) {
		for (const key of ["installDir", "workingDir"]) {
			if (server[key]) roots.add(normalise(server[key]));
		}
	}
	return [...roots];
}

/**
 * True when `candidate` sits inside one of the allowed roots.
 * Compares resolved paths, so ".." segments can't walk out.
 */
export function isWithinAllowedRoots(candidate, roots = allowedRoots()) {
	if (!candidate) return false;
	const target = normalise(candidate);
	return roots.some((root) => target === root || target.startsWith(root + path.sep));
}

export function assertWithinAllowedRoots(candidate) {
	if (!isWithinAllowedRoots(candidate)) {
		const err = new Error(
			"That file is outside the folders GodlyPanel manages, so it wasn't touched.",
		);
		err.code = "path_not_allowed";
		throw err;
	}
	return candidate;
}

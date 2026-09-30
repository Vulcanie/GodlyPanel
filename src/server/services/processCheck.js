import { execFile } from "node:child_process";

// One `tasklist` for everyone. This used to spawn a filtered tasklist per
// process-detected server per poll — six or seven spawns at ~140ms each, every
// cycle. A single unfiltered listing is ~300ms and answers all of them, and
// the snapshot is shared for a moment so servers checked in the same cycle
// (or a stop routine polling for exit) don't each pay for their own.
const SNAPSHOT_TTL_MS = 1500;
let cached = null;

function takeSnapshot() {
	return new Promise((resolve) => {
		// execFile, no shell: the image name never gets interpolated into a
		// command line, so a hostile or mistyped processName can't inject one.
		execFile(
			"tasklist",
			["/FO", "CSV", "/NH"],
			{ windowsHide: true, timeout: 8000, maxBuffer: 16 * 1024 * 1024 },
			(error, stdout) => {
				if (error) {
					console.warn("[process-check] tasklist failed:", error.message);
					return resolve(null);
				}
				const names = new Set();
				for (const line of stdout.split("\n")) {
					const match = line.match(/^"([^"]*)"/);
					if (match) names.add(match[1].toLowerCase());
				}
				resolve(names);
			},
		);
	});
}

function snapshot(fresh = false) {
	const now = Date.now();
	if (fresh || !cached || now - cached.at > SNAPSHOT_TTL_MS) {
		cached = { at: now, names: takeSnapshot() };
	}
	return cached.names;
}

/**
 * True if a process with this image name is running. Never throws.
 * `fresh` skips the shared snapshot, for a decision that mustn't act on
 * a reading up to a couple of seconds old.
 */
export async function checkProcess(processName, { fresh = false } = {}) {
	// A server set to process-detection without a processName is simply
	// undetectable, not a reason to bring the panel down.
	if (typeof processName !== "string" || processName.trim() === "") return false;

	const names = await snapshot(fresh);
	if (!names) return false;

	// The CSV listing has the full image name (only its table view cuts names to 25
	// characters). Unreal servers have long ones, e.g. RSDragonwildsServer-Win64-Shipping.exe,
	// which a 25-character comparison never matched. The short form is also accepted in case
	// another Windows build does cut them.
	const wanted = processName.trim().toLowerCase();
	return names.has(wanted) || (wanted.length > 25 && names.has(wanted.slice(0, 25)));
}

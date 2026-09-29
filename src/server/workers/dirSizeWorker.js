import { parentPort, workerData } from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";

// Runs off the main thread on purpose: recursing an ARK install is hundreds
// of thousands of entries, and doing that inline stalls the event loop for
// seconds — which means stalled polling and stalled live updates.

const MAX_ENTRIES = 2_000_000;

function measure(root) {
	let bytes = 0;
	let files = 0;
	let entries = 0;
	let partial = false;

	const stack = [root];
	while (stack.length > 0) {
		const dir = stack.pop();
		let handle;
		try {
			handle = fs.opendirSync(dir);
		} catch {
			continue; // Unreadable or gone; not worth failing the whole scan.
		}

		try {
			let dirent;
			while ((dirent = handle.readSync()) !== null) {
				if (++entries > MAX_ENTRIES) {
					partial = true;
					break;
				}
				// Skip junctions and symlinks so a loop can't run forever, and
				// so a linked folder isn't counted twice.
				if (dirent.isSymbolicLink()) continue;

				const full = path.join(dir, dirent.name);
				if (dirent.isDirectory()) {
					stack.push(full);
				} else if (dirent.isFile()) {
					try {
						bytes += fs.statSync(full).size;
						files++;
					} catch {
						// Vanished mid-scan (a log rotating, say).
					}
				}
			}
		} finally {
			try {
				handle.closeSync();
			} catch {
				// Already closed.
			}
		}

		if (partial) break;
	}

	return { bytes, files, partial };
}

parentPort.postMessage(measure(workerData.root));

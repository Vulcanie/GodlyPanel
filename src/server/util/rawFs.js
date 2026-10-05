import nodeFs from "node:fs";
import { createRequire } from "node:module";

// Inside the packaged app the panel runs on Electron's copy of Node, whose `fs` treats every file called *.asar as a
// folder: stat says it is a directory of size 0, and reading, copying, renaming or deleting it fails. That is right for
// the panel's own code (which lives in app.asar) and wrong for anything that handles an app.asar as a file, such as
// checking and unpacking an update. Electron's unpatched `original-fs` is the real thing; outside Electron (tests, a
// source checkout) there is no such module and the ordinary `fs` already behaves.
const require = createRequire(import.meta.url);

function pick() {
	try {
		return require("original-fs");
	} catch {
		return nodeFs;
	}
}

export const rawFs = pick();
export const rawFsp = rawFs.promises;

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { paths } from "../paths.js";

// Answers "can game servers live here?" before anything is committed to it.
// Inspecting must never leave anything behind — someone typing a path into a
// settings box shouldn't get a trail of half-made folders — so this walks up
// to the nearest folder that exists and tests that one.

const SYSTEM_DIRS = () =>
	[process.env.SystemRoot, process.env.windir]
		.filter(Boolean)
		.map((d) => path.resolve(d).toLowerCase());

const PROGRAM_DIRS = () =>
	[process.env.ProgramFiles, process.env["ProgramFiles(x86)"]]
		.filter(Boolean)
		.map((d) => path.resolve(d).toLowerCase());

function within(child, parent) {
	const c = child.toLowerCase();
	return c === parent || c.startsWith(parent + path.sep);
}

function nearestExisting(dir) {
	let current = dir;
	for (;;) {
		try {
			if (fs.statSync(current).isDirectory()) return current;
		} catch {
			// Doesn't exist (yet); try the parent.
		}
		const parent = path.dirname(current);
		if (parent === current) return null;
		current = parent;
	}
}

function canWrite(dir) {
	const probe = path.join(dir, `.ghp-write-test-${crypto.randomBytes(4).toString("hex")}`);
	try {
		fs.writeFileSync(probe, "");
		fs.rmSync(probe, { force: true });
		return true;
	} catch {
		return false;
	}
}

/** Free bytes on whichever volume `dir` is (or would be) on. */
export function freeBytesFor(dir) {
	const existing = nearestExisting(path.resolve(dir));
	if (!existing) return null;
	try {
		const stats = fs.statfsSync(existing);
		return stats.bavail * stats.bsize;
	} catch {
		return null;
	}
}

/** The folder inside the app's own data directory that's used when none is chosen. */
export function defaultServersRoot() {
	return path.join(paths.dataDir, "servers");
}

/**
 * @param {string} input  a folder path; blank means "use the default"
 * @returns {{ ok, resolved, usingDefault, exists, freeBytes, insideAppFolder, errors[], warnings[] }}
 */
export function inspectFolder(input) {
	const raw = String(input ?? "").trim();
	const usingDefault = raw === "";
	const errors = [];
	const warnings = [];

	if (!usingDefault && !path.isAbsolute(raw)) {
		return {
			ok: false,
			resolved: raw,
			usingDefault,
			exists: false,
			freeBytes: null,
			insideAppFolder: false,
			errors: ["Use a full path, like D:\\GameServers."],
			warnings,
		};
	}

	const resolved = path.resolve(usingDefault ? defaultServersRoot() : raw);
	const lower = resolved.toLowerCase();
	const insideAppFolder = within(lower, path.resolve(paths.dataDir).toLowerCase());

	if (SYSTEM_DIRS().some((d) => within(lower, d))) {
		errors.push("That's inside the Windows folder. Pick somewhere else.");
	}
	if (resolved === path.parse(resolved).root) {
		warnings.push("That's the top of a drive. A subfolder like GameServers keeps things tidy.");
	}
	if (PROGRAM_DIRS().some((d) => within(lower, d))) {
		warnings.push("Program Files is usually write-protected, so installs there tend to fail.");
	}
	if (resolved.startsWith("\\\\")) {
		warnings.push("Network shares work, but game servers run noticeably slower from them.");
	}

	const existing = nearestExisting(resolved);
	const exists = existing === resolved;
	if (!existing) {
		errors.push("That drive isn't available.");
	} else if (!canWrite(existing)) {
		errors.push(
			exists
				? "GodlyPanel can't write to that folder."
				: `The folder doesn't exist and GodlyPanel can't create it inside ${existing}.`,
		);
	}

	return {
		ok: errors.length === 0,
		resolved,
		usingDefault,
		exists,
		freeBytes: freeBytesFor(resolved),
		insideAppFolder,
		errors,
		warnings,
	};
}

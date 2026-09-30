import { execFile } from "node:child_process";
import path from "node:path";

// Zip files made and read by the tar.exe that ships with Windows 10 and 11
// (bsdtar). It streams, so a multi-gigabyte world doesn't have to fit in memory
// the way an in-process zip library would need, and it writes zip64 when a file
// or the archive is large.
//
// The full path is used on purpose: Git for Windows puts a GNU tar on PATH that
// can't write zips.

const TAR = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");

function run(args, { timeoutMs = 6 * 60 * 60 * 1000 } = {}) {
	return new Promise((resolve, reject) => {
		execFile(TAR, args, { windowsHide: true, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
			if (error) {
				const detail = (stderr || error.message).toString().trim().split("\n").slice(0, 4).join(" ");
				return reject(new Error(`tar failed: ${detail}`));
			}
			resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
		});
	});
}

/**
 * @param {string} outFile
 * @param {{ dir: string, name: string }[]} entries  each `name` is a file or folder inside `dir`
 * @param {string[]} [exclude]  entry paths (as they appear in the archive, e.g. "Saved/Logs")
 */
export async function createZip(outFile, entries, exclude = []) {
	const args = ["-a", "-c", "-f", outFile];
	for (const pattern of exclude) args.push("--exclude", pattern);
	for (const { dir, name } of entries) args.push("-C", dir, name);
	await run(args);
}

/** Every entry name in the archive, as stored. Throws if it can't be read as an archive. */
export async function listZip(file) {
	const { stdout } = await run(["-tf", file]);
	return stdout.split(/\r?\n/).filter(Boolean);
}

/** Extract the named top-level entries (and everything under them) into `destDir`. */
export async function extractZip(file, destDir, names = []) {
	await run(["-xf", file, "-C", destDir, ...names]);
}

/**
 * Names that would land outside the destination when extracted: absolute paths,
 * drive letters, or `..` segments. An archive that isn't ours (or was edited) must
 * not be able to write elsewhere.
 */
export function unsafeEntries(names) {
	return names.filter((name) => {
		const normal = name.replaceAll("\\", "/");
		return normal.startsWith("/") || /^[A-Za-z]:/.test(normal) || normal.split("/").includes("..");
	});
}

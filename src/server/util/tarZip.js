import { execFile } from "node:child_process";
import path from "node:path";
import { FORMATS } from "./archiveFormats.js";

// Zip files made and read by the tar.exe that ships with Windows 10 and 11
// (bsdtar). It streams, so a multi-gigabyte world doesn't have to fit in memory
// the way an in-process zip library would need, and it writes zip64 when a file
// or the archive is large.
//
// The full path is used on purpose: Git for Windows puts a GNU tar on PATH that
// can't write zips.

const TAR = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");

// stdout comes back as a Buffer: bsdtar writes entry names in the Windows ANSI code page, not UTF-8, so the caller decodes.
function run(args, { timeoutMs = 6 * 60 * 60 * 1000 } = {}) {
	return new Promise((resolve, reject) => {
		execFile(TAR, args, { windowsHide: true, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, encoding: "buffer" }, (error, stdout, stderr) => {
			const errorText = stderr.toString();
			if (error) {
				const detail = (errorText || error.message).trim().split("\n").slice(0, 4).join(" ");
				return reject(new Error(`tar failed: ${detail}`));
			}
			resolve({ stdout, stderr: errorText });
		});
	});
}

// tar reads any argument that starts with a dash as an option, and a few of them run programs (--use-compress-program). The names
// handed to it come from folders chosen in the panel and from the record inside a backup (which may have been tampered with), so
// a name like that is refused rather than passed on.
function assertPlainNames(names) {
	for (const name of names) {
		if (typeof name !== "string" || name === "" || name.startsWith("-")) {
			throw new Error(`"${String(name).slice(0, 60)}" can't be used as a name in an archive: names starting with a dash are read as options by tar.`);
		}
	}
}

/**
 * @param {string} outFile
 * @param {{ dir: string, name: string }[]} entries  each `name` is a file or folder inside `dir`
 * @param {string[]} [exclude]  entry paths (as they appear in the archive, e.g. "Saved/Logs")
 */
export async function createZip(outFile, entries, exclude = []) {
	assertPlainNames(entries.map((e) => e.name));
	const args = ["-a", "-c", "-f", outFile];
	for (const pattern of exclude) args.push("--exclude", pattern);
	for (const { dir, name } of entries) args.push("-C", dir, name);
	await run(args);
}

/** Every entry name in the archive, as stored. Throws if it can't be read as an archive. */
export async function listZip(file) {
	const { stdout } = await run(["-tf", file]);
	return stdout.toString().split(/\r?\n/).filter(Boolean);
}

/** Extract the named top-level entries (and everything under them) into `destDir`. */
export async function extractZip(file, destDir, names = []) {
	assertPlainNames(names);
	await run(["-xf", file, "-C", destDir, ...names]);
}

/**
 * Writes an archive in the given format (see archiveFormats.js). Unlike createZip this never lets bsdtar pick the format
 * from the file name, so the format and level are exactly what was asked for. Throws for an unknown format or level.
 */
export async function createArchive(outFile, entries, { format = "zip", level = "balanced", exclude = [] } = {}) {
	if (!Object.hasOwn(FORMATS, format)) throw new Error(`unknown archive format "${format}"`);
	const formatArgs = FORMATS[format].args(level);
	assertPlainNames(entries.map((e) => e.name));
	const args = ["-c", "-f", outFile, ...formatArgs];
	for (const pattern of exclude) args.push("--exclude", pattern);
	for (const { dir, name } of entries) args.push("-C", dir, name);
	await run(args);
}

/**
 * Every entry name in an archive of any format bsdtar reads, as stored. Throws if it can't be read as an archive.
 * Names are decoded as Windows-1252 (the ANSI code page bsdtar writes in on this machine). A name outside it can't be
 * made by createArchive in the first place, and ASCII decodes the same in any code page, so the "../" check is unaffected.
 */
export async function listArchive(file) {
	const { stdout } = await run(["-tf", file]);
	return new TextDecoder("windows-1252").decode(stdout).split(/\r?\n/).filter(Boolean);
}

// One line of bsdtar's verbose listing: the mode, the fields in between (links, owner, group, size), the date, then the name. The
// name is whatever follows the date, so names with spaces are kept whole.
const VERBOSE_LINE = /^(\S+) +(.+?) +([A-Z][a-z]{2} +\d{1,2} +(?:\d{1,2}:\d{2}|\d{4})) (.*)$/;

/**
 * Every entry in an archive with its kind and size: `type` is "file", "dir", or "other" for anything that is neither (a symbolic or
 * hard link, a device, a pipe). Symlinks and hard links are reported as "other" so a caller can refuse them; their names have the
 * link text taken off. Throws if the archive can't be read or a line of the listing isn't understood.
 */
export async function listArchiveDetailed(file) {
	const { stdout } = await run(["-tvf", file]);
	const lines = new TextDecoder("windows-1252").decode(stdout).split(/\r?\n/).filter(Boolean);
	return lines.map((line) => {
		const m = VERBOSE_LINE.exec(line);
		if (!m) throw new Error(`could not read a line of the archive listing: "${line.slice(0, 80)}"`);
		const [, mode, middle, , rawName] = m;
		const kind = mode.startsWith("-") ? "file" : mode.startsWith("d") ? "dir" : "other";
		const size = kind === "other" ? 0 : Number(middle.split(/\s+/).at(-1));
		const name = kind === "other" ? rawName.replace(/ (?:->|link to) .*$/, "") : rawName;
		return { name, type: kind, size: Number.isFinite(size) ? size : 0 };
	});
}

/**
 * Extracts the named top-level entries (or everything, if none are named) into `destDir`, which must exist. The archive is
 * listed first: if any entry would land outside `destDir`, this throws and extracts nothing.
 */
export async function extractArchive(file, destDir, names = []) {
	assertPlainNames(names);
	const unsafe = unsafeEntries(await listArchive(file));
	if (unsafe.length) {
		throw new Error(`${path.basename(file)} holds an entry outside its own folder ("${unsafe[0].slice(0, 80)}"), so nothing was extracted.`);
	}
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

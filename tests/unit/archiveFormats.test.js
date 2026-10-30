import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ALL_EXTENSIONS, FORMATS, formatForFile, splitArchiveName } from "../../src/server/util/archiveFormats.js";
import { createArchive, listArchive, extractArchive } from "../../src/server/util/tarZip.js";

// The format registry and the create/list/extract wrappers around the Windows tar (bsdtar). The tar tests are marked; the name
// and format checks run anywhere.

const onWindows = process.platform === "win32";
const TAR = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
const FORMAT_NAMES = ["zip", "zstd", "xz"];
const KB = 1024;

let root;
before(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-archive-"));
});
after(() => {
	if (root) fs.rmSync(root, { recursive: true, force: true });
});

describe("format names and levels", () => {
	it("tells a format from a file name by its ending, ignoring case", () => {
		const table = {
			"a.tar.zst": "zstd",
			"a.zip": "zip",
			"a.tar.xz": "xz",
			"a.tar": null,
			zip: null,
			"A.TAR.ZST": "zstd",
			"b.ZIP": "zip",
			"c.TAR.XZ": "xz",
			"x.tar.zst.bak": null,
		};
		for (const [name, want] of Object.entries(table)) assert.equal(formatForFile(name), want, name);
		assert.equal(formatForFile(undefined), null);
	});

	it("splits a backup file name into its stem and format", () => {
		assert.deepEqual(splitArchiveName("a.tar.zst"), { stem: "a", format: "zstd" });
		assert.deepEqual(splitArchiveName("a.zip"), { stem: "a", format: "zip" });
		assert.deepEqual(splitArchiveName("a.tar.xz"), { stem: "a", format: "xz" });
		assert.deepEqual(splitArchiveName("B.ZIP"), { stem: "B", format: "zip" });
		assert.deepEqual(splitArchiveName("Mixed-Case.TAR.ZST"), { stem: "Mixed-Case", format: "zstd" });
		assert.equal(splitArchiveName("x.json"), null);
		assert.equal(splitArchiveName("x.zip.partial"), null);
		assert.equal(splitArchiveName(undefined), null);
	});

	it("gives an empty stem for a bare extension, so callers can skip it", () => {
		assert.deepEqual(splitArchiveName(".zip"), { stem: "", format: "zip" });
	});

	it("lists the three endings", () => {
		assert.deepEqual(ALL_EXTENSIONS, [".zip", ".tar.zst", ".tar.xz"]);
	});

	it("throws a plain Error for an unknown format, and for an unknown level", async () => {
		await assert.rejects(createArchive(path.join(root, "x.rar"), [{ dir: root, name: "a" }], { format: "rar" }), /unknown archive format "rar"/);
		await assert.rejects(createArchive(path.join(root, "x.zip"), [{ dir: root, name: "a" }], { format: "zip", level: "ultra" }), /unknown compression level "ultra"/);
		assert.throws(() => FORMATS.zip.args("ultra"), /unknown compression level/);
		assert.ok(!fs.existsSync(path.join(root, "x.rar")));
	});

	it("builds the bsdtar options for each format and level", () => {
		assert.deepEqual(FORMATS.zip.args("fast"), ["--format", "zip", "--options", "zip:compression-level=1"]);
		assert.deepEqual(FORMATS.zip.args("max"), ["--format", "zip", "--options", "zip:compression-level=9"]);
		assert.deepEqual(FORMATS.zstd.args("balanced"), ["--zstd", "--options", "zstd:compression-level=9"]);
		assert.deepEqual(FORMATS.zstd.args("max"), ["--zstd", "--options", "zstd:compression-level=19"]);
		assert.deepEqual(FORMATS.xz.args("fast"), ["--xz", "--options", "xz:compression-level=1"]);
		assert.deepEqual(FORMATS.xz.args("max"), ["--xz", "--options", "xz:compression-level=9"]);
	});
});

describe("names handed to the archive tools", { skip: !onWindows }, () => {
	it("refuses a name starting with a dash for every format, before tar runs", async () => {
		for (const format of FORMAT_NAMES) {
			const out = path.join(root, `dash${FORMATS[format].ext}`);
			await assert.rejects(createArchive(out, [{ dir: root, name: "-evil" }], { format }), /read as options/, format);
			assert.ok(!fs.existsSync(out), format);
		}
	});

	it("refuses a name starting with a dash given to extractArchive", async () => {
		await assert.rejects(extractArchive(path.join(root, "missing.zip"), root, ["--use-compress-program=calc"]), /read as options/);
	});
});

/** Runs the Windows tar with the given arguments. */
function tar(args) {
	return new Promise((resolve, reject) => {
		execFile(TAR, args, { windowsHide: true }, (error, stdout, stderr) => {
			if (error) return reject(new Error(`tar failed: ${stderr || error.message}`));
			resolve();
		});
	});
}

/** A folder with a nested folder, an empty folder, names with spaces and unicode, a repetitive file and a random one. */
function buildTree(dir) {
	const src = path.join(dir, "src");
	fs.mkdirSync(path.join(src, "nested", "deeper"), { recursive: true });
	fs.mkdirSync(path.join(src, "empty"));
	fs.writeFileSync(path.join(src, "nested", "deeper", "a file with a space.txt"), "spaces in the name");
	fs.writeFileSync(path.join(src, "wörld café.txt"), "unicode in the name");
	fs.writeFileSync(path.join(src, "repeated.txt"), Buffer.alloc(200 * KB, "repeated text, repeated text\n"));
	fs.writeFileSync(path.join(src, "random.bin"), crypto.randomBytes(50 * KB));
	return src;
}

// "☃" can't be used here: bsdtar.exe takes names in the Windows ANSI code page, so a character outside it (as ☃ is) makes
// the file unopenable. ö and é are inside it.
const TOP_ENTRIES = ["nested", "empty", "wörld café.txt", "repeated.txt", "random.bin"];
const FILES = ["nested/deeper/a file with a space.txt", "wörld café.txt", "repeated.txt", "random.bin"];

describe("round trips with the Windows tar", { skip: !onWindows }, () => {
	for (const format of FORMAT_NAMES) {
		for (const level of ["fast", "max"]) {
			it(`round-trips a tree as ${format} at ${level}`, async () => {
				const work = path.join(root, `rt-${format}-${level}`);
				const src = buildTree(work);
				const archive = path.join(work, `out${FORMATS[format].ext}`);
				await createArchive(archive, TOP_ENTRIES.map((name) => ({ dir: src, name })), { format, level });

				const names = (await listArchive(archive)).map((n) => n.replaceAll("\\", "/"));
				for (const file of FILES) assert.ok(names.includes(file), `${file} is listed: ${names.join(", ")}`);
				assert.ok(names.some((n) => n.replace(/\/$/, "") === "empty"), "the empty folder is listed");

				const dest = path.join(work, "dest");
				fs.mkdirSync(dest);
				await extractArchive(archive, dest);
				for (const file of FILES) {
					assert.ok(fs.readFileSync(path.join(src, file)).equals(fs.readFileSync(path.join(dest, file))), `${format} ${level}: ${file} is byte-identical`);
				}
				assert.ok(fs.statSync(path.join(dest, "empty")).isDirectory(), "the empty folder exists after extracting");
			});
		}
	}
});

describe("archives holding an entry outside their folder", { skip: !onWindows }, () => {
	for (const format of FORMAT_NAMES) {
		it(`refuses a ${format} archive with a ../ entry, and extracts nothing`, async () => {
			const work = path.join(root, `evil-${format}`);
			const stage = path.join(work, "stage");
			fs.mkdirSync(path.join(stage, "sub"), { recursive: true });
			fs.writeFileSync(path.join(stage, "evil.txt"), "evil");
			fs.writeFileSync(path.join(stage, "sub", "fine.txt"), "fine");

			// Named from inside "sub", "../evil.txt" is stage\evil.txt, stored with its "../" kept (bsdtar does not strip it here).
			const archive = path.join(work, `evil${FORMATS[format].ext}`);
			await tar(["-c", "-P", "-f", archive, ...FORMATS[format].args("balanced"), "-C", path.join(stage, "sub"), "fine.txt", "../evil.txt"]);
			assert.ok((await listArchive(archive)).includes("../evil.txt"), "the archive really holds the ../ entry");

			const dest = path.join(work, "dest");
			fs.mkdirSync(dest);
			await assert.rejects(extractArchive(archive, dest), /outside its own folder/);
			assert.deepEqual(fs.readdirSync(dest), [], "nothing was extracted, not even the good entry");
			assert.ok(!fs.existsSync(path.join(work, "evil.txt")), "the file did not land outside the destination");
		});
	}
});

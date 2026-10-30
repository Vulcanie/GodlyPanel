// Measures how big a folder gets under each archive format and level this machine's tar.exe can write, and how long each one takes.
// Run: node scripts/measure-compression.mjs <folder> [--keep]
//      --keep  leave the archives in the OS temp folder instead of deleting them, and print where they are.
// Nothing here changes what the panel does. It exists so the backup format can be picked from real numbers once a real save is available.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The full path is used on purpose, the same as src/server/util/tarZip.js: Git for Windows puts a GNU tar on PATH that can't write zips.
const TAR = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");

// Option strings checked against this machine's bsdtar (3.8.9). A string bsdtar rejects shows as a failed row; the other rows still run.
export const VARIANTS = [
	{ id: "zip-6", label: "zip level 6", ext: "zip", options: ["--format", "zip", "--options", "zip:compression-level=6"] },
	{ id: "zip-9", label: "zip level 9", ext: "zip", options: ["--format", "zip", "--options", "zip:compression-level=9"] },
	{ id: "zstd-3", label: "zstd level 3", ext: "tar.zst", options: ["--zstd", "--options", "zstd:compression-level=3"] },
	{ id: "zstd-9", label: "zstd level 9", ext: "tar.zst", options: ["--zstd", "--options", "zstd:compression-level=9"] },
	{ id: "zstd-19", label: "zstd level 19", ext: "tar.zst", options: ["--zstd", "--options", "zstd:compression-level=19"] },
	{ id: "xz-6", label: "xz level 6", ext: "tar.xz", options: ["--xz", "--options", "xz:compression-level=6"] },
	{ id: "7zip", label: "7zip", ext: "7z", options: ["--format", "7zip"] },
];

/** Total size of every regular file under `dir`. Symlinks are skipped so a link can't pull in files from outside the folder. */
export function folderBytes(dir) {
	let total = 0;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) total += folderBytes(full);
		else if (entry.isFile()) total += fs.statSync(full).size;
	}
	return total;
}

function runTar(args) {
	return new Promise((resolve, reject) => {
		execFile(TAR, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (error, _stdout, stderr) => {
			if (error) {
				const detail = (stderr || error.message).toString().trim().split("\n").slice(0, 4).join(" ");
				return reject(new Error(`tar failed: ${detail}`));
			}
			resolve();
		});
	});
}

/** Builds one archive of `folder` with `variant` inside `workDir`. Returns a result row; a failure is kept on the row, not thrown. */
export async function measureVariant(variant, folder, workDir, rawBytes) {
	const outFile = path.join(workDir, `${variant.id}.${variant.ext}`);
	const started = performance.now();
	try {
		await runTar(["-c", "-f", outFile, ...variant.options, "-C", folder, "."]);
		const seconds = (performance.now() - started) / 1000;
		return { variant: variant.label, bytes: fs.statSync(outFile).size, raw: rawBytes, seconds };
	} catch (error) {
		return { variant: variant.label, raw: rawBytes, error: error.message };
	}
}

/** Runs every variant one after another (so the timings don't compete). The temp folder is removed unless `keep` is set. */
export async function measure(folder, { keep = false } = {}) {
	const rawBytes = folderBytes(folder);
	const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "godly-compress-"));
	try {
		const rows = [];
		for (const variant of VARIANTS) rows.push(await measureVariant(variant, folder, workDir, rawBytes));
		return { rows, rawBytes, workDir };
	} finally {
		if (!keep) fs.rmSync(workDir, { recursive: true, force: true });
	}
}

// Archive size as a share of the raw folder size. Small shares get one decimal place so 0.4% doesn't show as 0%.
function formatRatio(bytes, raw) {
	if (!raw) return "-";
	const pct = (bytes / raw) * 100;
	return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

/**
 * Turns result rows into table lines, header first. Rows that worked come first, smallest archive first;
 * a failed row goes after them with its error in the last column.
 * Each row: { variant, bytes, raw, seconds } or { variant, raw, error }.
 */
export function describeResults(rows) {
	const worked = rows.filter((row) => row.error === undefined).sort((a, b) => a.bytes - b.bytes);
	const failed = rows.filter((row) => row.error !== undefined);
	const cells = [...worked, ...failed].map((row) =>
		row.error !== undefined
			? [row.variant, "-", "-", "-", `failed: ${row.error}`]
			: [row.variant, String(row.bytes), formatRatio(row.bytes, row.raw), row.seconds.toFixed(2), ""],
	);
	const header = ["variant", "bytes", "ratio", "seconds", "note"];
	const table = [header, ...cells];
	const widths = header.map((_, col) => Math.max(...table.map((line) => line[col].length)));
	const render = (line) => line.map((cell, col) => cell.padEnd(widths[col])).join(" | ").trimEnd();
	const divider = widths.map((width) => "-".repeat(width)).join("-+-");
	return [render(header), divider, ...cells.map(render)];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	const keep = args.includes("--keep");
	const positional = args.filter((arg) => arg !== "--keep");
	if (positional.length !== 1) {
		console.error("Usage: node scripts/measure-compression.mjs <folder> [--keep]");
		process.exit(2);
	}
	const folder = path.resolve(positional[0]);
	if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
		console.error(`Not a folder: ${folder}`);
		process.exit(2);
	}
	const { rows, rawBytes, workDir } = await measure(folder, { keep });
	console.log(`Folder: ${folder}`);
	console.log(`Raw size: ${rawBytes} bytes`);
	console.log("");
	for (const line of describeResults(rows)) console.log(line);
	if (keep) console.log(`\nArchives kept in ${workDir}`);
}

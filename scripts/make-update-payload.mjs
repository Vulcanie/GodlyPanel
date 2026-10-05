// Builds what the in-app updater downloads, from the packaged app (run after `npm run package`):
//
//   dist/GodlyPanel-<version>-app.zip   the app's own files (the `resources` folder: app.asar, scripts, templates) and an
//                                       update-manifest.json listing every file with its SHA-256. A few MB, against ~128 MB
//                                       for the whole package, and enough whenever Electron itself hasn't changed.
//   dist/update-info.json               the version and the Electron it was built on, for scripts/release-manifest.mjs
//
// Options (for tests that make a second "release" out of a first build): --unpacked <folder holding resources/>,
// --out <folder for the zip>, --version, --electron.
//
// The updater checks the zip against a checksum published with the release, then checks every file in it against the
// manifest inside, so a damaged or altered archive is caught before anything is replaced.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createZip } from "../src/server/util/tarZip.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const option = (name, fallback) => {
	const at = process.argv.indexOf(`--${name}`);
	return at > 0 ? process.argv[at + 1] : fallback;
};
const dist = path.resolve(option("out", path.join(root, "dist")));
const unpacked = path.resolve(option("unpacked", path.join(dist, "win-unpacked")));
const version = option("version", JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version);
const electron = option("electron", JSON.parse(fs.readFileSync(path.join(root, "node_modules", "electron", "package.json"), "utf8")).version);

if (!fs.existsSync(path.join(unpacked, "resources", "app.asar"))) {
	console.error(`No packaged app at ${unpacked}. Run "npm run package" first.`);
	process.exit(1);
}

const files = [];
(function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full);
		else if (entry.isFile()) {
			const bytes = fs.readFileSync(full);
			files.push({ path: path.relative(unpacked, full).replaceAll("\\", "/"), size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
		}
	}
})(path.join(unpacked, "resources"));
files.sort((a, b) => (a.path < b.path ? -1 : 1));

const manifest = { format: 1, version, electron, files };
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "gp-payload-"));
const zip = path.join(dist, `GodlyPanel-${version}-app.zip`);
try {
	fs.writeFileSync(path.join(scratch, "update-manifest.json"), JSON.stringify(manifest, null, 2));
	fs.rmSync(zip, { force: true });
	await createZip(zip, [{ dir: unpacked, name: "resources" }, { dir: scratch, name: "update-manifest.json" }]);
} finally {
	fs.rmSync(scratch, { recursive: true, force: true });
}
fs.writeFileSync(path.join(dist, "update-info.json"), JSON.stringify({ version, electron, appZip: path.basename(zip) }, null, 2));
console.log(`${path.basename(zip)}: ${files.length} files, ${(fs.statSync(zip).size / 1024 / 1024).toFixed(1)} MB (Electron ${electron})`);

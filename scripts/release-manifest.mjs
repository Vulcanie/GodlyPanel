// Writes dist/update-manifest.json, the file the in-app updater reads first: which two downloads belong to this
// release (the whole package and the small app-only update), how big each is, their SHA-256, and the Electron version
// the app-only one was built on. Run by the release workflow once the zips are final (after signing, if any), so the
// checksums are of exactly what is attached to the release.
//
//   node scripts/release-manifest.mjs [dist-folder]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] ?? "dist");
const info = JSON.parse(fs.readFileSync(path.join(dist, "update-info.json"), "utf8"));
const describe = (name) => {
	const file = path.join(dist, name);
	return { name, size: fs.statSync(file).size, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") };
};
const full = `GodlyPanel-${info.version}-win.zip`;
if (!fs.existsSync(path.join(dist, full))) throw new Error(`No ${full} in ${dist}.`);
const manifest = { format: 1, version: info.version, electron: info.electron, full: describe(full), app: describe(info.appZip) };
fs.writeFileSync(path.join(dist, "update-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));

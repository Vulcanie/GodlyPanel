import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import AdmZip from "adm-zip";

// A modpack arrives as a zip from an administrator's browser, then asks CurseForge for its mods. Neither the zip, the id that comes
// back with the create-server request, nor CurseForge's answer is allowed to reach outside the folders the panel keeps them in.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-modpack-"));
let stand;
const served = new Map();

stand = http.createServer((req, res) => {
	if (req.method === "POST" && req.url === "/v1/mods/files") {
		let body = "";
		req.on("data", (c) => (body += c));
		req.on("end", () => {
			const { fileIds } = JSON.parse(body);
			const data = fileIds.filter((id) => served.has(id)).map((id) => ({ id, ...served.get(id).info(stand.address().port) }));
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({ data }));
		});
		return;
	}
	const match = /^\/files\/(\d+)$/.exec(req.url);
	if (match && served.has(Number(match[1]))) return res.end(served.get(Number(match[1])).body);
	res.statusCode = 404;
	res.end();
});
await new Promise((resolve) => stand.listen(0, "127.0.0.1", resolve));
process.env.GHP_DATA_DIR = dir;
process.env.GHP_CURSEFORGE_API = `http://127.0.0.1:${stand.address().port}/v1`;
const secrets = await import("../../src/server/config/secretsStore.js");
const { ensureDataDirs, paths } = await import("../../src/server/paths.js");
ensureDataDirs();
await secrets.initSecrets();
await secrets.patchSecrets({ curseForgeApiKey: "test-key" });
const modpack = await import("../../src/server/services/modpackService.js");

const manifestZip = (extra = (zip) => zip) => {
	const zip = new AdmZip();
	zip.addFile("manifest.json", Buffer.from(JSON.stringify({ name: "Pack", minecraft: { version: "1.20.1", modLoaders: [{ id: "forge-47.1.0", primary: true }] }, files: [], overrides: "overrides" })));
	zip.addFile("overrides/config/a.toml", Buffer.from("a=1"));
	return extra(zip).toBuffer();
};

after(async () => {
	await new Promise((resolve) => stand.close(resolve));
	fs.rmSync(dir, { recursive: true, force: true });
});

/** A zip with entries named exactly as given. (adm-zip tidies a name such as ../../x when it is added, which is just what a hostile zip would not do.) */
function rawZip(entries) {
	const parts = [];
	const central = [];
	let offset = 0;
	for (const [name, data] of entries) {
		const nb = Buffer.from(name);
		const crc = zlib.crc32(data) >>> 0;
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nb.length, 26);
		parts.push(local, nb, data);
		const entry = Buffer.alloc(46);
		entry.writeUInt32LE(0x02014b50, 0);
		entry.writeUInt16LE(20, 4);
		entry.writeUInt16LE(20, 6);
		entry.writeUInt32LE(crc, 16);
		entry.writeUInt32LE(data.length, 20);
		entry.writeUInt32LE(data.length, 24);
		entry.writeUInt16LE(nb.length, 28);
		entry.writeUInt32LE(offset, 42);
		central.push(entry, nb);
		offset += 30 + nb.length + data.length;
	}
	const directory = Buffer.concat(central);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...parts, directory, end]);
}

describe("modpack uploads", () => {
	it("are kept under an id the panel made, and no other id is followed", async () => {
		const made = await modpack.extractModpackZip(manifestZip());
		assert.match(made.uploadId, /^modpack-\d+-[0-9a-f]{8}$/);
		assert.equal(modpack.getUploadManifest(made.uploadId).packName, "Pack");

		// An id that is a path would look in (and, at the end of a creation, delete) some other folder.
		const outside = path.join(paths.uploadsDir, "..", "elsewhere");
		fs.mkdirSync(path.join(outside, "extracted"), { recursive: true });
		fs.writeFileSync(path.join(outside, "extracted", "manifest.json"), "{}");
		assert.throws(() => modpack.getUploadManifest("../elsewhere"), /isn't valid/);
		await modpack.cleanupUpload("../elsewhere");
		await modpack.cleanupUpload("..");
		assert.ok(fs.existsSync(path.join(outside, "extracted", "manifest.json")), "nothing outside the uploads folder was removed");
		await assert.rejects(modpack.installOverrides("../elsewhere", { overridesFolder: "overrides" }, path.join(dir, "dest")), /isn't valid/);

		await modpack.cleanupUpload(made.uploadId);
		assert.equal(fs.existsSync(path.join(paths.uploadsDir, made.uploadId)), false);
	});

	it("leave nothing behind when the zip would write outside its folder, isn't a modpack, or is a bomb", async () => {
		const before = fs.readdirSync(paths.uploadsDir);
		const slip = rawZip([["manifest.json", Buffer.from("{}")], ["../../evil.txt", Buffer.from("x")]]);
		await assert.rejects(modpack.extractModpackZip(slip), /Unsafe zip entry/);
		await assert.rejects(modpack.extractModpackZip(Buffer.from("not a zip at all")));
		const notAPack = new AdmZip();
		notAPack.addFile("readme.txt", Buffer.from("hello"));
		await assert.rejects(modpack.extractModpackZip(notAPack.toBuffer()), /manifest\.json/);
		const wrongFolder = new AdmZip();
		wrongFolder.addFile("manifest.json", Buffer.from(JSON.stringify({ minecraft: { version: "1", modLoaders: [{ id: "forge-1" }] }, overrides: "../../.." })));
		await assert.rejects(modpack.extractModpackZip(wrongFolder.toBuffer()), /overrides folder/);
		assert.deepEqual(fs.readdirSync(paths.uploadsDir), before, "no half-extracted upload is left");
		assert.equal(fs.existsSync(path.join(dir, "evil.txt")), false);

		// The sizes a zip declares are checked before it is unpacked.
		// (A single entry's size is a 32-bit number, so it takes a few of them to claim more than a modpack ever holds.)
		const fake = new AdmZip();
		for (const name of ["a.bin", "b.bin", "c.bin"]) fake.addFile(name, Buffer.from("x"));
		for (const entry of fake.getEntries()) entry.header.size = 4_000_000_000;
		assert.throws(() => modpack.assertSafeEntries(fake, path.join(dir, "x")), /far more than a modpack/);
	});
});

describe("mods named by CurseForge", () => {
	it("are only ever written under their own file name, and fetched with a limit", async () => {
		served.set(1, { info: (port) => ({ fileName: "good.jar", gameVersions: ["Server"], downloadUrl: `http://127.0.0.1:${port}/files/1` }), body: "good" });
		served.set(2, { info: (port) => ({ fileName: "../../escaped.jar", gameVersions: ["Server"], downloadUrl: `http://127.0.0.1:${port}/files/2` }), body: "bad" });
		served.set(3, { info: (port) => ({ fileName: "sub\\dir.jar", gameVersions: ["Server"], downloadUrl: `http://127.0.0.1:${port}/files/3` }), body: "bad" });
		served.set(4, { info: () => ({ fileName: "gone.jar", gameVersions: ["Server"], downloadUrl: "http://127.0.0.1:1/files/4" }), body: "" });
		const mods = path.join(dir, "server", "mods");
		const result = await modpack.resolveAndDownloadMods({ files: [1, 2, 3, 4].map((id) => ({ projectID: id, fileID: id })) }, mods);
		assert.deepEqual(result.downloaded, ["good.jar"]);
		assert.equal(result.failed.length, 3);
		assert.deepEqual(fs.readdirSync(mods), ["good.jar"], "no partial file is left either");
		assert.equal(fs.existsSync(path.join(dir, "escaped.jar")), false);
		assert.equal(fs.existsSync(path.join(dir, "server", "escaped.jar")), false);
	});

	it("tells a plain file name from a path", () => {
		for (const ok of ["a.jar", "Some Mod-1.2+mc1.20.jar", "x(1).jar"]) assert.equal(modpack.isPlainFileName(ok), true, ok);
		for (const bad of ["", ".", "..", "../a.jar", "a/b.jar", "a\\b.jar", "C:evil.jar", "a\u0000.jar", "x".repeat(201), undefined, 5]) assert.equal(modpack.isPlainFileName(bad), false, String(bad));
	});
});

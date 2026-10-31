import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { windowsOnly } from "../helpers/winEmulation.js";

// A mod archive is unpacked into the mods folder, so the panel checks what it claims before it writes anything, and what it
// actually holds after. Each case goes through installUpload, the one place a file lands in a mods folder.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-archive-"));
const tmp = path.join(root, "tmp");
fs.mkdirSync(tmp, { recursive: true });
// Scratch folders the mod code makes come from the temp folder; keep this test's own, so it can check nothing is left behind.
process.env.TMPDIR = tmp;
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.GHP_DATA_DIR = path.join(root, "data");

const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const { initSecrets } = await import("../../src/server/config/secretsStore.js");
const { installUpload, ModError } = await import("../../src/server/services/modService.js");

/**
 * A zip with exactly the entries given, unchecked. Each value is the text of the entry, or { text, declared } to say the
 * size the directory declares, which is what a forged archive gets wrong.
 */
function rawZip(entries) {
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const [name, value] of Object.entries(entries)) {
		const { text, declared } = typeof value === "string" ? { text: value } : value;
		const data = Buffer.from(text);
		const size = declared ?? data.length;
		const nameBytes = Buffer.from(name);
		const crc = zlib.crc32(data);
		const local = Buffer.alloc(30 + nameBytes.length);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(size, 22);
		local.writeUInt16LE(nameBytes.length, 26);
		nameBytes.copy(local, 30);
		const central = Buffer.alloc(46 + nameBytes.length);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt32LE(crc, 16);
		central.writeUInt32LE(data.length, 20);
		central.writeUInt32LE(size, 24);
		central.writeUInt16LE(nameBytes.length, 28);
		central.writeUInt32LE(offset, 42);
		nameBytes.copy(central, 46);
		locals.push(local, data);
		centrals.push(central);
		offset += local.length + data.length;
	}
	const directory = Buffer.concat(centrals);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(centrals.length, 8);
	end.writeUInt16LE(centrals.length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, directory, end]);
}

let fileCount = 0;
function zipOnDisk(buffer) {
	fileCount += 1;
	const file = path.join(root, `upload-${fileCount}.zip`);
	fs.writeFileSync(file, buffer);
	return file;
}

describe("mod archives are checked before and after they unpack", windowsOnly("archives are made and read by Windows' real tar"), () => {
	const dataDir = () => process.env.GHP_DATA_DIR;
	// 7 Days to Die takes a zip; its mods folder is "Mods" under the server's working folder.
	const serverFolder = () => path.join(dataDir(), "servers", "seven");
	const modsDir = () => path.join(serverFolder(), "Mods");
	const server = () => ({ name: "Seven", type: "7days", installDir: serverFolder(), workingDir: serverFolder() });
	const modsListing = () => (fs.existsSync(modsDir()) ? fs.readdirSync(modsDir()) : []);

	before(async () => {
		await initConfig();
		await initSecrets();
		fs.mkdirSync(serverFolder(), { recursive: true });
	});
	after(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("installs an ordinary archive", async () => {
		const result = await installUpload(server(), "Fine.zip", zipOnDisk(rawZip({ "Fine/ModInfo.xml": "<x/>", "Fine/Config/a.xml": "<a/>" })));
		assert.deepEqual(result, { installed: ["Fine"] });
		assert.ok(fs.existsSync(path.join(modsDir(), "Fine", "Config", "a.xml")));
	});

	it("refuses an archive that declares more than 2 GiB unpacked, before anything is written", async () => {
		const three = 3 * 1024 ** 3;
		const liar = rawZip({ "Huge/ModInfo.xml": { text: "tiny", declared: three } });
		await assert.rejects(() => installUpload(server(), "Huge.zip", zipOnDisk(liar)), { code: "archive_too_large" });
		assert.equal(modsListing().includes("Huge"), false);
		assert.equal(modsListing().includes("Fine"), true, "the earlier mod is untouched");
	});

	it("refuses an archive that holds more than 20 000 entries", async () => {
		const entries = {};
		for (let i = 0; i <= 20_000; i += 1) entries[`many/f${i}.txt`] = "";
		await assert.rejects(() => installUpload(server(), "Many.zip", zipOnDisk(rawZip(entries))), { code: "archive_too_large" });
		assert.equal(modsListing().includes("Many"), false);
	});

	it("refuses an entry that climbs out of the folder with ..", async () => {
		await assert.rejects(() => installUpload(server(), "Up.zip", zipOnDisk(rawZip({ "../escaped.txt": "x", "fine.txt": "ok" }))), { code: "unsafe_archive" });
		assert.equal(fs.existsSync(path.join(serverFolder(), "escaped.txt")), false);
	});

	it("refuses an entry with an absolute path", async () => {
		await assert.rejects(() => installUpload(server(), "Abs.zip", zipOnDisk(rawZip({ "/etc/evil.txt": "x" }))), { code: "unsafe_archive" });
		await assert.rejects(() => installUpload(server(), "Drive.zip", zipOnDisk(rawZip({ "C:/Windows/evil.txt": "x" }))), { code: "unsafe_archive" });
	});

	it("refuses a file that isn't a zip", async () => {
		await assert.rejects(() => installUpload(server(), "Text.zip", zipOnDisk(Buffer.from("not a zip at all"))), (err) => err instanceof ModError && err.code === "bad_archive");
	});

	it("leaves nothing in the temp folder after a refusal", () => {
		assert.deepEqual(fs.readdirSync(tmp).filter((n) => n.startsWith("gp-mod-")), []);
	});
});

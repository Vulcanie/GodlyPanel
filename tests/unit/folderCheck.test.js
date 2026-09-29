import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tempDir, removeDir } from "../helpers/instance.js";

// "Can game servers live here?" — answered without leaving anything behind, so
// someone typing a path into a settings box doesn't get a trail of new folders.

const onWindows = process.platform === "win32";

describe("folder check", { skip: !onWindows && "Windows paths" }, () => {
	let dataDir;
	let inspectFolder;

	before(async () => {
		dataDir = tempDir("folder");
		process.env.GHP_DATA_DIR = dataDir;
		({ inspectFolder } = await import("../../src/server/services/folderCheck.js"));
	});

	after(() => removeDir(dataDir));

	it("blank means the default folder inside the app's data directory", () => {
		const r = inspectFolder("");
		assert.equal(r.ok, true);
		assert.equal(r.usingDefault, true);
		assert.equal(r.resolved, path.join(dataDir, "servers"));
		assert.equal(r.insideAppFolder, true);
		assert.equal(r.exists, false);
		assert.ok(r.freeBytes > 0, "reports free space on that drive");
	});

	it("does not create anything by merely checking", () => {
		const target = path.join(dataDir, "not", "created", "yet");
		const r = inspectFolder(target);
		assert.equal(r.ok, true);
		assert.equal(r.exists, false);
		assert.equal(fs.existsSync(path.join(dataDir, "not")), false);
	});

	it("accepts an existing writable folder", () => {
		const r = inspectFolder(dataDir);
		assert.equal(r.ok, true);
		assert.equal(r.exists, true);
		assert.equal(fs.readdirSync(dataDir).some((f) => f.startsWith(".ghp-write-test")), false, "the write probe is cleaned up");
	});

	it("refuses a relative path", () => {
		const r = inspectFolder("servers\\here");
		assert.equal(r.ok, false);
		assert.match(r.errors[0], /full path/);
	});

	it("refuses the Windows folder", () => {
		const r = inspectFolder(path.join(process.env.SystemRoot ?? "C:\\Windows", "Temp", "servers"));
		assert.equal(r.ok, false);
		assert.match(r.errors[0], /Windows folder/);
	});

	it("refuses a drive that doesn't exist", () => {
		const letter = "ZYXWVUTSRQPONMLKJIHGFED".split("").find((l) => !fs.existsSync(`${l}:\\`));
		assert.ok(letter, "needs one unused drive letter");
		const r = inspectFolder(`${letter}:\\Games`);
		assert.equal(r.ok, false);
		assert.match(r.errors[0], /drive isn't available/);
	});

	it("warns, rather than refuses, about the top of a drive and Program Files", () => {
		const root = inspectFolder("C:\\");
		assert.ok(root.warnings.some((w) => /top of a drive/.test(w)));
		const pf = inspectFolder(path.join(process.env.ProgramFiles ?? "C:\\Program Files", "GameServers"));
		assert.ok(pf.warnings.some((w) => /Program Files/.test(w)));
	});
});

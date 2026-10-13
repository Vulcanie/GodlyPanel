import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Cloning a server swaps the old folder, name and RCON password for the new ones in its files. The password is matched exactly:
// loose matching rewrote other words that happened to contain it.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-clone-"));
process.env.GHP_DATA_DIR = dir;
const { rewriteStrings } = await import("../../src/server/services/cloneService.js");

describe("rewriting a clone's files", () => {
	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	it("ignores letter case for paths and names, as Windows does", () => {
		assert.equal(rewriteStrings("D:\\Servers\\Old\\run.bat", [["d:\\servers\\old", "D:\\Servers\\New"]]), "D:\\Servers\\New\\run.bat");
	});

	it("swaps a password exactly, and leaves the words that merely contain it alone", () => {
		const text = "ServerAdminPassword=admin\nAdmin=true\nRCONPassword=admin";
		assert.equal(rewriteStrings(text, [["admin", "N3wSecret", { exact: true }]]), "ServerAdminPassword=N3wSecret\nAdmin=true\nRCONPassword=N3wSecret");
	});

	it("swaps a very short password too, wherever it stands on its own", () => {
		assert.equal(rewriteStrings("AdminPassword=pw\nRconPassword=pw\nServerName=pwned PW", [["pw", "N3wSecret", { exact: true }]]), "AdminPassword=N3wSecret\nRconPassword=N3wSecret\nServerName=pwned PW");
	});

	it("reaches into nested records, as the server entry has them", () => {
		const entry = { rconPassword: "swordfish", launch: { args: ["-p=swordfish"] }, port: 7777 };
		assert.deepEqual(rewriteStrings(entry, [["swordfish", "other", { exact: true }]]), { rconPassword: "other", launch: { args: ["-p=other"] }, port: 7777 });
	});
});

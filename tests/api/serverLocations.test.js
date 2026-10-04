import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, GUEST, sleep } from "../helpers/instance.js";

// Where each server's files are now: beside where new ones will go, which the "Server install folder" setting
// says. Servers made earlier, or added by hand, can be anywhere; the list says where, whether it is still there,
// whether servers share it, and how big it is once the storage scan has measured it.

describe("where servers live", () => {
	let panel;
	let api;
	let dir;
	const where = async () => (await api.get("/api/settings/server-locations")).json;
	const find = (list, name) => list.servers.find((s) => s.name === name);

	before(async () => {
		panel = await startInstance({
			prepare: (folder) => {
				dir = folder;
				for (const sub of ["servers/made", "elsewhere/hand", "shared", "scriptonly"]) fs.mkdirSync(path.join(folder, sub), { recursive: true });
				fs.writeFileSync(path.join(folder, "servers/made/world.dat"), "x".repeat(4096));
				fs.writeFileSync(path.join(folder, "scriptonly/start.bat"), "@echo off\r\n");
			},
			servers: (folder) => [
				serverEntry(path.join(folder, "servers/made"), { name: "Made", source: "created", installDir: path.join(folder, "servers/made") }),
				serverEntry(path.join(folder, "elsewhere/hand"), { name: "ByHand", source: "imported", installDir: path.join(folder, "elsewhere/hand") }),
				serverEntry(path.join(folder, "shared"), { name: "ArkA", installDir: path.join(folder, "shared") }),
				serverEntry(path.join(folder, "shared"), { name: "ArkB", installDir: path.join(folder, "shared") }),
				serverEntry(path.join(folder, "gone"), { name: "Gone", installDir: path.join(folder, "gone") }),
				{ ...serverEntry(path.join(folder, "scriptonly"), { name: "ScriptOnly", startScriptPath: path.join(folder, "scriptonly/start.bat") }), installDir: undefined, workingDir: undefined },
			],
		});
		api = panel.api;
		await api.post("/api/users", { username: "mod-loc", password: "ModPass!12345", role: "moderator" });
	});
	after(() => panel.stop());

	it("says where new servers will go, and where each existing one is", async () => {
		const list = await where();
		assert.equal(list.newServersFolder, path.join(dir, "servers"), "the default: a servers folder inside the data folder");
		assert.equal(list.servers.length, 6);
		assert.equal(find(list, "Made").folder, path.join(dir, "servers", "made"));
		assert.equal(find(list, "ByHand").folder, path.join(dir, "elsewhere", "hand"));
	});

	it("tells servers in the new-servers folder from ones elsewhere, and ones the panel made from ones added by hand", async () => {
		const list = await where();
		assert.equal(find(list, "Made").inNewServersFolder, true);
		assert.equal(find(list, "Made").createdByPanel, true);
		assert.equal(find(list, "ByHand").inNewServersFolder, false);
		assert.equal(find(list, "ByHand").createdByPanel, false);
		assert.match(find(list, "ByHand").drive, /^[A-Za-z]:\\$/);
	});

	it("says when a folder isn't there any more", async () => {
		const list = await where();
		assert.equal(find(list, "Gone").exists, false);
		assert.equal(find(list, "Made").exists, true);
	});

	it("names the servers that share a folder, so a size isn't counted as each one's own", async () => {
		const list = await where();
		assert.deepEqual(find(list, "ArkA").sharedWith, ["ArkB"]);
		assert.deepEqual(find(list, "ArkB").sharedWith, ["ArkA"]);
		assert.deepEqual(find(list, "Made").sharedWith, []);
	});

	it("falls back to the folder a server's start script is in", async () => {
		const list = await where();
		assert.equal(find(list, "ScriptOnly").folder, path.join(dir, "scriptonly"));
	});

	it("adds each folder's size once the storage scan has measured it", async () => {
		await api.post("/api/settings/storage/rescan");
		let made;
		for (let i = 0; i < 40 && made?.bytes == null; i += 1) {
			await sleep(500);
			made = find(await where(), "Made");
		}
		assert.ok(made.bytes >= 4096, `measured ${made.bytes}`);
		assert.equal(made.bytesScope, "folder");
		const shared = find(await where(), "ArkA");
		assert.equal(shared.bytesScope, "shared", "the figure covers both servers in it");
	});

	it("is for administrators only", async () => {
		const mod = await api.cookieFor({ username: "mod-loc", password: "ModPass!12345" });
		assert.equal((await api.get("/api/settings/server-locations", { cookie: mod })).status, 403);
		const guest = await api.cookieFor(GUEST);
		assert.equal((await api.get("/api/settings/server-locations", { cookie: guest })).status, 403);
		assert.equal((await fetch(`${api.base}/api/settings/server-locations`)).status, 401);
	});
});

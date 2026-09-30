import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runStandIn, stopStandIns, startInstance, serverEntry, GUEST, sleep } from "../helpers/instance.js";

// Removing a server: out of the panel only, or with its files. The files are
// never touched unless the panel created the server and the folder is
// unambiguously its own.

const runningImage = "gp-running-removal.exe";

describe("removing servers", () => {
	let panel;
	let api;
	let guestCookie;
	let dirs;

	const exists = (p) => fs.existsSync(p);
	const registered = () => JSON.parse(fs.readFileSync(path.join(panel.dir, "servers.json"), "utf8")).servers.map((s) => s.name);
	const remove = (name, body) => api.call("DELETE", `/api/server/${encodeURIComponent(name)}`, { confirmName: name, ...body });

	before(async () => {
		panel = await startInstance({
			prepare: (folder) => {
				dirs = {
					imported: path.join(folder, "world", "imported"),
					kept: path.join(folder, "world", "kept"),
					made: path.join(folder, "world", "made"),
					foreign: path.join(folder, "world", "foreign"),
					shared: path.join(folder, "world", "shared"),
					running: path.join(folder, "world", "running"),
				};
				for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true });
				fs.writeFileSync(path.join(dirs.imported, "save.dat"), "precious");
				fs.writeFileSync(path.join(dirs.kept, "save.dat"), "precious");
				fs.writeFileSync(path.join(dirs.made, "Start.bat"), "@echo off\r\n");
				fs.writeFileSync(path.join(dirs.made, "save.dat"), "world");
				fs.writeFileSync(path.join(dirs.made, ".godlypanel-server.json"), JSON.stringify({ name: "Made" }));
				fs.writeFileSync(path.join(dirs.foreign, "Start.bat"), "@echo off\r\n");
				fs.writeFileSync(path.join(dirs.foreign, ".godlypanel-server.json"), JSON.stringify({ name: "Somebody Else" }));
				fs.writeFileSync(path.join(dirs.shared, "Start_A.bat"), "@echo off\r\n");
				fs.writeFileSync(path.join(dirs.shared, "Start_B.bat"), "@echo off\r\n");
				fs.writeFileSync(path.join(dirs.shared, "game.bin"), "the shared install");
				fs.writeFileSync(path.join(dirs.running, "Start.bat"), "@echo off\r\n");
				runStandIn(dirs.running, runningImage);
				// State the panel keeps about "Made", which deletion should clear too.
				fs.mkdirSync(path.join(folder, "logs", "servers"), { recursive: true });
				fs.writeFileSync(path.join(folder, "logs", "servers", "Made.log"), "old output");
				fs.mkdirSync(path.join(folder, "state"), { recursive: true });
				fs.writeFileSync(path.join(folder, "state", "auto-update-settings.json"), JSON.stringify({ Made: true, Other: true }));
			},
			servers: () => [
				serverEntry(dirs.imported, { name: "Imported", source: "imported", processName: "nope-1.exe" }),
				serverEntry(dirs.kept, { name: "Kept", source: "imported", processName: "nope-7.exe" }),
				serverEntry(dirs.made, { name: "Made", source: "created", processName: "nope-2.exe", startScriptPath: path.join(dirs.made, "Start.bat"), updateAppId: "1" }),
				serverEntry(dirs.foreign, { name: "Foreign", source: "created", processName: "nope-3.exe", startScriptPath: path.join(dirs.foreign, "Start.bat") }),
				serverEntry(dirs.shared, { name: "MapA", source: "created", processName: "nope-4.exe", startScriptPath: path.join(dirs.shared, "Start_A.bat") }),
				serverEntry(dirs.shared, { name: "MapB", source: "created", processName: "nope-5.exe", startScriptPath: path.join(dirs.shared, "Start_B.bat") }),
				serverEntry(dirs.running, { name: "Running", source: "created", processName: runningImage, startScriptPath: path.join(dirs.running, "Start.bat") }),
			],
		});
		api = panel.api;
		guestCookie = await api.cookieFor(GUEST);
		await sleep(4500); // let a poll see "Running" online
	});
	after(() => {
		stopStandIns();
		return panel.stop();
	});

	it("tells the interface what deleting would do", async () => {
		const made = (await api.get("/api/server/Made/removal")).json;
		assert.equal(made.canDeleteFiles, true);
		assert.equal(made.mode, "folder");
		assert.equal(made.target, dirs.made);

		const imported = (await api.get("/api/server/Imported/removal")).json;
		assert.equal(imported.canDeleteFiles, false);
		assert.match(imported.reason, /imported/);

		assert.equal((await api.get("/api/server/MapA/removal")).json.mode, "script");
		assert.equal((await api.get("/api/server/Running/removal")).json.running, true);
	});

	it("requires the exact name, and only an admin can delete", async () => {
		const wrong = await api.call("DELETE", "/api/server/Made", { confirmName: "made" });
		assert.equal(wrong.status, 400);
		assert.equal(wrong.json.code, "confirm_mismatch");
		assert.equal((await api.call("DELETE", "/api/server/Made", { confirmName: "Made" }, { cookie: guestCookie })).status, 403);
		assert.equal((await api.call("DELETE", "/api/server/Nope", { confirmName: "Nope" })).status, 404);
		assert.equal(exists(path.join(dirs.made, "save.dat")), true);
		assert.ok(registered().includes("Made"));
	});

	it("won't remove a running server", async () => {
		const r = await remove("Running", { deleteFiles: true });
		assert.equal(r.status, 409);
		assert.equal(r.json.code, "server_running");
		assert.ok(registered().includes("Running"));
		assert.equal(exists(path.join(dirs.running, "Start.bat")), true);
	});

	it("removes an imported server from the panel and leaves every file alone", async () => {
		const r = await remove("Imported", { deleteFiles: false });
		assert.equal(r.status, 200);
		assert.equal(r.json.removedFromPanel, true);
		assert.equal(r.json.filesDeleted, false);
		assert.equal(registered().includes("Imported"), false);
		assert.equal((await api.get("/api/status")).json.Imported, undefined, "gone from the dashboard");
		assert.equal(fs.readFileSync(path.join(dirs.imported, "save.dat"), "utf8"), "precious");
	});

	it("refuses to delete an imported server's files, and keeps the server registered", async () => {
		const r = await remove("Kept", { deleteFiles: true });
		assert.equal(r.status, 400);
		assert.equal(r.json.code, "files_protected");
		assert.match(r.json.error, /imported/);
		assert.equal(fs.readFileSync(path.join(dirs.kept, "save.dat"), "utf8"), "precious");
		assert.ok(registered().includes("Kept"));
	});

	it("refuses when the folder's marker names a different server", async () => {
		const r = await remove("Foreign", { deleteFiles: true });
		assert.equal(r.status, 400);
		assert.equal(r.json.code, "files_protected");
		assert.equal(exists(path.join(dirs.foreign, "Start.bat")), true);
		assert.ok(registered().includes("Foreign"), "and the server stays registered");
	});

	it("deletes a created server's folder and clears what the panel kept about it", async () => {
		const r = await remove("Made", { deleteFiles: true });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(r.json.filesDeleted, true);
		assert.equal(exists(dirs.made), false, "the folder is gone");
		assert.equal(registered().includes("Made"), false);
		assert.equal(exists(path.join(panel.dir, "logs", "servers", "Made.log")), false, "its captured log is gone");
		const auto = JSON.parse(fs.readFileSync(path.join(panel.dir, "state", "auto-update-settings.json"), "utf8"));
		assert.equal("Made" in auto, false);
		assert.equal(auto.Other, true, "other servers' settings are untouched");
	});

	it("for a shared install, deletes only that server's own start script", async () => {
		const r = await remove("MapA", { deleteFiles: true });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(exists(path.join(dirs.shared, "Start_A.bat")), false);
		assert.equal(exists(path.join(dirs.shared, "Start_B.bat")), true, "the sibling's script stays");
		assert.equal(exists(path.join(dirs.shared, "game.bin")), true, "and so does the shared game install");
		assert.ok(registered().includes("MapB"));
		assert.match(r.json.note, /shared/);
	});

	it("tells connected dashboards the server is gone", async () => {
		const controller = new AbortController();
		const stream = await fetch(`${panel.base}/api/events`, { headers: { Cookie: api.cookie }, signal: controller.signal });
		const reader = stream.body.getReader();
		let seen = "";
		const reading = (async () => {
			try {
				for (;;) {
					const { value, done } = await reader.read();
					if (done) return;
					seen += Buffer.from(value).toString("utf8");
					if (seen.includes("server_removed")) return;
				}
			} catch {
				// Aborted below.
			}
		})();
		await sleep(400);
		assert.equal((await remove("MapB", { deleteFiles: false })).status, 200);
		await Promise.race([reading, sleep(4000)]);
		controller.abort();
		assert.match(seen, /"type":"server_removed","serverName":"MapB"/);
	});
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, sleep, tempDir } from "../helpers/instance.js";
import { flagValue } from "../../src/server/services/backupService.js";

// Valheim and 7 Days to Die keep their worlds in the signed-in user's profile unless
// the start script says otherwise, shared with every other such server on the PC. A
// server the panel creates is told to keep its own (-savedir, -UserDataFolder); one
// that isn't is backed up from the shared folder but never restored over without an
// explicit go-ahead, because that would replace other servers' worlds too.

describe("reading a save folder out of a start script", () => {
	it("takes the forms the games use", () => {
		assert.equal(flagValue('start x.exe -savedir "D:\\Servers\\v\\saves" -password x', "-savedir"), "D:\\Servers\\v\\saves");
		assert.equal(flagValue("start x.exe -savedir D:\\v\\saves -password x", "-savedir"), "D:\\v\\saves");
		assert.equal(flagValue('start x.exe "-UserDataFolder=%~dp0userdata" -dedicated', "-UserDataFolder="), "%~dp0userdata");
		assert.equal(flagValue("start x.exe -UserDataFolder=D:\\ud -dedicated", "-UserDataFolder="), "D:\\ud");
		assert.equal(flagValue("start x.exe -nographics", "-savedir"), null);
		assert.equal(flagValue("start x.exe -savedirectory nope", "-savedir"), null, "a longer flag isn't the flag");
	});
});

describe("worlds in the profile folder", () => {
	let panel;
	let api;
	let home;
	let own;
	let profileWorld;

	const enc = encodeURIComponent;
	const idle = async () => !(await api.get("/api/operations")).json["Shared Valheim"];
	async function until(check, ms = 30_000) {
		const end = Date.now() + ms;
		while (Date.now() < end) {
			if (await check()) return true;
			await sleep(300);
		}
		return check();
	}

	before(async () => {
		home = tempDir("profile");
		profileWorld = path.join(home, "AppData", "LocalLow", "IronGate", "Valheim", "worlds_local");
		fs.mkdirSync(profileWorld, { recursive: true });
		fs.writeFileSync(path.join(profileWorld, "OtherServersWorld.fwl"), "someone else's world");
		panel = await startInstance({
			// The API sees this as the user's profile, so nothing real is ever touched.
			env: { USERPROFILE: home, APPDATA: path.join(home, "AppData", "Roaming"), HOME: home },
			servers: (dir) => {
				own = path.join(dir, "own");
				const shared = path.join(dir, "shared");
				fs.mkdirSync(path.join(own, "saves", "worlds_local"), { recursive: true });
				fs.writeFileSync(path.join(own, "saves", "worlds_local", "Mine.fwl"), "my world");
				fs.writeFileSync(path.join(own, "Start.bat"), '@echo off\r\nstart /MIN "x" valheim_server.exe -nographics -port 1 -savedir "%~dp0saves"\r\n');
				fs.mkdirSync(shared, { recursive: true });
				fs.writeFileSync(path.join(shared, "Start.bat"), '@echo off\r\nstart /MIN "x" valheim_server.exe -nographics -port 2\r\n');
				return [
					serverEntry(dir, { name: "Own Valheim", type: "valheim", source: "created", installDir: own, workingDir: own, startScriptPath: path.join(own, "Start.bat"), processName: "own-none.exe" }),
					serverEntry(dir, { name: "Shared Valheim", type: "valheim", source: "imported", installDir: shared, workingDir: shared, startScriptPath: path.join(shared, "Start.bat"), processName: "shared-none.exe" }),
				];
			},
		});
		api = panel.api;
	});
	after(async () => {
		await panel.stop();
		fs.rmSync(home, { recursive: true, force: true });
	});

	it("follows -savedir into the server's own folder, and says it isn't shared", async () => {
		const o = (await api.get(`/api/server/${enc("Own Valheim")}/backups`)).json;
		assert.equal(o.specs.length, 1);
		assert.equal(o.specs[0].path, path.join(own, "saves"));
		assert.equal(o.specs[0].shared, false);
	});

	it("falls back to the profile folder when there is no flag, and says it is shared", async () => {
		const o = (await api.get(`/api/server/${enc("Shared Valheim")}/backups`)).json;
		assert.equal(o.specs[0].path, path.join(home, "AppData", "LocalLow", "IronGate", "Valheim"));
		assert.equal(o.specs[0].shared, true);
	});

	it("restores a server's own worlds without fuss", async () => {
		await api.post(`/api/server/${enc("Own Valheim")}/backups`, {});
		await sleep(1500);
		await until(async () => !(await api.get("/api/operations")).json["Own Valheim"]);
		const id = (await api.get(`/api/server/${enc("Own Valheim")}/backups`)).json.backups[0].id;
		fs.writeFileSync(path.join(own, "saves", "worlds_local", "Mine.fwl"), "changed");
		const r = await api.post(`/api/server/${enc("Own Valheim")}/backups/${id}/restore`, { confirmName: "Own Valheim" });
		assert.equal(r.status, 202, JSON.stringify(r.json));
		await until(async () => !(await api.get("/api/operations")).json["Own Valheim"]);
		assert.equal(fs.readFileSync(path.join(own, "saves", "worlds_local", "Mine.fwl"), "utf8"), "my world");
	});

	it("backs up the shared folder but refuses to restore over it without a go-ahead", async () => {
		await api.post(`/api/server/${enc("Shared Valheim")}/backups`, {});
		await until(async () => (await api.get(`/api/server/${enc("Shared Valheim")}/backups`)).json.backups.length === 1);
		await until(idle);
		const id = (await api.get(`/api/server/${enc("Shared Valheim")}/backups`)).json.backups[0].id;
		fs.writeFileSync(path.join(profileWorld, "OtherServersWorld.fwl"), "progress made since");
		const refused = await api.post(`/api/server/${enc("Shared Valheim")}/backups/${id}/restore`, { confirmName: "Shared Valheim" });
		assert.equal(refused.status, 409, JSON.stringify(refused.json));
		assert.equal(refused.json.code, "shared_folder");
		assert.equal(fs.readFileSync(path.join(profileWorld, "OtherServersWorld.fwl"), "utf8"), "progress made since", "nothing was touched");

		const allowed = await api.post(`/api/server/${enc("Shared Valheim")}/backups/${id}/restore`, { confirmName: "Shared Valheim", allowShared: true });
		assert.equal(allowed.status, 202, JSON.stringify(allowed.json));
		await until(idle);
		assert.equal(fs.readFileSync(path.join(profileWorld, "OtherServersWorld.fwl"), "utf8"), "someone else's world");
	});
});

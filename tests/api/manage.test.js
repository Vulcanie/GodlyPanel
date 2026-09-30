import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, freePort, sleep, serverEntry } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";
import { keepIdentity } from "../../src/server/services/presetService.js";

// Presets (a game's settings saved under a name, applied to another server) and
// cloning (a full copy of a server with its own name, ports and RCON password).

async function until(check, { timeoutMs = 60_000, everyMs = 400 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("keeping a server's identity when settings are applied", () => {
	it("keeps names, passwords and ports, takes the rest", () => {
		const preset = "[S]\r\nServerName=Preset Name\r\nDifficulty=5\r\nRconPort=1111\r\nAdminPassword=presetpw\r\n";
		const mine = "[S]\r\nServerName=My Server\r\nDifficulty=1\r\nRconPort=2222\r\nAdminPassword=mypw\r\n";
		assert.equal(keepIdentity(preset, mine), "[S]\r\nServerName=My Server\r\nDifficulty=5\r\nRconPort=2222\r\nAdminPassword=mypw\r\n");
	});

	it("does the same inside a struct on one line, and for properties files", () => {
		const preset = 'OptionSettings=(ServerName="Preset",Difficulty=None,AdminPassword="p1",PublicPort=8211)';
		const mine = 'OptionSettings=(ServerName="Mine",Difficulty=Hard,AdminPassword="p2",PublicPort=9000)';
		assert.equal(keepIdentity(preset, mine), 'OptionSettings=(ServerName="Mine",Difficulty=None,AdminPassword="p2",PublicPort=9000)');
		assert.equal(keepIdentity("server-port=25565\nmotd=hello\npvp=true\n", "server-port=25999\nmotd=mine\npvp=false\n"), "server-port=25999\nmotd=mine\npvp=true\n");
	});

	it("doesn't touch a setting the target doesn't have, or one that merely contains a name", () => {
		assert.equal(keepIdentity("ServerName=A\nBonusServerName=B\n", "Other=1\n"), "ServerName=A\nBonusServerName=B\n");
		assert.equal(keepIdentity("BonusServerName=B\n", "ServerName=mine\n"), "BonusServerName=B\n");
	});
});

describe("presets and cloning", () => {
	let panel;
	let api;
	let dirs;

	const NAMES = { a: "Preset Source", b: "Preset Target", c: "Clone Source" };
	const enc = encodeURIComponent;
	const ini = (folder) => path.join(folder, "ConanSandbox", "Saved", "Config", "WindowsServer", "ServerSettings.ini");
	// Conan keeps its RCON settings in Game.ini, beside ServerSettings.ini.
	const gameIni = (folder) => path.join(path.dirname(ini(folder)), "Game.ini");

	before(async () => {
		const free = [await freePort(), await freePort(), await freePort()];
		dirs = {};
		panel = await startInstance({
			servers: (dir) => {
				const make = (key, exe, rcon, ports) => {
					dirs[key] = path.join(dir, exe);
					return makeFakeGame(dirs[key], { name: NAMES[key], rconPort: rcon, exe: `${exe}.exe`, ports });
				};
				return [
					make("a", "gp-fake-pa", free[0], { port: 9711, queryPort: 9713 }),
					make("b", "gp-fake-pb", free[1], { port: 9721, queryPort: 9723 }),
					make("c", "gp-fake-pc", free[2], { port: 9731, queryPort: 9733 }),
					// Holds the defaults, so a clone is given ports well away from anything real on this PC.
					serverEntry(dir, { name: "Port Holder", type: "custom", port: 8892, queryPort: 8894, rconPort: 8895, processName: "none.exe", installDir: path.join(dir, "holder"), workingDir: path.join(dir, "holder") }),
					serverEntry(dir, { name: "Imported One", type: "custom", source: "imported", processName: "none2.exe", installDir: path.join(dir, "imported"), workingDir: path.join(dir, "imported") }),
				];
			},
		});
		api = panel.api;
	});
	after(async () => {
		for (const d of Object.values(dirs)) killFakeGames(d);
		await panel.stop();
	});

	describe("presets", () => {
		let presetId;

		it("saves a server's settings under a name", async () => {
			fs.appendFileSync(ini(dirs.a), "Difficulty=5\r\nPvP=true\r\n");
			const r = await api.post(`/api/server/${enc(NAMES.a)}/presets`, { name: "Hardcore" });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.equal(r.json.name, "Hardcore");
			assert.equal(r.json.game, "Conan Exiles");
			assert.ok(r.json.files.config.bytes > 0);
			assert.equal("content" in r.json.files.config, false, "the listing doesn't carry the files");
			presetId = r.json.id;
			assert.equal((await api.get("/api/presets")).json.length, 1);
		});

		it("applies it to another server of the same game, keeping that server's own identity", async () => {
			const before = fs.readFileSync(ini(dirs.b), "utf8");
			assert.doesNotMatch(before, /Difficulty/);
			const r = await api.post(`/api/server/${enc(NAMES.b)}/presets/${presetId}/apply`, {});
			assert.equal(r.status, 200, JSON.stringify(r.json));
			const after = fs.readFileSync(ini(dirs.b), "utf8");
			assert.match(after, /Difficulty=5/);
			assert.match(after, /PvP=true/);
			const name = /ServerName=(.+)/.exec(after)[1].trim();
			assert.equal(name, /ServerName=(.+)/.exec(before)[1].trim(), "its own name");
			assert.notEqual(name, /ServerName=(.+)/.exec(fs.readFileSync(ini(dirs.a), "utf8"))[1].trim());
			assert.ok(fs.existsSync(`${ini(dirs.b)}.bak`), "with a backup of what it replaced");
		});

		it("refuses a server that is running, a different game, and a preset that doesn't exist", async () => {
			await api.post(`/api/control/${enc(NAMES.b)}/start`);
			assert.equal(await until(async () => (await api.get("/api/status")).json[NAMES.b]?.online === true), true);
			await until(async () => !(await api.get("/api/operations")).json[NAMES.b]);
			const running = await api.post(`/api/server/${enc(NAMES.b)}/presets/${presetId}/apply`, {});
			assert.equal(running.status, 409);
			assert.equal(running.json.code, "server_running");
			await api.post(`/api/control/${enc(NAMES.b)}/stop`);
			await until(async () => !(await api.get("/api/operations")).json[NAMES.b] && (await api.get("/api/status")).json[NAMES.b]?.online === false);

			const other = await api.post("/api/server/Port%20Holder/presets", { name: "x" });
			assert.equal(other.status, 400, "a game the panel has no settings for");
			assert.equal((await api.post(`/api/server/${enc(NAMES.b)}/presets/nope/apply`, {})).status, 404);
		});

		it("can take the preset exactly as saved, identity and all", async () => {
			await api.post(`/api/server/${enc(NAMES.b)}/presets/${presetId}/apply`, { keepIdentity: false });
			assert.equal(/ServerName=(.+)/.exec(fs.readFileSync(ini(dirs.b), "utf8"))[1].trim(), /ServerName=(.+)/.exec(fs.readFileSync(ini(dirs.a), "utf8"))[1].trim());
		});

		it("deletes a preset, and is for admins only", async () => {
			await api.post("/api/users", { username: "modp", password: "TestMod!2345", role: "moderator" });
			const mod = await api.cookieFor({ username: "modp", password: "TestMod!2345" });
			assert.equal((await api.get("/api/presets", { cookie: mod })).status, 403);
			assert.equal((await api.del(`/api/presets/${presetId}`, { cookie: mod })).status, 403);
			assert.equal((await api.del(`/api/presets/${presetId}`)).status, 200);
			assert.equal((await api.del(`/api/presets/${presetId}`)).status, 404);
			assert.equal((await api.post(`/api/server/${enc(NAMES.a)}/presets`, { name: "  " })).status, 400);
		});
	});

	describe("cloning", () => {
		it("refuses what can't be cloned", async () => {
			const body = (name) => ({ name });
			assert.equal((await api.post(`/api/server/${enc(NAMES.c)}/clone`, body(""))).status, 400);
			const taken = await api.post(`/api/server/${enc(NAMES.c)}/clone`, body(NAMES.a));
			assert.equal(taken.json.code, "name_taken");
			const imported = await api.post("/api/server/Imported%20One/clone", body("Nope"));
			assert.equal(imported.json.code, "unknown_game");
		});

		it("refuses while the server is running", async () => {
			await api.post(`/api/control/${enc(NAMES.c)}/start`);
			assert.equal(await until(async () => (await api.get("/api/status")).json[NAMES.c]?.online === true), true);
			await until(async () => !(await api.get("/api/operations")).json[NAMES.c]);
			const r = await api.post(`/api/server/${enc(NAMES.c)}/clone`, { name: "Too Soon" });
			assert.equal(r.status, 409);
			await api.post(`/api/control/${enc(NAMES.c)}/stop`);
			assert.equal(await until(async () => !(await api.get("/api/operations")).json[NAMES.c] && (await api.get("/api/status")).json[NAMES.c]?.online === false), true);
		});

		it("copies the whole server under its own name, ports and RCON password", async () => {
			fs.writeFileSync(path.join(dirs.c, "ConanSandbox", "Saved", "world.sav"), "a world with history\n");
			const started = await api.post(`/api/server/${enc(NAMES.c)}/clone`, { name: "Clone Two" });
			assert.equal(started.status, 202, JSON.stringify(started.json));
			const jobId = started.json.id;
			assert.equal(await until(async () => ["done", "failed"].includes((await api.get(`/api/clone-jobs/${jobId}`)).json.status)), true);
			const job = (await api.get(`/api/clone-jobs/${jobId}`)).json;
			assert.equal(job.status, "done", JSON.stringify(job));

			const status = (await api.get("/api/status")).json;
			assert.ok("Clone Two" in status, "it is on the dashboard");
			const copy = path.join(panel.dir, "servers", "clone-two");
			assert.equal(fs.readFileSync(path.join(copy, "ConanSandbox", "Saved", "world.sav"), "utf8"), "a world with history\n", "the world came with it");
			assert.ok(fs.existsSync(path.join(copy, ".godlypanel-server.json")), "marked as the panel's own folder");

			const script = fs.readFileSync(path.join(copy, "Start_Fake.bat"), "utf8");
			assert.match(script, /start \/MIN "Clone Two"/, "its own window title");
			assert.doesNotMatch(script, /9731|9733/, "not the original's ports");
			assert.match(script, /-Port=\d+ -QueryPort=\d+/);
			assert.ok(!script.includes(dirs.c), "and nothing points back at the original folder");

			const sourceIni = fs.readFileSync(gameIni(dirs.c), "utf8");
			const copyIni = fs.readFileSync(gameIni(copy), "utf8");
			const sourcePassword = /RconPassword=(.+)/.exec(sourceIni)[1].trim();
			for (const file of fs.readdirSync(path.dirname(gameIni(copy)))) {
				assert.ok(!fs.readFileSync(path.join(path.dirname(gameIni(copy)), file), "utf8").includes(sourcePassword), `${file} still carries the original's RCON password`);
			}
			assert.notEqual(/RconPort=(\d+)/.exec(copyIni)[1], /RconPort=(\d+)/.exec(sourceIni)[1], "its own RCON port");
			assert.notEqual(/RconPassword=(.+)/.exec(copyIni)[1], /RconPassword=(.+)/.exec(sourceIni)[1], "and its own RCON password");

			const entry = (await api.get("/api/settings/servers")).json.find((s) => s.name === "Clone Two");
			assert.equal(entry.source, "created");
			assert.ok(entry.installDir.toLowerCase().startsWith(copy.toLowerCase()));
			assert.ok(entry.port > 8892 && entry.port !== 9731);
			assert.equal(entry.rconPassword, /RconPassword=(.+)/.exec(copyIni)[1].trim());
			assert.equal((await api.get(`/api/settings/servers`)).json.find((s) => s.name === NAMES.c).port, 9731, "the original is untouched");
		});

		it("gives a copy that really runs, on its own ports", async () => {
			assert.equal((await api.post("/api/control/Clone%20Two/start")).status, 200);
			assert.equal(await until(async () => (await api.get("/api/status")).json["Clone Two"]?.online === true, { timeoutMs: 90_000 }), true);
			killFakeGames(path.join(panel.dir, "servers", "clone-two"));
		});

		it("takes the session name along if you change it", async () => {
			await api.post("/api/control/Clone%20Two/stop").catch(() => {});
			const started = await api.post(`/api/server/${enc(NAMES.c)}/clone`, { name: "Clone Three", sessionName: "Third" });
			assert.equal(started.status, 202, JSON.stringify(started.json));
			assert.equal(await until(async () => (await api.get(`/api/clone-jobs/${started.json.id}`)).json.status === "done"), true);
			const entry = (await api.get("/api/settings/servers")).json.find((s) => s.name === "Clone Three");
			assert.equal(entry.sessionName, "Third");
		});

		it("is for admins only", async () => {
			const mod = await api.cookieFor({ username: "modp", password: "TestMod!2345" });
			assert.equal((await api.post(`/api/server/${enc(NAMES.c)}/clone`, { name: "Sneaky" }, { cookie: mod })).status, 403);
		});
	});
});

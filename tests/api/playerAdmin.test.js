import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, freePort, sleep, GUEST } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames, gameLog } from "../helpers/fakeGame.js";

// Kicking, banning and the whitelist/admin/ban lists. A stand-in Minecraft-style server
// answers the console commands and keeps the same list files the real one does; a
// Valheim-style server has only files. What is checked: the right command reaches the
// game, nothing a person types can smuggle in a second command, the lists on disk are
// read and changed correctly, every action is in the activity log with who did it, and
// only the people allowed to can.

async function until(check, { timeoutMs = 60_000, everyMs = 300 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("player administration", () => {
	let panel;
	let api;
	let folder;
	let valheim;
	let mod;
	let modOther;
	let guest;

	const mc = "/api/server/Fake%20Craft";
	const va = "/api/server/Fake%20Valheim";
	const readJson = (name) => JSON.parse(fs.readFileSync(path.join(folder, name), "utf8"));
	const activity = async () => (await api.get("/api/activity")).json;

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-craft");
				valheim = path.join(dir, "fake-valheim");
				fs.mkdirSync(valheim, { recursive: true });
				fs.writeFileSync(path.join(valheim, "start.bat"), '@echo off\r\nvalheim_server.exe -name X -savedir "%~dp0saves"\r\n');
				return [
					{ ...makeFakeGame(folder, { name: "Fake Craft", rconPort, exe: "gp-fake-craft.exe", standardRcon: true }), type: "minecraft" },
					serverEntry(valheim, { name: "Fake Valheim", type: "valheim", source: "created", processName: "nope-valheim.exe", startScriptPath: path.join(valheim, "start.bat") }),
				];
			},
		});
		api = panel.api;
		fs.writeFileSync(path.join(folder, "players.txt"), "Steve\nAlex\n");
		await api.post("/api/users", { username: "mod-all", password: "TestMod!2345", role: "moderator" });
		await api.post("/api/users", { username: "mod-other", password: "TestMod!2345", role: "moderator", servers: ["Somewhere Else"] });
		mod = await api.cookieFor({ username: "mod-all", password: "TestMod!2345" });
		modOther = await api.cookieFor({ username: "mod-other", password: "TestMod!2345" });
		guest = await api.cookieFor(GUEST);
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	describe("a game with a console", () => {
		it("says what it can do, and what lists it has", async () => {
			const r = (await api.get(`${mc}/player-admin`)).json;
			assert.equal(r.supported, true);
			assert.equal(r.kick, true);
			assert.equal(r.ban, true);
			assert.deepEqual(r.lists.map((l) => l.id), ["whitelist", "admins", "bans"]);
			assert.ok(r.lists.every((l) => l.entries.length === 0));
		});

		it("won't act on a server that isn't running", async () => {
			const r = await api.post(`${mc}/players/kick`, { player: "Steve" });
			assert.equal(r.status, 409);
			assert.equal(r.json.code, "not_running");
		});

		it("kicks a player, with a reason, and records who did it", async () => {
			assert.equal((await api.post("/api/control/Fake%20Craft/start")).status, 200);
			const ok = await until(async () => (await api.get("/api/status")).json["Fake Craft"]?.online === true, { timeoutMs: 15000 }); assert.equal(ok, true, JSON.stringify((await api.get("/api/status")).json["Fake Craft"]) + gameLog(folder) + JSON.stringify((await api.get("/api/operations")).json));
			await until(async () => !(await api.get("/api/operations")).json["Fake Craft"]);

			const r = await api.post(`${mc}/players/kick`, { player: "Steve", reason: "griefing the spawn" });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.equal(r.json.ok, true);
			assert.match(r.json.response, /Kicked Steve/);
			assert.match(gameLog(folder), /rcon: kick Steve griefing the spawn/);
			const event = (await activity()).find((e) => e.type === "player.kicked");
			assert.match(event.message, /admin: Kicked Steve/);
		});

		it("says so when nobody by that name is there", async () => {
			const r = await api.post(`${mc}/players/kick`, { player: "Nobody" });
			assert.equal(r.status, 200);
			assert.equal(r.json.ok, false);
			assert.match(r.json.response, /No player was found/);
			assert.equal((await activity()).filter((e) => e.type === "player.kicked").length, 1, "nothing recorded for a kick that did nothing");
		});

		it("lets nothing through that could run a second command", async () => {
			const before = gameLog(folder);
			for (const player of ["Steve\nstop", "Steve\r\nDoExit", 'Steve"', "Steve; stop", "", "x".repeat(40), "a b", undefined, { $ne: 1 }]) {
				const r = await api.post(`${mc}/players/kick`, { player });
				assert.equal(r.status, 400, JSON.stringify(player));
				assert.equal(r.json.code, "bad_player");
			}
			for (const reason of ["x\nstop", "a;b"]) {
				const r = await api.post(`${mc}/players/kick`, { player: "Steve", reason });
				assert.equal(r.status, 200);
			}
			const added = gameLog(folder).slice(before.length);
			assert.doesNotMatch(added, /rcon: stop|rcon: DoExit/);
			assert.match(added, /rcon: kick Steve x stop/, "a reason has its line breaks and separators turned into spaces");
			assert.equal(await until(async () => (await api.get("/api/status")).json["Fake Craft"]?.online === true, { timeoutMs: 3000 }), true, "the server is still up");
		});

		it("bans with a reason, shows it in the list, and unbans", async () => {
			const r = await api.post(`${mc}/players/ban`, { player: "Alex", reason: "cheating" });
			assert.equal(r.json.ok, true, JSON.stringify(r.json));
			assert.equal(readJson("banned-players.json")[0].reason, "cheating");
			const lists = (await api.get(`${mc}/player-admin`)).json.lists;
			const bans = lists.find((l) => l.id === "bans");
			assert.deepEqual(bans.entries.map((e) => [e.name, e.reason]), [["Alex", "cheating"]]);
			assert.equal(bans.readOnly, true, "changed with Ban and Unban, not edited as a list");

			assert.equal((await api.post(`${mc}/players/unban`, { player: "Alex" })).json.ok, true);
			assert.deepEqual(readJson("banned-players.json"), []);
			assert.equal((await api.post(`${mc}/players/unban`, { player: "Alex" })).json.ok, false, "unbanning someone not banned changes nothing");
		});

		it("adds to and removes from the whitelist and the operator list", async () => {
			assert.equal((await api.post(`${mc}/player-lists/whitelist`, { player: "Steve" })).json.changed, true);
			assert.equal((await api.post(`${mc}/player-lists/whitelist`, { player: "Steve" })).json.changed, false, "already there");
			assert.equal((await api.post(`${mc}/player-lists/admins`, { player: "Steve" })).json.changed, true);
			let lists = (await api.get(`${mc}/player-admin`)).json.lists;
			assert.deepEqual(lists.find((l) => l.id === "whitelist").entries.map((e) => e.name), ["Steve"]);
			assert.deepEqual(lists.find((l) => l.id === "admins").entries.map((e) => e.name), ["Steve"]);

			assert.equal((await api.del(`${mc}/player-lists/whitelist/Steve`)).json.changed, true);
			assert.equal((await api.del(`${mc}/player-lists/whitelist/Steve`)).json.changed, false);
			assert.equal((await api.del(`${mc}/player-lists/admins/Steve`)).json.changed, true);
			lists = (await api.get(`${mc}/player-admin`)).json.lists;
			assert.ok(lists.every((l) => l.entries.length === 0));
			assert.equal((await api.post(`${mc}/player-lists/bans`, { player: "Steve" })).status, 409, "the ban list is changed with Ban");
			assert.equal((await api.post(`${mc}/player-lists/nonsense`, { player: "Steve" })).status, 404);
		});
	});

	describe("a game with only files (Valheim)", () => {
		const dir = () => path.join(valheim, "saves");
		const steam = "76561198000000001";
		const other = "76561198000000002";

		it("has lists but no kick or ban, and says why", async () => {
			const r = (await api.get(`${va}/player-admin`)).json;
			assert.equal(r.supported, true);
			assert.equal(r.kick, false);
			assert.equal(r.ban, false);
			assert.deepEqual(r.lists.map((l) => l.id), ["admins", "bans", "whitelist"]);
			assert.match(r.note, /restart/);
			assert.equal((await api.post(`${va}/players/kick`, { player: steam })).status, 409);
		});

		it("adds an id to a list file beside the saves, once, leaving comments alone", async () => {
			fs.mkdirSync(dir(), { recursive: true });
			fs.writeFileSync(path.join(dir(), "adminlist.txt"), "// List admin players ID  ONE per line\r\n");
			const r = await api.post(`${va}/player-lists/admins`, { player: steam });
			assert.equal(r.json.changed, true, JSON.stringify(r.json));
			assert.equal(fs.readFileSync(path.join(dir(), "adminlist.txt"), "utf8"), `// List admin players ID  ONE per line\r\n${steam}\r\n`);
			assert.equal((await api.post(`${va}/player-lists/admins`, { player: steam })).json.changed, false);
			await api.post(`${va}/player-lists/admins`, { player: other });
			const shown = (await api.get(`${va}/player-admin`)).json.lists.find((l) => l.id === "admins");
			assert.deepEqual(shown.entries.map((e) => e.id), [steam, other], "comments aren't entries");
			assert.match(shown.file, /saves[\\/]adminlist\.txt$/);
		});

		it("creates a list file that isn't there yet", async () => {
			assert.equal(fs.existsSync(path.join(dir(), "bannedlist.txt")), false);
			assert.equal((await api.post(`${va}/player-lists/bans`, { player: steam })).json.changed, true);
			assert.equal(fs.readFileSync(path.join(dir(), "bannedlist.txt"), "utf8"), `${steam}\n`);
		});

		it("removes one id and keeps the rest", async () => {
			assert.equal((await api.del(`${va}/player-lists/admins/${steam}`)).json.changed, true);
			assert.equal(fs.readFileSync(path.join(dir(), "adminlist.txt"), "utf8"), `// List admin players ID  ONE per line\r\n${other}\r\n`);
			assert.equal((await api.del(`${va}/player-lists/admins/${steam}`)).json.changed, false);
		});

		it("only takes a real Steam ID", async () => {
			for (const player of ["Steve", "7656119800000000", "765611980000000011", `${steam}\n${other}`, "", "../../x"]) {
				const r = await api.post(`${va}/player-lists/bans`, { player });
				assert.equal(r.status, 400, JSON.stringify(player));
			}
			assert.equal(fs.readFileSync(path.join(dir(), "bannedlist.txt"), "utf8"), `${steam}\n`, "untouched");
		});

	});

	describe("who may", () => {
		it("lets a moderator kick and ban on their servers", async () => {
			assert.equal((await api.call("POST", `${mc}/players/kick`, { player: "Alex" }, { cookie: mod })).status, 200);
			assert.equal((await api.call("GET", `${mc}/player-admin`, undefined, { cookie: mod })).status, 200);
			assert.equal((await api.call("POST", `${mc}/players/ban`, { player: "Alex" }, { cookie: mod })).status, 200);
			assert.match((await activity()).find((e) => e.type === "player.banned").message, /mod-all: Banned Alex/);
			await api.post(`${mc}/players/unban`, { player: "Alex" });
		});

		it("keeps a moderator out of servers that aren't theirs", async () => {
			assert.equal((await api.call("POST", `${mc}/players/kick`, { player: "Alex" }, { cookie: modOther })).status, 403);
			assert.equal((await api.call("GET", `${mc}/player-admin`, undefined, { cookie: modOther })).status, 403);
			assert.equal((await api.call("POST", `${va}/player-lists/bans`, { player: "76561198000000009" }, { cookie: modOther })).status, 403);
		});

		it("keeps viewers out of all of it", async () => {
			assert.equal((await api.call("GET", `${mc}/player-admin`, undefined, { cookie: guest })).status, 403);
			assert.equal((await api.call("POST", `${mc}/players/kick`, { player: "Steve" }, { cookie: guest })).status, 403);
			assert.equal((await api.call("POST", `${mc}/players/ban`, { player: "Steve" }, { cookie: guest })).status, 403);
			assert.equal((await api.call("POST", `${mc}/player-lists/whitelist`, { player: "Steve" }, { cookie: guest })).status, 403);
			assert.equal((await api.call("DELETE", `${mc}/player-lists/whitelist/Steve`, undefined, { cookie: guest })).status, 403);
		});
	});

	describe("a game that isn't covered", () => {
		it("says so instead of offering buttons that do nothing", async () => {
			const r = await api.get("/api/server/Nobody/player-admin");
			assert.equal(r.status, 404);
		});
	});
});

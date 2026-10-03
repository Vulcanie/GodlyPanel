import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runStandIn, stopStandIns, startInstance, serverEntry, GUEST } from "../helpers/instance.js";

// Rotating a server's RCON password: the panel's record and every file of the game that holds it change
// together, servers that share files change together, servers that only share the password are left alone,
// a running server is refused, and a failure puts everything back.

const OLD = "OldSharedPassword-12345";
const SHORT = "pw1234"; // short enough that it could be a word appearing in files for other reasons
const liveImage = "gp-rotation-live.exe";

describe("rotating an RCON password", () => {
	let panel;
	let api;
	let root;

	const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
	const write = (p, text) => {
		fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
		fs.writeFileSync(path.join(root, p), text);
	};
	const record = (name) => JSON.parse(fs.readFileSync(path.join(panel.dir, "servers.json"), "utf8")).servers.find((s) => s.name === name);
	const rotate = (name, body = { confirm: true }, opts) => api.post(`/api/server/${encodeURIComponent(name)}/rcon-password/rotate`, body, opts);
	const preview = (name) => api.get(`/api/server/${encodeURIComponent(name)}/rcon-password/rotation`);

	before(async () => {
		panel = await startInstance({
			prepare: (dir) => {
				root = path.join(dir, "games");
				const script = (map) => `@echo off\r\nstart /MIN "${map}" Ark.exe ${map}?x=1 -RCONPort=1 -ServerAdminPassword=${OLD} -log\r\n`;
				// Two maps in one install: their own scripts, one shared settings file, and the game's typed-command history.
				write("ark/Start_A.bat", script("A"));
				write("ark/Start_B.bat", script("B"));
				write("ark/Saved/Config/WindowsServer/GameUserSettings.ini", `[ServerSettings]\r\nServerAdminPassword=${OLD}\r\nOther=1\r\n`);
				write("ark/Saved/Config/WindowsServer/Game.ini", "[x]\r\nNothing=here\r\n");
				write("ark/Saved/Config/ConsoleHistory.ini", `[History]\r\nCmd=enablecheats ${OLD}\r\nCmd=ServerAdminPassword ${OLD}\r\n`);
				// A Minecraft-like server on its own, and a twin with the same password and no file in common.
				write("mc-one/server.properties", `motd=One\r\nrcon.port=1\r\nrcon.password=${OLD}\r\n`);
				write("mc-one/start.bat", "@echo off\r\njava -jar server.jar\r\n");
				write("mc-two/server.properties", `motd=Two\r\nrcon.port=1\r\nrcon.password=${OLD}\r\n`);
				write("mc-two/start.bat", "@echo off\r\njava -jar server.jar\r\n");
				// Conan keeps the password in Game.ini, beside the ServerSettings.ini the record names.
				write("conan/ServerSettings.ini", "[ServerSettings]\r\nMaxPlayers=40\r\n");
				write("conan/Game.ini", `[RconPlugin]\r\nRconEnabled=1\r\nRconPassword=${OLD}-conan\r\n`);
				write("conan/start.bat", "@echo off\r\nConan.exe\r\n");
				// A short password: only the exact files change, never a neighbour.
				write("short/start.bat", `@echo off\r\nGame.exe +rcon.password "${SHORT}"\r\n`);
				write("short/notes.txt", `the word ${SHORT} appears here for another reason\r\n`);
				write("short/settings.ini", "[a]\r\nb=1\r\n");
				// One that is running, and one whose file can't be written.
				write("live/start.bat", `@echo off\r\nGame.exe -pw ${OLD}\r\n`);
				write("locked/start.bat", `@echo off\r\nGame.exe -pw ${OLD}-locked\r\n`);
				write("locked/settings.ini", `[a]\r\nrcon=${OLD}-locked\r\n`);
				write("nopw/start.bat", "@echo off\r\n");
				runStandIn(path.join(root, "live"), liveImage);
			},
			servers: () => {
				const entry = (name, dir, extra) => serverEntry(path.join(root, dir), { name, type: "custom", method: "rcon", rconPort: 1, ...extra });
				const ark = (name, file, port) => entry(name, "ark", { type: "ark", rconPassword: OLD, startScriptPath: path.join(root, "ark", file), configPaths: { "GameUserSettings.ini": path.join(root, "ark/Saved/Config/WindowsServer/GameUserSettings.ini"), "Game.ini": path.join(root, "ark/Saved/Config/WindowsServer/Game.ini") }, rconPort: port });
				return [
					ark("ArkA", "Start_A.bat", 1),
					ark("ArkB", "Start_B.bat", 2),
					entry("McOne", "mc-one", { type: "minecraft", rconPassword: OLD, startScriptPath: path.join(root, "mc-one/start.bat"), configPath: path.join(root, "mc-one/server.properties") }),
					entry("McTwo", "mc-two", { type: "minecraft", rconPassword: OLD, startScriptPath: path.join(root, "mc-two/start.bat"), configPath: path.join(root, "mc-two/server.properties") }),
					entry("Conan", "conan", { type: "conan", rconPassword: `${OLD}-conan`, startScriptPath: path.join(root, "conan/start.bat"), configPath: path.join(root, "conan/ServerSettings.ini") }),
					entry("Short", "short", { rconPassword: SHORT, startScriptPath: path.join(root, "short/start.bat"), configPath: path.join(root, "short/settings.ini") }),
					entry("Live", "live", { method: "process", processName: liveImage, rconPassword: OLD, startScriptPath: path.join(root, "live/start.bat") }),
					entry("Locked", "locked", { rconPassword: `${OLD}-locked`, startScriptPath: path.join(root, "locked/start.bat"), configPath: path.join(root, "locked/settings.ini") }),
					entry("NoPassword", "nopw", { startScriptPath: path.join(root, "nopw/start.bat") }),
				];
			},
		});
		api = panel.api;
		await api.post("/api/users", { username: "mod-r", password: "ModPass!12345", role: "moderator" });
		await api.post("/api/users", { ...GUEST, role: "guest" }).catch(() => {});
	});
	after(async () => {
		stopStandIns();
		await panel.stop();
	});

	it("is for administrators only, and needs confirming", async () => {
		const mod = await api.cookieFor({ username: "mod-r", password: "ModPass!12345" });
		assert.equal((await rotate("McOne", { confirm: true }, { cookie: mod })).status, 403);
		assert.equal((await preview("McOne").then((r) => r)).status, 200);
		const unconfirmed = await rotate("McOne", {});
		assert.equal(unconfirmed.status, 400);
		assert.equal(unconfirmed.json.code, "not_confirmed");
		assert.equal(record("McOne").rconPassword, OLD);
	});

	it("says what would change before anything does, including servers that share files", async () => {
		const p = (await preview("ArkA")).json;
		assert.deepEqual(p.servers.sort(), ["ArkA", "ArkB"]);
		assert.ok(p.files.some((f) => f.endsWith("GameUserSettings.ini")));
		assert.ok(p.files.some((f) => f.endsWith("Start_A.bat")) && p.files.some((f) => f.endsWith("Start_B.bat")));
		assert.equal(record("ArkA").rconPassword, OLD, "a preview changes nothing");
		assert.deepEqual((await preview("McOne")).json.servers, ["McOne"], "a server with the same password and no shared file is not in the group");
	});

	it("refuses a server with no password, and a running one, and changes nothing", async () => {
		const none = await rotate("NoPassword");
		assert.equal(none.status, 400);
		assert.equal(none.json.code, "no_password");
		const live = await rotate("Live");
		assert.equal(live.status, 409);
		assert.equal(live.json.code, "server_running");
		assert.match(live.json.error, /Stop Live first/);
		assert.equal(read("live/start.bat").includes(OLD), true);
		assert.equal(record("Live").rconPassword, OLD);
	});

	it("changes a server's record and its files together, and leaves a twin with the same password alone", async () => {
		const r = await rotate("McOne");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.deepEqual(r.json.servers, ["McOne"]);
		const now = record("McOne").rconPassword;
		assert.notEqual(now, OLD);
		assert.ok(now.length >= 30 && /^[A-Za-z0-9_-]+$/.test(now), "a long password that is safe in a script or a settings file");
		assert.match(read("mc-one/server.properties"), new RegExp(`rcon.password=${now}\\r\\n`));
		assert.ok(!read("mc-one/server.properties").includes(OLD));
		assert.ok(!JSON.stringify(r.json).includes(now) && !JSON.stringify(r.json).includes(OLD), "the answer never carries a password");
		// The twin is untouched, in its record and its file.
		assert.equal(record("McTwo").rconPassword, OLD);
		assert.ok(read("mc-two/server.properties").includes(OLD));
		assert.ok(!fs.existsSync(path.join(root, "mc-one/server.properties.bak")), "no copy of the old password is left behind");
	});

	it("rotates servers that share files together, to one new password, including the shared file and the history", async () => {
		const r = await rotate("ArkB");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.deepEqual(r.json.servers.sort(), ["ArkA", "ArkB"]);
		const a = record("ArkA").rconPassword;
		assert.equal(record("ArkB").rconPassword, a);
		assert.notEqual(a, OLD);
		for (const f of ["ark/Start_A.bat", "ark/Start_B.bat", "ark/Saved/Config/WindowsServer/GameUserSettings.ini"]) {
			assert.ok(read(f).includes(a) && !read(f).includes(OLD), f);
		}
		assert.equal(read("ark/Saved/Config/WindowsServer/Game.ini"), "[x]\r\nNothing=here\r\n", "a file without the password is not rewritten");
		const history = read("ark/Saved/Config/ConsoleHistory.ini");
		assert.ok(!history.includes(OLD) && !history.includes(a), "the typed-command history is scrubbed, not given the new password");
		assert.match(history, /\[rotated\]/);
		assert.deepEqual(r.json.remaining, [], "nothing left holding the old password");
		assert.equal(r.json.scrubbed.length, 1);
	});

	it("changes a password kept in a neighbouring file of the game's settings", async () => {
		const r = await rotate("Conan");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		const now = record("Conan").rconPassword;
		assert.match(read("conan/Game.ini"), new RegExp(`RconPassword=${now}\\r\\n`));
		assert.ok(!read("conan/Game.ini").includes(OLD));
	});

	it("leaves neighbouring files alone when the password is short enough to be a common word", async () => {
		const r = await rotate("Short");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		const now = record("Short").rconPassword;
		assert.ok(read("short/start.bat").includes(now) && !read("short/start.bat").includes(SHORT));
		assert.ok(read("short/notes.txt").includes(SHORT), "an unrelated file that happens to hold the word is untouched");
		assert.ok(r.json.remaining.some((f) => f.endsWith("notes.txt")), "and it is reported instead");
	});

	it("puts everything back if a file can't be written", async () => {
		const settings = path.join(root, "locked/settings.ini");
		const before = { script: read("locked/start.bat"), settings: read("locked/settings.ini"), record: record("Locked").rconPassword };
		fs.chmodSync(settings, 0o444); // read-only: the write fails after the script has been changed
		try {
			const r = await rotate("Locked");
			assert.equal(r.status, 500);
			assert.equal(r.json.code, "rotation_failed");
			assert.match(r.json.error, /Everything was put back/);
		} finally {
			fs.chmodSync(settings, 0o666);
		}
		assert.equal(read("locked/start.bat"), before.script, "the script is as it was");
		assert.equal(read("locked/settings.ini"), before.settings);
		assert.equal(record("Locked").rconPassword, before.record, "the record still holds the working password");
	});

	it("is recorded in the activity feed", async () => {
		const log = (await api.get("/api/activity?limit=100")).json.filter((e) => e.type === "server.rcon_rotated");
		assert.ok(log.length >= 4);
		assert.ok(log.some((e) => e.data.servers.includes("ArkA") && e.data.servers.includes("ArkB")));
		assert.ok(!JSON.stringify(log).includes(OLD));
	});
});

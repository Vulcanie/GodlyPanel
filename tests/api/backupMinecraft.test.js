import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames, gameLog } from "../helpers/fakeGame.js";
import { propertyValue } from "../../src/server/services/backupService.js";

// Minecraft's world folder is named in server.properties (level-name), and a backup taken while the server runs
// stops it saving for the copy and switches saving back on afterwards.

async function until(check, { timeoutMs = 60_000, everyMs = 300 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("reading a .properties file", () => {
	it("finds a value, ignoring comments, spaces and Windows line ends", () => {
		const text = "#Minecraft server properties\r\nmotd=Hello = world\r\n level-name = My World \r\nlevel-name-not=1\r\n";
		assert.equal(propertyValue(text, "level-name"), "My World");
		assert.equal(propertyValue(text, "motd"), "Hello = world");
		assert.equal(propertyValue(text, "missing"), null);
		assert.equal(propertyValue("#level-name=commented\n", "level-name"), null);
	});
});

describe("Minecraft backups follow level-name", () => {
	let panel;
	let api;
	let dir;

	const server = (name, props) => (root) => {
		const folder = path.join(root, name.toLowerCase().replaceAll(" ", "-"));
		fs.mkdirSync(folder, { recursive: true });
		if (props !== null) fs.writeFileSync(path.join(folder, "server.properties"), props);
		return serverEntry(folder, { name, type: "minecraft", processName: `nope-${name}.exe`, workingDir: folder, installDir: folder });
	};

	before(async () => {
		panel = await startInstance({
			servers: (root) => {
				dir = root;
				return [
					server("Named", "level-name=Survival 2\n")(root),
					server("Plain", "motd=hi\n")(root),
					server("NoFile", null)(root),
					server("Sneaky", "level-name=..\\..\\Windows\n")(root),
					server("Sneakier", "level-name=../elsewhere\n")(root),
				];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	const worldOf = async (name) => {
		const specs = (await api.get(`/api/server/${encodeURIComponent(name)}/backups`)).json.specs;
		return {
			world: path.basename(specs.find((s) => s.label === "World").path),
			nether: path.basename(specs.find((s) => s.label === "Nether").path),
			end: path.basename(specs.find((s) => s.label === "The End").path),
			parent: path.dirname(specs.find((s) => s.label === "World").path),
		};
	};

	it("uses the world named in server.properties, with its Nether and End beside it", async () => {
		const w = await worldOf("Named");
		assert.deepEqual([w.world, w.nether, w.end], ["Survival 2", "Survival 2_nether", "Survival 2_the_end"]);
	});

	it("uses \"world\" when there is no setting, or no file", async () => {
		assert.equal((await worldOf("Plain")).world, "world");
		assert.equal((await worldOf("NoFile")).world, "world");
	});

	it("won't be pointed outside the server's own folder by a level-name that is a path", async () => {
		for (const name of ["Sneaky", "Sneakier"]) {
			const w = await worldOf(name);
			assert.equal(w.world, "world", name);
			assert.equal(w.parent, path.join(dir, name.toLowerCase()), name);
		}
	});
});

describe("a Minecraft backup taken while the server runs", () => {
	let panel;
	let api;
	let folder;
	const base = "/api/server/Fake%20World";
	const online = async () => (await api.get("/api/status")).json["Fake World"]?.online === true;
	const idle = async () => !(await api.get("/api/operations")).json["Fake World"];

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-world");
				const entry = { ...makeFakeGame(folder, { name: "Fake World", rconPort, exe: "gp-fake-world.exe", standardRcon: true }), type: "minecraft" };
				fs.mkdirSync(path.join(folder, "world"), { recursive: true });
				fs.writeFileSync(path.join(folder, "world", "level.dat"), "the world");
				fs.writeFileSync(path.join(folder, "server.properties"), "level-name=world\n");
				return [entry];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("tells the game to stop saving, saves, copies, then lets it save again", async () => {
		assert.equal((await api.post("/api/control/Fake%20World/start")).status, 200);
		assert.equal(await until(online), true);
		await until(idle);

		const r = await api.post(`${base}/backups`, { mode: "live" });
		assert.equal(r.status, 202, JSON.stringify(r.json));
		await until(idle);

		const commands = [...gameLog(folder).matchAll(/rcon: (.+)/g)].map((m) => m[1]).filter((c) => /^save/.test(c));
		assert.deepEqual(commands, ["save-off", "save-all flush", "save-on"]);
		assert.equal(await online(), true, "never stopped");
		const newest = (await api.get(`${base}/backups`)).json.backups[0];
		assert.equal(newest.mode, "live");
		assert.equal(newest.consistent, true, "a copy taken with saving off is a consistent one");
	});
});

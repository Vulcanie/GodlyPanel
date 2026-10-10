import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { serverEntry, runStandIn, stopStandIns, until } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Minecraft operators have a level, 1 to 4, in ops.json. The panel shows it, and sets it, but only where that can work: a running
// server keeps its operators in memory and `op` always gives the server's own default level, so a different level (or removing
// someone) is done with the server stopped, in the file.

const ZAPHOD = { uuid: "11111111-1111-4111-8111-111111111111", name: "Zaphod", level: 2, bypassesPlayerLimit: false };

describe("Minecraft operator levels", () => {
	let panel;
	let api;
	let dir;
	let home;
	let offline;
	let running;
	const ops = (folder = home) => JSON.parse(fs.readFileSync(path.join(folder, "ops.json"), "utf8"));
	const lists = async (name) => (await api.get(`/api/server/${encodeURIComponent(name)}/player-admin`)).json.lists.find((l) => l.id === "admins");
	const url = (name, tail = "") => `/api/server/${encodeURIComponent(name)}/player-lists/admins${tail}`;

	before(async () => {
		panel = await startInProcess({
			servers: (d) => {
				dir = d;
				home = path.join(d, "mc");
				offline = path.join(d, "mc-offline");
				running = path.join(d, "mc-running");
				for (const f of [home, offline, running]) fs.mkdirSync(f, { recursive: true });
				fs.writeFileSync(path.join(home, "ops.json"), JSON.stringify([ZAPHOD], null, 2));
				fs.writeFileSync(path.join(home, "server.properties"), "op-permission-level=3\r\nonline-mode=true\r\n");
				fs.writeFileSync(path.join(offline, "server.properties"), "online-mode=false\r\n");
				fs.writeFileSync(path.join(running, "ops.json"), JSON.stringify([ZAPHOD], null, 2));
				const image = runStandIn(running, "gp-fake-mc.exe");
				const base = { type: "minecraft", method: "process", rconPort: 25575, rconPassword: "pw" };
				return [
					serverEntry(home, { ...base, name: "Mc", processName: "gp-fake-mc-stopped.exe" }),
					serverEntry(offline, { ...base, name: "Mc Offline", processName: "gp-fake-mc-off.exe" }),
					serverEntry(running, { ...base, name: "Mc Running", processName: image }),
				];
			},
		});
		api = panel.api;
		const { deps } = await import("../../src/server/services/playerAdmin.js");
		deps.fetchProfile = async (name) => (name === "Arthur" ? "22222222222242228222222222222222" : null);
	});
	after(async () => {
		stopStandIns();
		await panel.stop();
	});

	it("shows each operator's level, what the levels mean, and the level a new operator gets", async () => {
		const admins = await lists("Mc");
		assert.equal(admins.entries.find((e) => e.name === "Zaphod").level, 2);
		assert.deepEqual(admins.levels.map((l) => l.level), [1, 2, 3, 4]);
		assert.ok(admins.levels.every((l) => l.name && l.description));
		assert.equal(admins.defaultLevel, 3, "from op-permission-level in server.properties");
		assert.equal((await lists("Mc Offline")).defaultLevel, 4, "the game's own default when there is no setting");
	});

	it("changes an operator's level in ops.json when the server is stopped, keeping everything else about them", async () => {
		const r = await api.put(url("Mc", "/Zaphod/level"), { level: 4 });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.deepEqual(ops(), [{ ...ZAPHOD, level: 4 }]);
		assert.match(r.json.message, /level 4/);
	});

	it("matches the name whatever its case, and refuses someone who isn't an operator", async () => {
		assert.equal((await api.put(url("Mc", "/zaphod/level"), { level: 1 })).status, 200);
		assert.equal(ops()[0].level, 1);
		const r = await api.put(url("Mc", "/Nobody/level"), { level: 2 });
		assert.equal(r.status, 404);
		assert.match(r.json.error, /isn't an operator/);
	});

	it("refuses a level that isn't 1 to 4", async () => {
		for (const level of [0, 5, 2.5, "x", null, undefined]) {
			const r = await api.put(url("Mc", "/Zaphod/level"), { level });
			assert.equal(r.status, 400, String(level));
			assert.equal(r.json.code, "bad_level");
		}
		assert.equal(ops()[0].level, 1, "and nothing changed");
	});

	it("adds an operator at the chosen level when stopped, with the UUID Mojang gives", async () => {
		const r = await api.post(url("Mc"), { player: "Arthur", level: 2 });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		const arthur = ops().find((e) => e.name === "Arthur");
		assert.equal(arthur.level, 2);
		assert.equal(arthur.uuid, "22222222-2222-4222-8222-222222222222");
		assert.equal(arthur.bypassesPlayerLimit, false);
	});

	it("adds at the server's default level when none is chosen", async () => {
		const r = await api.post(url("Mc Offline"), { player: "Ford" });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(ops(offline)[0].level, 4);
	});

	it("works out the UUID itself for an offline-mode server (no Mojang account to ask)", async () => {
		const bytes = crypto.createHash("md5").update("OfflinePlayer:Ford").digest();
		bytes[6] = (bytes[6] & 0x0f) | 0x30;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		const h = bytes.toString("hex");
		assert.equal(ops(offline)[0].uuid, `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`);
	});

	it("says so when there is no such Minecraft account, and adds nobody", async () => {
		const r = await api.post(url("Mc"), { player: "NoSuchAccount", level: 1 });
		assert.equal(r.status, 404);
		assert.match(r.json.error, /Couldn't find a Minecraft account/);
		assert.equal(ops().some((e) => e.name === "NoSuchAccount"), false);
	});

	it("takes an operator out of ops.json when stopped, leaving the others", async () => {
		const r = await api.del(url("Mc", "/Arthur"));
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.deepEqual(ops().map((e) => e.name), ["Zaphod"]);
		assert.equal((await api.del(url("Mc", "/Arthur"))).json.changed, false, "and says so when they weren't one");
	});

	it("will not touch ops.json that isn't valid JSON", async () => {
		fs.writeFileSync(path.join(home, "ops.json"), "{ not json");
		const r = await api.put(url("Mc", "/Zaphod/level"), { level: 3 });
		assert.ok(r.status === 404 || r.status === 409, `${r.status} ${JSON.stringify(r.json)}`);
		assert.equal(fs.readFileSync(path.join(home, "ops.json"), "utf8"), "{ not json");
		fs.writeFileSync(path.join(home, "ops.json"), JSON.stringify([ZAPHOD]));
	});

	describe("while the server is running", () => {
		before(async () => {
			// The in-process panel runs no background poller, so ask for the status ourselves.
			const { pollServerNow } = await import("../../src/server/services/pollingService.js");
			assert.equal(await until(async () => (await pollServerNow("Mc Running"))?.online === true, { timeoutMs: 60_000 }), true, "the stand-in is seen running");
		});

		it("will not change a level: the running server would lose the change", async () => {
			const r = await api.put(url("Mc Running", "/Zaphod/level"), { level: 4 });
			assert.equal(r.status, 409, JSON.stringify(r.json));
			assert.match(r.json.error, /Stop the server first/);
			assert.equal(ops(running)[0].level, 2);
		});

		it("will not add at a level other than its default, and says what to do", async () => {
			const r = await api.post(url("Mc Running"), { player: "Arthur", level: 1 });
			assert.equal(r.status, 409, JSON.stringify(r.json));
			assert.match(r.json.error, /default level \(4\)/);
			assert.equal(ops(running).length, 1);
		});

		it("will not take someone out of the file behind the server's back", async () => {
			// With no console reachable here the command fails; what matters is that the file was not edited.
			await api.del(url("Mc Running", "/Zaphod"));
			assert.equal(ops(running).length, 1);
		});
	});
});

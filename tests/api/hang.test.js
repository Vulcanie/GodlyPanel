import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// A game that is still running but has stopped answering: said once, and restarted
// after the set time for a server that asked for that; left alone for one that didn't.

async function until(check, { timeoutMs = 120_000, everyMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("a hung server", () => {
	let panel;
	let api;
	let folders;
	const enc = encodeURIComponent;
	const events = async (name, types) => (await api.get(`/api/activity?server=${enc(name)}&types=${types}&limit=50`)).json;
	const online = async (name) => (await api.get("/api/status")).json[name]?.online === true;
	const idle = async (name) => !(await api.get("/api/operations")).json[name];

	before(async () => {
		const ports = [await freePort(), await freePort()];
		folders = [];
		panel = await startInstance({
			config: { recovery: { graceSec: 10, startupGraceMin: 1, maxRestarts: 3, windowMin: 30 } },
			servers: (dir) => {
				const make = (name, exe, port) => {
					const folder = path.join(dir, exe);
					folders.push(folder);
					return makeFakeGame(folder, { name, rconPort: port, exe: `${exe}.exe` });
				};
				return [make("Hang Restart", "gp-fake-hang-a", ports[0]), make("Hang Leave", "gp-fake-hang-b", ports[1])];
			},
		});
		api = panel.api;
	});
	after(async () => {
		for (const f of folders) killFakeGames(f);
		await panel.stop();
	});

	it("checks the setting", async () => {
		assert.equal((await api.put("/api/server/Hang%20Restart/options", { unresponsiveMinutes: 0 })).status, 400);
		assert.equal((await api.put("/api/server/Hang%20Restart/options", { unresponsiveMinutes: 500 })).status, 400);
		assert.equal((await api.put("/api/server/Hang%20Restart/options", { restartWhenUnresponsive: "yes" })).status, 400);
		const ok = await api.put("/api/server/Hang%20Restart/options", { autoRestart: true, restartWhenUnresponsive: true, unresponsiveMinutes: 1 });
		assert.equal(ok.json.restartWhenUnresponsive, true);
		assert.equal(ok.json.unresponsiveMinutes, 1);
		await api.put("/api/server/Hang%20Leave/options", { autoRestart: true });
		assert.equal((await api.get("/api/server/Hang%20Leave/options")).json.restartWhenUnresponsive, false, "off unless asked for");
	});

	it("restarts the one that asked, after the time it set, and leaves the other alone", async () => {
		for (const name of ["Hang Restart", "Hang Leave"]) {
			await api.post(`/api/control/${enc(name)}/start`);
			assert.equal(await until(() => online(name)), true);
			await until(() => idle(name));
		}
		await sleep(7000);
		for (const name of ["Hang Restart", "Hang Leave"]) await api.post(`/api/control/${enc(name)}/rcon`, { command: "hang" }).catch(() => {});

		assert.equal(await until(async () => (await events("Hang Restart", "server.unresponsive")).length > 0, { timeoutMs: 60_000 }), true, "it is said to be unresponsive");
		assert.equal((await events("Hang Restart", "server.hung")).length, 0, "but not restarted yet");
		assert.equal(await until(async () => (await events("Hang Restart", "server.hung")).length > 0, { timeoutMs: 150_000 }), true, "restarted after the minute");
		const hung = (await events("Hang Restart", "server.hung"))[0];
		assert.match(hung.message, /hadn't answered for 1 minutes/);
		assert.equal(await until(() => online("Hang Restart"), { timeoutMs: 120_000 }), true, "and it is back");
		assert.equal(await online("Hang Leave"), false, "the other is still hung");
		assert.equal((await events("Hang Leave", "server.hung")).length, 0);
		assert.equal((await events("Hang Leave", "server.unresponsive")).length, 1, "and said so once");
	});
});

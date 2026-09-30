import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// Servers set to start with the panel are started shortly after it comes up,
// and the others are left alone.

async function until(check, { timeoutMs = 90_000, everyMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("starting servers with the panel", () => {
	let panel;
	let folders;

	before(async () => {
		const ports = [await freePort(), await freePort()];
		folders = [];
		panel = await startInstance({
			config: { startup: { autoStartDelaySec: 0 } },
			prepare: (dir) => {
				fs.mkdirSync(path.join(dir, "state"), { recursive: true });
				fs.writeFileSync(path.join(dir, "state", "server-options.json"), JSON.stringify({ "Fake Auto": { autoStart: true } }));
			},
			servers: (dir) => {
				const make = (name, exe, port) => {
					const folder = path.join(dir, exe);
					folders.push(folder);
					return makeFakeGame(folder, { name, rconPort: port, exe: `${exe}.exe` });
				};
				return [make("Fake Auto", "gp-fake-auto", ports[0]), make("Fake Manual", "gp-fake-manual", ports[1])];
			},
		});
	});
	after(async () => {
		for (const f of folders) killFakeGames(f);
		await panel.stop();
	});

	it("starts the one that asked, and leaves the other", async () => {
		const status = async () => (await panel.api.get("/api/status")).json;
		assert.equal(await until(async () => (await status())["Fake Auto"]?.online === true), true, "it came up by itself");
		assert.equal((await status())["Fake Manual"].online, false);
		const events = (await panel.api.get("/api/activity?types=server.autostarted")).json;
		assert.equal(events.length, 1);
		assert.equal(events[0].server, "Fake Auto");
	});

	it("reports the option back", async () => {
		assert.equal((await panel.api.get("/api/server/Fake%20Auto/options")).json.autoStart, true);
		assert.equal((await panel.api.get("/api/server/Fake%20Manual/options")).json.autoStart, false);
	});
});

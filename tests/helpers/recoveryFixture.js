import path from "node:path";
import { startInstance, freePort, sleep } from "./instance.js";
import { makeFakeGame, killFakeGames } from "./fakeGame.js";

// Shared by the crash-recovery test files. They are separate files (each with its own panel and its own
// stand-in game) so they run side by side instead of one after another; the waiting in them is real time.

export async function until(check, { timeoutMs = 90_000, everyMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

/** A panel with one stand-in game per entry of `games` ({ name, exe, extra }), recovery timings short enough for tests. */
export async function bootRecovery(games) {
	const ports = [];
	for (let i = 0; i < games.length; i += 1) ports.push(await freePort());
	const folders = [];
	const panel = await startInstance({
		// Short, so the tests don't take minutes; the defaults are tried by the unit tests.
		config: { recovery: { graceSec: 10, startupGraceMin: 1, maxRestarts: 2, windowMin: 15 } },
		servers: (dir) =>
			games.map((g, i) => {
				const folder = path.join(dir, g.exe);
				folders.push(folder);
				return makeFakeGame(folder, { name: g.name, rconPort: ports[i], exe: `${g.exe}.exe`, ...(g.extra ?? {}) });
			}),
	});
	const api = panel.api;
	return {
		panel,
		api,
		online: async (name) => (await api.get("/api/status")).json[name]?.online === true,
		events: async (server, types) => (await api.get(`/api/activity?server=${encodeURIComponent(server)}&types=${types}&limit=50`)).json,
		idle: async (name) => !(await api.get("/api/operations")).json[name],
		async stop() {
			for (const f of folders) killFakeGames(f);
			await panel.stop();
		},
	};
}

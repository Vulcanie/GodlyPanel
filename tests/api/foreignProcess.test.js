import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// Two servers running the same program (Valheim is always valheim_server.exe) must not
// be able to stop each other. Stopping by program name once closed every copy on the
// PC: stopping a test server stopped a real one with players on it. Stop now only ever
// acts on programs running from the server's own folder.

const IMAGE = "gp-fake-same.exe";
const alive = (folder) =>
	execFileSync("powershell", ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter "Name='${IMAGE}'" | Where-Object { $_.ExecutablePath -like '${folder.replaceAll("'", "''")}*' } | Measure-Object).Count`], { encoding: "utf8" }).trim() !== "0";

async function until(check, { timeoutMs = 90_000, everyMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("two servers running the same program", () => {
	let panel;
	let api;
	let mine;
	let theirs;
	let other;

	before(async () => {
		const ports = [await freePort(), await freePort()];
		panel = await startInstance({
			servers: (dir) => {
				mine = path.join(dir, "mine");
				theirs = path.join(dir, "theirs");
				// Managed by the panel, with no RCON, so Stop has only the program's name to go on.
				const entry = makeFakeGame(mine, { name: "Same Program", rconPort: ports[0], exe: IMAGE });
				delete entry.rconPort;
				delete entry.rconPassword;
				entry.method = "process";
				theirs = path.join(dir, "theirs");
				makeFakeGame(theirs, { name: "Unmanaged", rconPort: ports[1], exe: IMAGE });
				return [entry];
			},
		});
		api = panel.api;
		// Another server with the very same program name, started outside the panel.
		other = spawn(path.join(theirs, IMAGE), ["fakegame.cjs", "--rcon", String(ports[1]), "--password", "pw", "--home", theirs], { cwd: theirs, stdio: "ignore", windowsHide: true });
		await sleep(1500);
	});
	after(async () => {
		other?.kill();
		killFakeGames(mine);
		killFakeGames(theirs);
		await panel.stop();
	});

	it("says it cannot stop a server whose own program isn't running, instead of stopping the other one", async () => {
		assert.equal(alive(theirs), true);
		const r = await api.post("/api/control/Same%20Program/stop");
		// Nothing of this server's own was running, so there was nothing to stop.
		assert.ok([200, 409, 500].includes(r.status));
		await sleep(3000);
		assert.equal(alive(theirs), true, "the other server was not touched");
	});

	it("stops its own copy and leaves the other one running", async () => {
		await until(async () => !(await api.get("/api/operations")).json["Same Program"]);
		assert.equal((await api.post("/api/control/Same%20Program/start")).status, 200);
		assert.equal(await until(() => alive(mine)), true);
		await sleep(2000);
		await until(async () => !(await api.get("/api/operations")).json["Same Program"], { timeoutMs: 60_000 });

		const stop = await api.post("/api/control/Same%20Program/stop");
		assert.equal(stop.status, 200, JSON.stringify(stop.json));
		assert.equal(await until(() => !alive(mine), { timeoutMs: 60_000 }), true, "its own copy stopped");
		assert.equal(alive(theirs), true, "and the other server is still running");
	});
});

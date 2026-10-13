import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { ADMIN, serverEntry } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// What a moderator limited to some servers is told about the others, and what an unexpected action name or time range can do.
// Limiting a moderator to one game only means something if the live stream, the activity list and the log search keep the other
// games' business from them too, not just the buttons.

const MOD = { username: "limitedmod", password: "TestMod!2345" };

describe("a moderator limited to one server", () => {
	let panel;
	let api;
	let httpServer;
	let base;
	let modCookie;
	let adminCookie;

	before(async () => {
		panel = await startInProcess({
			servers: (dir) => {
				for (const name of ["a", "b"]) {
					fs.mkdirSync(path.join(dir, name), { recursive: true });
					fs.writeFileSync(path.join(dir, name, "server.log"), "");
				}
				return [
					serverEntry(path.join(dir, "a"), { name: "Alpha", processName: "nope-a.exe", rconPort: 9, rconPassword: "alpha-secret-rcon" }),
					serverEntry(path.join(dir, "b"), { name: "Bravo", processName: "nope-b.exe" }),
				];
			},
		});
		api = panel.api;
		adminCookie = await api.cookieFor(ADMIN);
		await api.post("/api/users", { ...MOD, role: "moderator", servers: ["Alpha"] }, { cookie: adminCookie });
		modCookie = await api.cookieFor(MOD);
		httpServer = http.createServer(panel.app);
		await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
		base = `http://127.0.0.1:${httpServer.address().port}`;
	});
	after(async () => {
		httpServer?.closeAllConnections();
		await new Promise((resolve) => httpServer?.close(resolve));
		await panel.stop();
	});

	/** Open the live stream and collect what arrives until `stop()`. */
	async function listen(cookie) {
		const seen = [];
		const controller = new AbortController();
		const res = await fetch(`${base}/api/events`, { headers: { Cookie: cookie }, signal: controller.signal });
		assert.equal(res.status, 200);
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		const pump = (async () => {
			try {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) return;
					seen.push(decoder.decode(value));
				}
			} catch {
				// Aborted.
			}
		})();
		return {
			text: () => seen.join(""),
			async stop() {
				controller.abort();
				await pump;
			},
		};
	}

	const until = async (check, ms = 3000) => {
		const end = Date.now() + ms;
		while (Date.now() < end) {
			if (check()) return true;
			await new Promise((r) => setTimeout(r, 25));
		}
		return check();
	};

	it("is not sent the activity of a server it can't reach on the live stream", async () => {
		const { logActivity } = await import("../../src/server/services/activityLog.js");
		const stream = await listen(modCookie);
		const adminStream = await listen(adminCookie);
		try {
			logActivity({ type: "server.crashed", server: "Bravo", message: "Bravo went down unexpectedly." });
			logActivity({ type: "server.crashed", server: "Alpha", message: "Alpha went down unexpectedly." });
			logActivity({ type: "schedule.skipped", message: "A schedule about no server in particular." });
			assert.ok(await until(() => stream.text().includes("Alpha went down")), "its own server's event arrives");
			assert.ok(await until(() => stream.text().includes("no server in particular")), "an event about no server in particular arrives");
			assert.ok(await until(() => adminStream.text().includes("Bravo went down")), "an administrator sees all of them");
			assert.ok(!stream.text().includes("Bravo"), "the other server's event does not arrive");
		} finally {
			await stream.stop();
			await adminStream.stop();
		}
	});

	it("is given a full page of its own server's activity, not what is left after other servers' events took the room", async () => {
		const { logActivity } = await import("../../src/server/services/activityLog.js");
		// Apart in time, since the list is ordered by it.
		const tick = () => new Promise((r) => setTimeout(r, 5));
		for (let i = 0; i < 3; i += 1) {
			logActivity({ type: "backup.completed", server: "Alpha", message: `Alpha backup ${i}` });
			await tick();
		}
		for (let i = 0; i < 6; i += 1) {
			logActivity({ type: "backup.completed", server: "Bravo", message: `Bravo backup ${i}` });
			await tick();
		}
		const r = await api.get("/api/activity?types=backup.completed&limit=5", { cookie: modCookie });
		assert.equal(r.status, 200);
		assert.equal(r.json.length, 3, "all three of its own, though the newest six were another server's");
		assert.ok(r.json.every((e) => e.server === "Alpha"));
	});

	it("can't use the log search to find out what a password in a log says", async () => {
		const logs = await api.get("/api/server/Alpha/logs", { cookie: modCookie });
		assert.equal(logs.status, 200);
		const captured = logs.json.find((l) => l.name === "Alpha.log" || l.label?.includes("captured"));
		// Put a line in the log the panel captures for the server.
		const { serverLogPath } = await import("../../src/server/services/windowlessLauncher.js");
		const file = serverLogPath({ name: "Alpha" });
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, "starting up\nconnecting with -ServerPassword=hunter2swordfish and going on\nready\n");
		const id = (await api.get("/api/server/Alpha/logs", { cookie: modCookie })).json.find((l) => l.name === path.basename(file))?.id;
		assert.ok(id, `the captured log is listed (${JSON.stringify(captured)})`);

		// The line is shown masked...
		const read = await api.get(`/api/server/Alpha/logs/${id}`, { cookie: modCookie });
		assert.ok(!JSON.stringify(read.json).includes("hunter2swordfish"));
		// ...and searching for the secret itself finds nothing, so a guess can't be confirmed one piece at a time.
		const guess = await api.get(`/api/server/Alpha/logs/${id}?search=hunter2`, { cookie: modCookie });
		assert.equal(guess.status, 200);
		assert.deepEqual(guess.json.lines, [], "no line comes back for a guess at the hidden part");
		// Searching for the visible words still works, with the secret masked.
		const fair = await api.get(`/api/server/Alpha/logs/${id}?search=going%20on`, { cookie: modCookie });
		assert.equal(fair.json.lines.length, 1);
		assert.ok(!fair.json.lines[0].includes("hunter2"));
		// An administrator sees it all.
		const admin = await api.get(`/api/server/Alpha/logs/${id}?search=hunter2`, { cookie: adminCookie });
		assert.equal(admin.json.lines.length, 1);
	});

	it("refuses an action named after something on every object (\"constructor\" used to hand back the server entry, RCON password and all)", async () => {
		for (const action of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
			const r = await api.post(`/api/control/Alpha/${action}`, {}, { cookie: adminCookie });
			assert.equal(r.status, 400, `${action}: ${JSON.stringify(r.json)}`);
			assert.ok(!JSON.stringify(r.json).includes("alpha-secret-rcon"));
		}
	});

	it("takes a chart range named after something on every object for the default range", async () => {
		const r = await api.get("/api/metrics/system?range=constructor", { cookie: adminCookie });
		assert.equal(r.status, 200);
		assert.equal(r.json.range, "24h");
	});
});

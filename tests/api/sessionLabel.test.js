import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { GUEST } from "../helpers/instance.js";
import { startInstance, serverEntry } from "../helpers/instance.js";
import path from "node:path";

// The Session shown for a server on the dashboard and in Discord is automatic (the public address and the game port) for every game,
// unless the server's own page sets text for it. It is a label only.

describe("a server's Session", () => {
	let panel;
	let api;
	let viewer;
	const status = async (cookie) => (await api.get("/api/status", cookie === undefined ? undefined : { cookie })).json;
	const put = (name, body, cookie) => api.put(`/api/server/${encodeURIComponent(name)}/session`, body, cookie === undefined ? undefined : { cookie });

	before(async () => {
		panel = await startInstance({
			config: { network: { publicAddress: "203.0.113.9" } },
			servers: (d) => {
				const base = (name, extra) => serverEntry(path.join(d, name), { name, method: "process", processName: `nope-${name}.exe`, ...extra });
				return [
					base("Valheim", { type: "valheim", port: 8042, sessionName: "GodlyHeroes" }),
					base("Nameless", { type: "custom", port: 8050 }),
					base("NoPort", { type: "custom" }),
				];
			},
		});
		api = panel.api;
		viewer = await api.cookieFor(GUEST);
	});
	after(() => panel.stop());

	const settle = async (check) => {
		for (let i = 0; i < 60; i++) {
			if (await check()) return true;
			await new Promise((r) => setTimeout(r, 250));
		}
		return false;
	};

	it("is the public address and the game port for every game, whatever its own name is", async () => {
		assert.equal(await settle(async () => (await status()).Valheim?.session === "203.0.113.9:8042"), true, JSON.stringify(await status()));
		const s = await status();
		assert.equal(s.Valheim.sessionName, "GodlyHeroes", "the game's own name is untouched");
		assert.equal(s.Nameless.session, "203.0.113.9:8050");
	});

	it("is the game's name, as before, for a server with no port to build an address from", async () => {
		assert.equal((await status()).NoPort.session, undefined);
	});

	it("can be set from the server's own page, and shows instead of the address", async () => {
		const r = await put("Valheim", { sessionLabel: "  Godly   Heroes — vanilla " });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(r.json.sessionLabel, "Godly Heroes — vanilla");
		assert.equal(await settle(async () => (await status()).Valheim.session === "Godly Heroes — vanilla"), true);
		const s = (await status()).Valheim;
		assert.equal(s.joinAddress, "203.0.113.9:8042", "the address itself is still there");
		assert.equal(s.sessionLabel, "Godly Heroes — vanilla");
	});

	it("goes back to automatic when cleared", async () => {
		assert.equal((await put("Valheim", { sessionLabel: "" })).status, 200);
		assert.equal(await settle(async () => (await status()).Valheim.session === "203.0.113.9:8042"), true);
	});

	it("follows a port change by itself while automatic", async () => {
		assert.equal((await api.put("/api/server/Nameless/ports", { ports: { port: 8051 } })).status, 200);
		assert.equal(await settle(async () => (await status()).Nameless.session === "203.0.113.9:8051"), true);
	});

	it("refuses what isn't text, or is too long", async () => {
		assert.equal((await put("Valheim", { sessionLabel: 5 })).status, 400);
		assert.equal((await put("Valheim", {})).status, 400);
		assert.equal((await put("Valheim", { sessionLabel: "x".repeat(101) })).status, 400);
	});

	it("is for administrators", async () => {
		assert.equal((await put("Valheim", { sessionLabel: "nope" }, viewer)).status, 403);
	});

	it("is what viewers are shown, without the label's source", async () => {
		await put("Valheim", { sessionLabel: "Come play" });
		await settle(async () => (await status(viewer)).Valheim?.session === "Come play");
		const seen = (await status(viewer)).Valheim;
		assert.equal(seen.session, "Come play");
		assert.equal("sessionLabel" in seen, false);
		assert.equal("serverPassword" in seen, false);
	});

	it("is recorded who changed it", async () => {
		const log = (await api.get("/api/activity?limit=100")).json.map((e) => e.message).join("\n");
		assert.match(log, /admin \(admin\): changed the session text of Valheim/);
	});
});

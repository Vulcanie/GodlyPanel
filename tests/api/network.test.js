import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { startInstance, freePort, GUEST, serverEntry } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// "Can people reach it?" and the setup checklists. Windows Firewall is read for real
// (read-only); adding a rule is only ever asked for as a dry run here, since it would
// change this PC's firewall and needs a permission prompt.

describe("reachability and checklists", () => {
	let panel;
	let api;
	let folder;
	let gamePort;
	let mod;
	let guest;

	before(async () => {
		const rconPort = await freePort();
		gamePort = await freePort();
		const queryPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-net");
				return [
					makeFakeGame(folder, { name: "Fake Net", rconPort, exe: "gp-fake-net.exe", ports: { port: gamePort, queryPort } }),
					// Windrose runs in invite-code mode by default and listens on no port of its own.
					serverEntry(path.join(dir, "windrose"), { name: "Rose", type: "windrose", method: "process", port: 8890, processName: "WindroseServer-Win64-Shipping.exe" }),
				];
			},
		});
		api = panel.api;
		await api.post("/api/users", { username: "mod-net", password: "TestMod!2345", role: "moderator" });
		mod = await api.cookieFor({ username: "mod-net", password: "TestMod!2345" });
		guest = await api.cookieFor(GUEST);
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("tells the owner of a Windrose server that no port needs opening, instead of listing one the game doesn't use", async () => {
		const r = (await api.get("/api/server/Rose/network?refresh=1")).json;
		assert.deepEqual(r.firewall.needs, []);
		assert.deepEqual(r.firewall.ports, []);
		assert.match(r.firewall.note, /invite code/);
		assert.match(r.firewall.note, /no port needs opening/);
		assert.equal(r.firewall.allOpen, false, "nothing to report as open");
		// A game with ordinary ports has no such note.
		assert.equal((await api.get("/api/server/Fake%20Net/network")).json.firewall.note, null);
	});

	it("lists this PC's addresses, with the address to give friends", async () => {
		const r = (await api.get("/api/server/Fake%20Net/network")).json;
		assert.ok(Array.isArray(r.lan));
		for (const a of r.lan) {
			assert.match(a.address, /^\d+\.\d+\.\d+\.\d+$/);
			assert.ok(!a.address.startsWith("127."));
			assert.equal(a.join, `${a.address}:${gamePort}`);
		}
	});

	it("reads Windows Firewall and says which of the server's ports nothing covers", async () => {
		const r = (await api.get("/api/server/Fake%20Net/network?refresh=1")).json;
		assert.equal(r.firewall.readable, true, r.firewall.error);
		const ports = r.firewall.ports.map((p) => `${p.port}/${p.protocol}`);
		assert.ok(ports.includes(`${gamePort}/UDP`), ports.join());
		assert.ok(r.firewall.ports.every((p) => typeof p.open === "boolean"));
		assert.equal(r.firewall.ports.find((p) => p.port === gamePort).open, false, "a random port has no rule");
		assert.equal(r.firewall.allOpen, false);
		assert.deepEqual(r.router.map((p) => p.port), r.firewall.needs.map((p) => p.port));
	});

	it("shows what it would add without adding anything", async () => {
		const r = await api.post("/api/server/Fake%20Net/network/firewall-rule", { dryRun: true });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(r.json.changed, false);
		assert.equal(r.json.profile, "Private,Domain");
		assert.match(r.json.commands.join(" "), new RegExp(`-LocalPort [\\d,]*${gamePort}`));
		const pub = await api.post("/api/server/Fake%20Net/network/firewall-rule", { dryRun: true, publicNetworks: true });
		assert.equal(pub.json.profile, "Any");
	});

	it("checklists a server: files, backups, crash recovery and the firewall", async () => {
		const r = (await api.get("/api/server/Fake%20Net/checklist")).json;
		const byId = Object.fromEntries(r.items.map((i) => [i.id, i]));
		assert.equal(byId.files.status, "ok");
		assert.equal(byId["backup-made"].status, "warn", "never backed up");
		assert.equal(byId.recovery.status, "warn");
		assert.equal(byId.firewall.status, "todo");
		assert.equal(r.worst, "todo");
		assert.ok(r.done >= 1 && r.done < r.total);
		assert.equal(byId["backup-made"].fix.tab, "backups");
	});

	it("notices things getting done", async () => {
		await api.put("/api/server/Fake%20Net/options", { autoRestart: true });
		const r = (await api.get("/api/server/Fake%20Net/checklist?firewall=0")).json;
		assert.equal(r.items.find((i) => i.id === "recovery").status, "ok");
		assert.equal(r.items.some((i) => i.id === "firewall"), false, "the firewall is only read when asked");
	});

	it("checklists the panel: backups off this PC, starting with Windows, alerts", async () => {
		const r = (await api.get("/api/settings/checklist")).json;
		const byId = Object.fromEntries(r.items.map((i) => [i.id, i]));
		assert.equal(byId.servers.status, "ok");
		assert.equal(byId.offsite.status, "warn");
		assert.equal(byId.startup.status, "warn");
		assert.equal(byId.alerts.status, "ok", "Windows notifications are on by default");
		await api.post("/api/settings/backup-destinations", { type: "folder", name: "Shelf", folder: { path: path.join(path.dirname(folder), "shelf") } });
		assert.equal((await api.get("/api/settings/checklist")).json.items.find((i) => i.id === "offsite").status, "ok");
	});

	it("lets a moderator look, but only an administrator change the firewall", async () => {
		assert.equal((await api.call("GET", "/api/server/Fake%20Net/network", undefined, { cookie: mod })).status, 200);
		assert.equal((await api.call("GET", "/api/server/Fake%20Net/checklist", undefined, { cookie: mod })).status, 200);
		assert.equal((await api.call("POST", "/api/server/Fake%20Net/network/firewall-rule", { dryRun: true }, { cookie: mod })).status, 403);
		assert.equal((await api.call("GET", "/api/settings/checklist", undefined, { cookie: mod })).status, 403);
	});

	it("keeps viewers out", async () => {
		assert.equal((await api.call("GET", "/api/server/Fake%20Net/network", undefined, { cookie: guest })).status, 403);
		assert.equal((await api.call("GET", "/api/server/Fake%20Net/checklist", undefined, { cookie: guest })).status, 403);
		assert.equal((await api.call("POST", "/api/server/Fake%20Net/network/firewall-rule", { dryRun: true }, { cookie: guest })).status, 403);
	});
});

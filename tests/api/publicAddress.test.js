import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, until } from "../helpers/instance.js";

// With the public address set, a server's address is that plus its game port, worked out when it is shown, so it follows a port
// change by itself. The servers here are shaped like the ones on a real install, which carried hand-typed copies of an address
// (an old port, or one with the game port wrong) in their session name.

describe("the address shown for joining a server", () => {
	let panel;
	let api;
	let dir;
	const status = async () => (await api.get("/api/status")).json;
	const entry = async (name) => (await api.get("/api/servers")).json.find?.((s) => s.name === name);

	before(async () => {
		panel = await startInstance({
			servers: (d) => {
				dir = d;
				fs.writeFileSync(path.join(d, "Start_Ragnarok.bat"), '@echo off\r\nstart /MIN "R" ArkAscendedServer.exe TheIsland_WP?SessionName=GodlyRagnarok -Port=7790 -QueryPort=7791 -RCONPort=7792\r\n');
				const base = (name, extra) => serverEntry(path.join(d, name), { name, processName: `nope-${name.replace(/\W/g, "")}.exe`, ...extra });
				return [
					base("BMC6", { type: "minecraft", method: "process", port: 8030, sessionName: "50.82.40.142:25569", joinAddress: "50.82.40.142:25569" }),
					base("Valheim", { type: "valheim", method: "process", port: 8042, sessionName: "GodlyHeroes( 50.82.40.142:7777 )" }),
					base("Ark-Ragnarok", { type: "ark", method: "process", sessionName: "GodlyRagnarok", startScriptPath: path.join(d, "Start_Ragnarok.bat") }),
					base("GodlyShrouded", { type: "enshrouded", method: "process", port: 8045 }),
				];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("is empty by default, and shows what a server carries until it is set", async () => {
		assert.equal((await api.get("/api/settings")).json.config.network.publicAddress, "");
		const s = await status();
		assert.equal(s.BMC6.joinAddress, "50.82.40.142:25569", "the old hand-typed copy, as before");
		assert.equal(s.GodlyShrouded.joinAddress, undefined);
	});

	it("refuses something that isn't an address, and keeps what it had", async () => {
		await api.put("/api/settings", { network: { publicAddress: "not an address" } });
		assert.equal((await api.get("/api/settings")).json.config.network.publicAddress, "");
	});

	it("keeps just the host of what is pasted", async () => {
		const r = await api.put("/api/settings", { network: { publicAddress: "http://50.82.40.142:8765/" } });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal((await api.get("/api/settings")).json.config.network.publicAddress, "50.82.40.142");
	});

	it("shows each server's address as the public address and its game port", async () => {
		await until(async () => (await status()).BMC6?.joinAddress === "50.82.40.142:8030", { timeoutMs: 30_000 });
		const s = await status();
		assert.equal(s.BMC6.joinAddress, "50.82.40.142:8030", "not the old 25569");
		assert.equal(s.Valheim.joinAddress, "50.82.40.142:8042", "not the old 7777");
		assert.equal(s.GodlyShrouded.joinAddress, "50.82.40.142:8045");
	});

	it("takes the port from the start script for a game whose entry doesn't record one", async () => {
		await until(async () => (await status())["Ark-Ragnarok"]?.joinAddress === "50.82.40.142:7790", { timeoutMs: 30_000 });
		assert.equal((await status())["Ark-Ragnarok"].joinAddress, "50.82.40.142:7790");
	});

	it("removes the stale hand-typed addresses from the servers, and keeps real session names", async () => {
		const s = await status();
		assert.equal(s.BMC6.sessionName || "", "", "a session name that was only an address is gone");
		assert.equal(s.Valheim.sessionName, "GodlyHeroes", "the name stays, the address is taken out of it");
		assert.equal(s["Ark-Ragnarok"].sessionName, "GodlyRagnarok");
	});

	it("follows a port change by itself", async () => {
		// Stop being "running" is not needed: the stand-in server isn't. Change BMC6's game port through the panel.
		const r = await api.put("/api/server/BMC6/ports", { ports: { port: 8031 } });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		await until(async () => (await status()).BMC6?.joinAddress === "50.82.40.142:8031", { timeoutMs: 30_000 });
		assert.equal((await status()).BMC6.joinAddress, "50.82.40.142:8031");
	});

	it("goes back to what a server carries if the public address is cleared", async () => {
		await api.put("/api/settings", { network: { publicAddress: "" } });
		await until(async () => (await status()).GodlyShrouded?.joinAddress === undefined, { timeoutMs: 30_000 });
		assert.equal((await status()).GodlyShrouded.joinAddress, undefined);
	});

	it("says in Activity which servers were updated", async () => {
		const log = (await api.get("/api/activity?limit=100")).json;
		const event = log.find((e) => e.type === "server.addresses_updated");
		assert.ok(event, "recorded");
		assert.match(event.message, /BMC6/);
		assert.match(event.message, /Valheim/);
		assert.doesNotMatch(event.message, /Ark-Ragnarok/);
	});
});

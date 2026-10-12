import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startInProcess } from "../helpers/inprocess.js";

// The Discord status post shows each online server's address (the public address and its game port) beside its session name, and
// the create form is told which games have an address for a session field.

describe("addresses in Discord and on the create form", () => {
	let panel;
	let api;
	let buildServerDashboard;

	before(async () => {
		panel = await startInProcess({});
		api = panel.api;
		({ buildServerDashboard } = await import("../../src/server/services/pollingService.js"));
	});
	after(() => panel.stop());

	const on = (extra) => ({ online: true, playerCount: 2, serverPassword: "pw", ...extra });

	it("shows the address on its own line beside a session name", () => {
		const text = buildServerDashboard({ "Ark-Ragnarok": on({ sessionName: "GodlyRagnarok", joinAddress: "50.82.40.142:7790" }) });
		assert.match(text, /• Session: `GodlyRagnarok`/);
		assert.match(text, /• Address: `50\.82\.40\.142:7790`/);
	});

	it("shows only the address for a server whose session was just the address (Minecraft)", () => {
		const text = buildServerDashboard({ BMC6: on({ sessionName: "", joinAddress: "50.82.40.142:8030" }) });
		assert.match(text, /• Address: `50\.82\.40\.142:8030`/);
		assert.doesNotMatch(text, /Session: `N\/A`/);
	});

	it("still says N/A when a server has neither, as before", () => {
		const text = buildServerDashboard({ Plain: on({}) });
		assert.match(text, /• Session: `N\/A`/);
		assert.doesNotMatch(text, /Address:/);
	});

	it("does not show an offline server's address (it is listed as offline, as before)", () => {
		const text = buildServerDashboard({ Down: { online: false, joinAddress: "50.82.40.142:1" } });
		assert.match(text, /Down\*\* — offline/);
		assert.doesNotMatch(text, /50\.82\.40\.142/);
	});

	it("tells the create form which games have an address for a session field", async () => {
		const templates = (await api.get("/api/templates")).json;
		assert.equal(templates.find((t) => t.id === "minecraft-modpack").sessionIsAddress, true);
		assert.equal(templates.find((t) => t.id === "valheim").sessionIsAddress, false);
		assert.equal(templates.filter((t) => t.sessionIsAddress).length, 1, "only Minecraft; the others' session fields are names");
	});

	it("gives the form the public address to fill it from", async () => {
		assert.equal((await api.get("/api/templates/minecraft-modpack/suggest")).json.publicAddress, "");
		await api.put("/api/settings", { network: { publicAddress: "203.0.113.9" } });
		assert.equal((await api.get("/api/templates/minecraft-modpack/suggest")).json.publicAddress, "203.0.113.9");
	});
});

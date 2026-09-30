import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Facts about what real game installs accept, found by running them, pinned here so a
// template change can't quietly undo them.

const template = (id) => GAME_TEMPLATES.find((t) => t.id === id);

describe("Enshrouded config", () => {
	const build = (p) => JSON.parse(template("enshrouded").buildConfigFile({ sessionName: "S", port: 15637, ...p }).content);
	const passwords = (config) => config.userGroups.map((g) => g.password);

	it("gives the two groups different passwords, which the game insists on", () => {
		for (const p of [{ serverPassword: "join" }, { serverPassword: "join", adminPassword: "join" }, { serverPassword: "join", adminPassword: "" }, { serverPassword: "" }, {}]) {
			const [admin, friend] = passwords(build(p));
			assert.notEqual(admin, friend, JSON.stringify(p));
			assert.ok(admin.length >= 6, "the admin password isn't blank");
		}
	});

	it("uses the admin password it was given, and the server password for players", () => {
		const config = build({ serverPassword: "join", adminPassword: "boss-pass" });
		assert.deepEqual(passwords(config), ["boss-pass", "join"]);
		assert.equal(config.userGroups[0].canKickBan, true);
		assert.equal(config.userGroups[1].canKickBan, false);
	});

	it("asks for the admin password when creating", () => {
		assert.ok(template("enshrouded").fields.includes("adminPassword"));
	});
});

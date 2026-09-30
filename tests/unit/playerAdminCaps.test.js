import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { capabilities, kickPlayer, PlayerAdminError } from "../../src/server/services/playerAdmin.js";

describe("what each game can do about players", () => {
	it("Palworld: kick, ban and unban by Steam ID through its console, no lists", () => {
		const caps = capabilities({ type: "Palword", rconPort: 8895, rconPassword: "x" });
		assert.equal(caps.supported, true);
		assert.equal(caps.kick, true);
		assert.equal(caps.ban, true);
		assert.equal(caps.unban, true);
		assert.deepEqual(caps.lists, []);
	});

	it("offers nothing that needs a console when there isn't one set up", () => {
		const caps = capabilities({ type: "Palword" });
		assert.equal(caps.kick, false);
		assert.equal(caps.ban, false);
	});

	it("says a game it doesn't know can't be managed", () => {
		assert.deepEqual(capabilities({ type: "someotherthing" }).lists, []);
		assert.equal(capabilities({ type: "someotherthing" }).supported, false);
	});

	it("only lets a Steam ID through for Palworld", async () => {
		const server = { name: "P", type: "Palword", rconPort: 1, rconPassword: "x" };
		for (const who of ["Steve", "7656119800000000", "steam_7656119800000000", "76561198000000000 ; Save", "76561198000000000\nDoExit"]) {
			await assert.rejects(() => kickPlayer(server, who), (e) => e instanceof PlayerAdminError && e.code === "bad_player", who);
		}
	});
});

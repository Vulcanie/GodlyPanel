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

describe("ARK's player lists", () => {
	it("are read from the files the game keeps beside its program, and offer kick and ban", async () => {
		const { readLists } = await import("../../src/server/services/playerAdmin.js");
		const fs = await import("node:fs");
		const os = await import("node:os");
		const path = await import("node:path");
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-ark-"));
		fs.writeFileSync(path.join(dir, "BanList.txt"), "76561198000000001\r\n76561198000000002\r\n");
		fs.writeFileSync(path.join(dir, "PlayersJoinNoCheckList.txt"), "");
		const server = { name: "A", type: "ark", workingDir: dir, rconPort: 1, rconPassword: "x" };
		const caps = capabilities(server);
		assert.deepEqual([caps.kick, caps.ban, caps.unban], [true, true, true]);
		assert.deepEqual(caps.lists.map((l) => l.id), ["whitelist", "bans"]);
		const lists = await readLists(server);
		assert.deepEqual(lists.find((l) => l.id === "bans").entries.map((e) => e.id), ["76561198000000001", "76561198000000002"]);
		assert.deepEqual(lists.find((l) => l.id === "whitelist").entries, []);
		fs.rmSync(dir, { recursive: true, force: true });
	});
});

describe("Rust", () => {
	it("offers kick, ban and unban through its console", () => {
		const caps = capabilities({ type: "rust", rconPort: 28018, rconPassword: "x" });
		assert.deepEqual([caps.supported, caps.kick, caps.ban, caps.unban], [true, true, true, true]);
	});

	it("is known not to answer \"say\"", async () => {
		const { answersNothing } = await import("../../src/server/services/gameCommands.js");
		assert.equal(answersNothing({ type: "rust" }, "say hello"), true);
		assert.equal(answersNothing({ type: "rust" }, "server.save"), false);
		assert.equal(answersNothing({ type: "ark" }, "say hello"), false);
	});
});

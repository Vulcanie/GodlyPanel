import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// A player the game doesn't name must not become a player called "[object Object]", and what older versions wrote about one is hidden.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-tracker-"));
process.env.GHP_DATA_DIR = dir;
const { noteServerPlayers, playersFor } = await import("../../src/server/services/playerTracker.js");

describe("the player tracker and players with no name", () => {
	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	it("does not record an unnamed player as anyone", () => {
		noteServerPlayers("V", { online: true, playerList: [] }, 1000);
		noteServerPlayers("V", { online: true, playerList: [{ raw: {} }, {}, "", null] }, 2000);
		assert.deepEqual(playersFor("V").online, []);
		assert.deepEqual(playersFor("V").recent, []);
	});

	it("still records named players", () => {
		noteServerPlayers("V", { online: true, playerList: ["Zaphod"] }, 3000);
		assert.deepEqual(playersFor("V").online.map((p) => p.name), ["Zaphod"]);
	});

	it("hides entries older versions wrote for an unnamed player", () => {
		const folder = path.join(dir, "state", "players");
		const file = fs.readdirSync(folder).find((f) => f.startsWith("V-"));
		fs.appendFileSync(path.join(folder, file), `${JSON.stringify({ t: "2026-01-01T00:00:00Z", type: "join", name: "[object Object]" })}\n`);
		const view = playersFor("V");
		assert.ok(view.recent.every((e) => e.name !== "[object Object]"));
		assert.ok(view.people.every((p) => p.name !== "[object Object]"));
	});
});

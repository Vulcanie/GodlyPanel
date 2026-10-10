import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { playerNames } from "../../src/server/services/pollingService.js";
import { connectedFromLog } from "../../src/server/services/valheimPlayers.js";

// Valheim's query says how many players there are but gives each a blank name. That used to reach the player list as the object
// itself and show up as "[object Object]". The names it does have come from the log.

describe("names in a query's player list", () => {
	it("keeps real names, as strings or as the name of an entry", () => {
		assert.deepEqual(playerNames([{ name: "Alice" }, "Bob", { name: " Carol " }]), ["Alice", "Bob", " Carol "]);
	});

	it("never lets an entry with no name through as the entry", () => {
		assert.deepEqual(playerNames([{ name: "" }, { raw: { score: 0 } }, {}, null, undefined, 7, { name: "   " }]), []);
	});

	it("copes with no list at all", () => {
		assert.deepEqual(playerNames(undefined), []);
	});
});

describe("who is on Valheim, from its log", () => {
	const join = (id, name, zdo = "123456:1") => [`10/09/2026 20:00:00: Got handshake from client ${id}`, "10/09/2026 20:00:01: Network version check, their:12, mine:12", "10/09/2026 20:00:02: Server: New peer connected,sending global keys", `10/09/2026 20:00:03: Got character ZDOID from ${name} : ${zdo}`];

	it("lists whoever has joined", () => {
		const log = [...join("Steam_1", "Zaphod"), ...join("playfab/ABC", "Ford Prefect", "99:1")].join("\n");
		assert.deepEqual(connectedFromLog(log), ["Zaphod", "Ford Prefect"]);
	});

	it("drops someone whose connection closed", () => {
		const log = [...join("Steam_1", "Zaphod"), ...join("Steam_2", "Arthur"), "10/09/2026 20:30:00: Closing socket Steam_1"].join("\n");
		assert.deepEqual(connectedFromLog(log), ["Arthur"]);
	});

	it("keeps someone who died: 0:0 is a character gone, not a player gone", () => {
		const log = [...join("Steam_1", "Zaphod"), "10/09/2026 20:10:00: Got character ZDOID from Zaphod : 0:0"].join("\n");
		assert.deepEqual(connectedFromLog(log), ["Zaphod"]);
	});

	it("does not mix up a respawn with a new arrival, and still removes them when they leave", () => {
		const log = [
			...join("Steam_1", "Zaphod"),
			...join("Steam_2", "Arthur"),
			"10/09/2026 20:10:00: Got character ZDOID from Zaphod : 0:0",
			"10/09/2026 20:10:09: Got character ZDOID from Zaphod : 777:1", // respawned; the last handshake was Arthur's
			"10/09/2026 20:30:00: Closing socket Steam_1",
		].join("\n");
		assert.deepEqual(connectedFromLog(log), ["Arthur"]);
	});

	it("handles names with spaces and punctuation, and Windows line endings", () => {
		const log = join("Steam_1", "Sir Löwenherz : the 3rd").join("\r\n");
		assert.deepEqual(connectedFromLog(log), ["Sir Löwenherz : the 3rd"]);
	});

	it("says nobody for a log with nothing in it", () => {
		assert.deepEqual(connectedFromLog(""), []);
		assert.deepEqual(connectedFromLog("Game server connected\nsome other line"), []);
	});
});

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

// What the panel makes of a game's console replies: the list of players, and a reply that isn't RCON at all.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-rcon-"));
process.env.GHP_DATA_DIR = dir;
const { parseRconPlayers } = await import("../../src/server/services/pollingService.js");
const { withRcon } = await import("../../src/server/services/rconClient.js");

describe("reading ARK's player list", () => {
	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	it("takes the name from between the number and the id", () => {
		assert.deepEqual(parseRconPlayers("0. Alice, 76561198000000001\n1. Bob, 76561198000000002\n"), ["Alice", "Bob"]);
	});

	it("keeps a name that has a comma in it whole", () => {
		assert.deepEqual(parseRconPlayers("0. Smith, John, 76561198000000001"), ["Smith, John"]);
	});

	it("copes with a line that has no id, and with the 'no players' reply", () => {
		assert.deepEqual(parseRconPlayers("0. Alice\r\n"), ["Alice"]);
		assert.deepEqual(parseRconPlayers("No Players Connected\n"), []);
		assert.deepEqual(parseRconPlayers("0. , 76561198000000001"), [], "a blank name is not a player");
	});
});

describe("a reply that isn't RCON", () => {
	it("is refused, instead of being waited on (a negative length used to spin the panel for ever)", async () => {
		const stand = net.createServer((socket) => {
			socket.on("data", () => {
				const bad = Buffer.alloc(12);
				bad.writeInt32LE(-4, 0);
				socket.write(bad);
			});
			socket.on("error", () => {});
		});
		await new Promise((resolve) => stand.listen(0, "127.0.0.1", resolve));
		try {
			const started = Date.now();
			await assert.rejects(withRcon({ name: "Odd", type: "conan", host: "127.0.0.1", rconPort: stand.address().port, rconPassword: "x" }, async () => "unreachable", { timeoutMs: 3000 }), /isn't RCON/);
			assert.ok(Date.now() - started < 2500, "it did not wait out the timeout");
		} finally {
			await new Promise((resolve) => stand.close(resolve));
		}
	});
});

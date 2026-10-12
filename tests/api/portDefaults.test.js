import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { serverEntry } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Where a new server's ports start and which way they move. The starts are set far from
// anything a real PC listens on, since a port something is holding right now is skipped.

describe("default ports for new servers", () => {
	let panel;
	let api;
	const suggest = async (id) => (await api.get(`/api/templates/${id}/suggest`)).json.ports;

	before(async () => {
		panel = await startInProcess({
			config: { portAllocation: { gameStart: 41000, gameStep: 3, rconStart: 42000, rconStep: -1, reservedPorts: [] } },
			servers: (dir) => [
				// Holds the first game run (41000–41002) and the first RCON port.
				serverEntry(dir, { name: "First", type: "conan", port: 41000, queryPort: 41002, rconPort: 42000, processName: "nope.exe" }),
			],
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("puts the game port, the port after it and the query port together, after the ones taken", async () => {
		const ports = await suggest("conan");
		assert.equal(ports.port, 41003);
		assert.equal(ports.queryPort, 41005, "game + 2: the port in between is the game's own");
		assert.equal(ports.rconPort, 41999, "RCON counts down from its own start, past the one taken");
	});

	it("gives a game that keeps more ports beside the game port a longer run", async () => {
		const valheim = await suggest("valheim");
		assert.equal(valheim.port, 41003, "game, game + 1 and game + 2 are all Valheim's");
		const sevenDays = await suggest("7days");
		assert.equal(sevenDays.port, 41003);
		assert.equal(sevenDays.telnetPort, 41999, "telnet comes from the RCON range, as RCON does");
	});

	it("follows a changed start and step, counting down when the step is negative", async () => {
		const saved = await api.put("/api/settings", { portAllocation: { gameStart: 43000, gameStep: 5, rconStart: 44000, rconStep: 2 } });
		assert.equal(saved.status, 200);
		const ports = await suggest("conan");
		assert.deepEqual([ports.port, ports.queryPort, ports.rconPort], [43000, 43002, 44000]);

		// Counting down from inside the taken run: every run that touches 41000–41002 is skipped.
		await api.put("/api/settings", { portAllocation: { gameStart: 41001, gameStep: -3 } });
		const down = await suggest("conan");
		assert.deepEqual([down.port, down.queryPort], [40995, 40997]);
	});
});

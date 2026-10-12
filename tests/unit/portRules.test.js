import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf, usageOf, firstSafePort, blockLayout, firstFreeRun } from "../../src/server/data/portRules.js";

describe("the port after the game port is kept free for every game", () => {
	it("adds a precautionary offset 1 unless the game already declares one", () => {
		assert.deepEqual(implicitPortsOf({}), [{ offset: 1, label: "a companion port", precaution: true }]);
		assert.deepEqual(implicitPortsOf(null).map((i) => i.offset), [1]);
		const conan = implicitPortsOf(GAME_TEMPLATES.find((t) => t.id === "conan"));
		assert.deepEqual(conan, [{ offset: 1, label: "its raw UDP socket" }], "a known port replaces the precaution");
		assert.deepEqual(implicitPortsOf(GAME_TEMPLATES.find((t) => t.id === "valheim")).map((i) => i.offset), [1, 2]);
		assert.deepEqual(implicitPortsOf(GAME_TEMPLATES.find((t) => t.id === "7days")).map((i) => i.offset), [1, 2, 3]);
	});

	it("words a known port and a precaution differently", () => {
		assert.equal(usageOf("Conan Exiles", { label: "its raw UDP socket" }), "Conan Exiles uses for its raw UDP socket");
		assert.match(usageOf("Palworld", { precaution: true, label: "x" }), /may use for a companion port/);
	});

	it("suggests the first port past everything held", () => {
		assert.equal(firstSafePort(7777, [{ offset: 1 }, { offset: 2 }]), 7780);
		assert.equal(firstSafePort(8892, [{ offset: 1 }]), 8894);
	});

	it("lays a game's ports out as one run: game, what it keeps beside it, query", () => {
		const layout = (id) => blockLayout(GAME_TEMPLATES.find((t) => t.id === id));
		assert.deepEqual(layout("conan"), { queryOffset: 2, size: 3 });
		assert.deepEqual(layout("valheim"), { queryOffset: null, size: 3 }, "no query port, but it holds game + 1 and + 2");
		assert.deepEqual(layout("7days"), { queryOffset: null, size: 4 });
		assert.deepEqual(layout("dragonwilds"), { queryOffset: null, size: 2 });
	});

	it("finds the first run of free ports, counting up or down", async () => {
		const taken = new Set([100, 101, 102, 107]);
		const isTaken = async (port) => taken.has(port);
		assert.equal(await firstFreeRun({ start: 1100, step: 3, width: 3, isTaken: async (p) => p >= 1100 && p <= 1102 }), 1103);
		assert.equal(await firstFreeRun({ start: 2000, step: -1, width: 1, isTaken: async (p) => p === 2000 || p === 1999 }), 1998);
		assert.equal(await firstFreeRun({ start: 2000, step: 0, width: 1, isTaken: async (p) => p === 2000 }), 2001, "0 is treated as 1");
		assert.equal(await firstFreeRun({ start: 65534, step: 3, width: 3, isTaken }), null, "runs out at the top");
		assert.equal(await firstFreeRun({ start: 1026, step: -1, width: 1, isTaken: async (p) => p >= 1024 }), null, "and at 1024");
	});

	it("no template's own default ports break the rule they enforce", () => {
		for (const t of GAME_TEMPLATES) {
			const game = t.ports.find((p) => p.key === "port");
			if (!game) continue;
			const held = implicitPortsOf(t).map((i) => game.default + i.offset);
			for (const p of t.ports) {
				if (p.key === "port") continue;
				assert.equal(held.includes(p.default), false, `${t.id}: ${p.label} default ${p.default} is a port the game keeps`);
			}
			const defaults = t.ports.map((p) => p.default);
			assert.equal(new Set(defaults).size, defaults.length, `${t.id}: two defaults are the same`);
		}
	});
});

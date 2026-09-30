import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf, usageOf, firstSafePort } from "../../src/server/data/portRules.js";

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

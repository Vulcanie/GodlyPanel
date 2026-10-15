import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stopGraceMs } from "../../src/server/services/serverControl.js";

// Stop asks a server to close and only forces it after a grace period. Satisfactory writes its whole world on the way out, which
// took longer than the usual 15 seconds on a real install, so it is given 30.

describe("how long Stop waits before forcing a server closed", () => {
	it("is 30 seconds for Satisfactory", () => {
		assert.equal(stopGraceMs({ type: "satisfactory" }), 30_000);
	});

	it("is 30 seconds for SCUM, whose clean exit took 13 to 15 seconds on a real install", () => {
		assert.equal(stopGraceMs({ type: "scum" }), 30_000);
	});

	it("is 15 seconds for every other game, and for a server with no type", () => {
		for (const type of ["valheim", "rust", "7days", "minecraft", undefined]) assert.equal(stopGraceMs({ type }), 15_000, String(type));
	});
});

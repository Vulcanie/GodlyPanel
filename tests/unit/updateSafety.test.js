import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beforeUpdateEnabled } from "../../src/server/services/updateSafety.js";

// Whether a game update takes a backup first: a server's own choice wins, and only when it has none does the panel-wide
// setting apply. Null means "follow the panel", so a server that was never touched follows it.

describe("whether a game update backs up first", () => {
	it("follows the panel setting when the server has no choice of its own", () => {
		assert.equal(beforeUpdateEnabled(null, true), true);
		assert.equal(beforeUpdateEnabled(null, false), false);
		assert.equal(beforeUpdateEnabled(undefined, true), true);
	});

	it("lets a server's own choice override the panel setting", () => {
		assert.equal(beforeUpdateEnabled(false, true), false);
		assert.equal(beforeUpdateEnabled(true, false), true);
	});
});

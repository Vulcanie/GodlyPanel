import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beforeUpdateEnabled, watchHealth } from "../../src/server/services/updateSafety.js";
import { serverStatus } from "../../src/server/services/pollingService.js";

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

// The wait after an update-and-reboot: ok the first time the server is seen online, failed when the time runs out.
describe("watching a server come back after an update", () => {
	const name = "Health Unit";
	it("is failed when the server never shows online", async () => {
		serverStatus[name] = { online: false };
		assert.equal(await watchHealth({ name }, { timeoutMs: 120, pollMs: 20 }), "failed");
	});
	it("is ok as soon as the server shows online", async () => {
		serverStatus[name] = { online: false };
		setTimeout(() => (serverStatus[name] = { online: true }), 60);
		assert.equal(await watchHealth({ name }, { timeoutMs: 2000, pollMs: 20 }), "ok");
	});
	it("is ok at once for a server that is already online", async () => {
		serverStatus[name] = { online: true };
		assert.equal(await watchHealth({ name }, { timeoutMs: 50, pollMs: 20 }), "ok");
	});
});

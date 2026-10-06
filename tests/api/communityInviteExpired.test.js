import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInProcess } from "../helpers/inprocess.js";

// A community code that has expired: it isn't offered, the person holding it is told it ran out, and it is read back from disk.
// (Its own file: an in-process panel is one per test file. The rest of the community code's tests are in communityInvite.test.js.)

describe("a code that has run out", () => {
	let panel;
	before(async () => {
		panel = await startInProcess({
			prepare: (dir) => {
				fs.mkdirSync(path.join(dir, "state"), { recursive: true });
				fs.writeFileSync(path.join(dir, "state", "community-invite.json"), JSON.stringify({ enabled: true, code: "OLDD-CODE", createdAt: 1, expiresAt: Date.now() - 1000, maxJoins: null, joins: 0 }));
			},
		});
	});
	after(() => panel.stop());

	it("is not offered, and tells the person who has it that it ran out", async () => {
		const api = panel.api;
		assert.equal((await (await api.fetch(`/api/auth/join`)).json()).open, false);
		const r = await api.fetch(`/api/auth/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "OLDD-CODE", username: "late-friend", password: "LatePass!123" }) });
		assert.equal(r.status, 403);
		assert.equal((await r.json()).code, "closed");
		assert.equal((await api.get("/api/users/invite")).json.closedBecause, "expired");
	});

	it("is kept across a restart of the panel's data (the code was read from disk)", async () => {
		assert.equal((await panel.api.get("/api/users/invite")).json.code, "OLDD-CODE");
	});
});

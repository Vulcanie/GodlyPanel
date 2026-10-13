import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { ADMIN } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Changing your own password asks for the current one. Every role may do it (a moderator was refused with a 403 on the panel's own
// address), and a run of wrong "current passwords" is slowed down like wrong sign-ins are, so an unattended signed-in browser can't
// be used to guess the password.

describe("changing your own password", () => {
	let panel;
	let api;
	const MOD = { username: "modp", password: "TestMod!2345" };

	before(async () => {
		panel = await startInProcess({});
		api = panel.api;
		const admin = await panel.api.cookieFor(ADMIN);
		await api.post("/api/users", { ...MOD, role: "moderator" }, { cookie: admin });
	});
	after(() => panel.stop());

	it("lets a moderator change theirs", async () => {
		const cookie = await panel.api.cookieFor(MOD);
		const r = await api.post("/api/auth/change-password", { currentPassword: MOD.password, newPassword: "NewModPass!98765" }, { cookie });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		MOD.password = "NewModPass!98765";
	});

	it("slows down repeated wrong current passwords, and the right one does not get through while it is slowed", async () => {
		const cookie = await panel.api.cookieFor(MOD);
		let last;
		for (let i = 0; i < 8; i += 1) last = await api.post("/api/auth/change-password", { currentPassword: "not-it", newPassword: "Whatever!987654" }, { cookie });
		assert.equal(last.status, 403);
		const blocked = await api.post("/api/auth/change-password", { currentPassword: MOD.password, newPassword: "Whatever!987654" }, { cookie });
		assert.equal(blocked.status, 429);
		assert.ok(blocked.headers.get("retry-after"));
		// Sign-in is counted apart: the account can still sign in.
		assert.ok(await panel.api.cookieFor(MOD));
	});
});

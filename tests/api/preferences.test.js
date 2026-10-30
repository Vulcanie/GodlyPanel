import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADMIN, GUEST } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// "Don't show this again" is kept on the person's account, not in the browser, so it holds whichever browser, address or device
// they use, and one person's choice isn't another's.

describe("what a person has chosen to hide", () => {
	let panel;
	let api;
	let admin;
	let viewer;
	const get = async (cookie) => (await api.get("/api/auth/preferences", { cookie })).json.prefs;
	const put = (body, cookie) => api.put("/api/auth/preferences", body, { cookie });

	before(async () => {
		panel = await startInProcess({});
		api = panel.api;
		admin = await panel.api.cookieFor(ADMIN);
		viewer = await panel.api.cookieFor(GUEST);
	});
	after(() => panel.stop());

	it("starts with nothing hidden", async () => {
		assert.deepEqual(await get(admin), {});
	});

	it("keeps the choice, and gives it back to the same person from another sign-in", async () => {
		assert.deepEqual((await put({ checklistDismissed: true }, admin)).json.prefs, { checklistDismissed: true });
		const elsewhere = await panel.api.cookieFor(ADMIN, { "user-agent": "Some other browser" });
		assert.deepEqual(await get(elsewhere), { checklistDismissed: true });
	});

	it("keeps it on disk, so a restart doesn't bring the list back", async () => {
		const stored = JSON.parse(fs.readFileSync(path.join(panel.dir, "users.json"), "utf8"));
		assert.deepEqual(stored.users.find((u) => u.username === "admin").prefs, { checklistDismissed: true });
	});

	it("is per person: a viewer's list is their own", async () => {
		assert.deepEqual(await get(viewer), {});
		assert.equal((await put({ checklistDismissed: true }, viewer)).status, 200);
		assert.deepEqual(await get(admin), { checklistDismissed: true });
	});

	it("remembers which update's banner was closed, and clears it again", async () => {
		await put({ updateBannerDismissed: "0.1.0-alpha.20" }, admin);
		assert.equal((await get(admin)).updateBannerDismissed, "0.1.0-alpha.20");
		await put({ updateBannerDismissed: null }, admin);
		assert.equal("updateBannerDismissed" in (await get(admin)), false);
	});

	it("can be switched back on", async () => {
		await put({ checklistDismissed: false }, admin);
		assert.deepEqual(await get(admin), {});
	});

	it("refuses anything that isn't a setting it keeps, or the wrong kind of value", async () => {
		for (const body of [{ role: "admin" }, { passwordHash: "x" }, { checklistDismissed: "yes" }, { updateBannerDismissed: 5 }, { updateBannerDismissed: "" }, { constructor: 1 }]) {
			const r = await put(body, admin);
			assert.equal(r.status, 400, JSON.stringify(body));
		}
		assert.deepEqual(await get(admin), {});
		const stored = JSON.parse(fs.readFileSync(path.join(panel.dir, "users.json"), "utf8"));
		assert.equal(stored.users.find((u) => u.username === "admin").role, "admin");
	});

	it("needs a sign-in, and does not show up in the activity log as a change", async () => {
		assert.equal((await api.get("/api/auth/preferences", { cookie: "" })).status, 401);
		const log = (await api.get("/api/activity?limit=200", { cookie: admin })).json.map((e) => e.message).join("\n");
		assert.doesNotMatch(log, /preferences/);
	});

	it("keeps the chosen language, and gives it back from another sign-in", async () => {
		assert.equal((await put({ language: "es" }, admin)).json.prefs.language, "es");
		const elsewhere = await panel.api.cookieFor(ADMIN, { "user-agent": "Some other browser" });
		assert.equal((await get(elsewhere)).language, "es");
	});

	it("clears the language when set to null", async () => {
		assert.equal((await put({ language: null }, admin)).status, 200);
		assert.equal("language" in (await get(admin)), false);
	});

	it("refuses anything that does not look like a language code", async () => {
		for (const value of ["../x", "EN", "english", "es_ES", "", 5, "e", "es-419", "a".repeat(20)]) {
			const r = await put({ language: value }, admin);
			assert.equal(r.status, 400, JSON.stringify(value));
		}
		assert.equal("language" in (await get(admin)), false);
	});

	it("keeps each person's language to themselves", async () => {
		await put({ language: "en-XA" }, viewer);
		assert.equal((await get(viewer)).language, "en-XA");
		assert.equal("language" in (await get(admin)), false);
	});
});

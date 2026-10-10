import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADMIN } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// The Activity list can be searched, filtered by kind, level, server and time, and sorted either way, across the whole log
// rather than just the newest page; a moderator limited to some servers only ever sees theirs.

const at = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const EVENTS = [
	{ t: at(600), type: "server.crashed", server: "Alpha", level: "error", message: "Alpha went down unexpectedly." },
	{ t: at(500), type: "backup.completed", server: "Alpha", level: "info", message: "Backup of Alpha finished." },
	{ t: at(400), type: "backup.failed", server: "Beta", level: "error", message: "Backup of Beta failed: the disk is full." },
	{ t: at(300), type: "auth.failed", server: null, level: "warn", message: 'A sign-in as "root" failed.', data: { ip: "10.0.0.9" } },
	{ t: at(200), type: "admin.action", server: "Beta", level: "info", message: "admin (admin): started Beta", data: { user: "admin" } },
	{ t: at(100), type: "server.restarted.auto", server: "Alpha", level: "info", message: "Alpha was restarted automatically." },
	{ t: at(10), type: "panel.updated", server: null, level: "info", message: "Updated GodlyPanel." },
];

describe("searching the activity", () => {
	let panel;
	let api;
	let limited;
	const search = async (query = "", cookie) => (await api.get(`/api/activity/search?${query}`, cookie === undefined ? undefined : { cookie })).json;
	const names = (r) => r.events.map((e) => e.message);

	before(async () => {
		panel = await startInProcess({
			prepare: (dir) => {
				fs.mkdirSync(path.join(dir, "state"), { recursive: true });
				fs.writeFileSync(path.join(dir, "state", "activity.jsonl"), EVENTS.map((e) => JSON.stringify(e)).join("\n") + "\n");
			},
		});
		api = panel.api;
		assert.equal((await api.post("/api/auth/login", ADMIN)).status, 200);
		assert.equal((await api.post("/api/users", { username: "mod-lim", password: "TestMod!2345", role: "moderator", servers: ["Alpha"] })).status, 200);
		limited = await panel.api.cookieFor({ username: "mod-lim", password: "TestMod!2345" });
		// Signing in and making the account were logged too; the tests count events, so go back to just the seeded ones.
		fs.writeFileSync(path.join(panel.dir, "state", "activity.jsonl"), `${EVENTS.map((e) => JSON.stringify(e)).join("\n")}\n`);
	});
	after(() => panel.stop());

	it("lists everything, newest first, with how many there are", async () => {
		const r = await search();
		assert.equal(r.total, EVENTS.length);
		assert.equal(r.events[0].message, "Updated GodlyPanel.");
		assert.equal(r.events.at(-1).message, "Alpha went down unexpectedly.");
	});

	it("sorts oldest first when asked", async () => {
		const r = await search("order=asc");
		assert.equal(r.events[0].message, "Alpha went down unexpectedly.");
	});

	it("searches the text, the kind, the server and the details, whatever the case", async () => {
		assert.deepEqual(names(await search("q=DISK%20is%20full")), ["Backup of Beta failed: the disk is full."]);
		assert.equal((await search("q=backup.")).total, 2, "by kind");
		assert.equal((await search("q=10.0.0.9")).total, 1, "by something in the details");
		assert.equal((await search("q=nothing-like-this")).total, 0);
	});

	it("filters by kind, as a prefix", async () => {
		assert.equal((await search("types=backup.")).total, 2);
		assert.equal((await search("types=auth.,admin.")).total, 2);
	});

	it("filters by level", async () => {
		assert.equal((await search("level=error")).total, 2);
		assert.equal((await search("level=warn,error")).total, 3);
	});

	it("filters by server, and by time", async () => {
		assert.equal((await search("server=Beta")).total, 2);
		assert.equal((await search(`from=${encodeURIComponent(at(250))}`)).total, 3);
		assert.equal((await search(`to=${encodeURIComponent(at(250))}`)).total, 4);
	});

	it("combines them", async () => {
		const r = await search("server=Alpha&level=info&order=asc");
		assert.deepEqual(names(r), ["Backup of Alpha finished.", "Alpha was restarted automatically."]);
	});

	it("pages, saying how many there are in all", async () => {
		const first = await search("limit=3");
		assert.equal(first.events.length, 3);
		assert.equal(first.total, EVENTS.length);
		const next = await search("limit=3&offset=3");
		assert.equal(next.events.length, 3);
		assert.notEqual(next.events[0].message, first.events[0].message);
		assert.equal((await search("limit=3&offset=6")).events.length, 1);
	});

	it("names the servers and kinds in the log, for the filter menus, whatever is filtered", async () => {
		const r = await search("types=backup.");
		assert.deepEqual(r.servers, ["Alpha", "Beta"]);
		assert.equal(r.types["backup.failed"], 1);
		assert.equal(r.types["server.crashed"], 1, "not just the kinds that matched");
	});

	it("shows a moderator limited to some servers only those, and what is about no server", async () => {
		const r = await search("", limited);
		assert.ok(r.events.every((e) => !e.server || e.server === "Alpha"));
		assert.equal(r.total, 5);
		assert.deepEqual(r.servers, ["Alpha"], "and the menus don't give the others away");
		assert.equal(JSON.stringify(r).includes("Beta"), false);
		assert.equal((await api.get("/api/activity/search?server=Beta", { cookie: limited })).status, 403);
	});

	it("is not for people who aren't signed in", async () => {
		assert.equal((await api.get("/api/activity/search", { cookie: "" })).status, 401);
	});
});

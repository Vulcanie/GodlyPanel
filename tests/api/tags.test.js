import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, sleep, GUEST } from "../helpers/instance.js";

// Tags: free labels an administrator puts on servers so the dashboard can be searched
// and grouped. They are validated, kept across restarts of the panel's data, shown on
// the dashboard to everyone (they are labels, not secrets), and changed by admins only.

async function until(check, { timeoutMs = 20_000, everyMs = 300 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("tags", () => {
	let panel;
	let api;
	let guest;
	let mod;

	const put = (name, tags, cookie) => api.call("PUT", `/api/server/${encodeURIComponent(name)}/tags`, { tags }, cookie ? { cookie } : undefined);
	const tagsOf = async (name, cookie) => (await api.call("GET", "/api/status", undefined, cookie ? { cookie } : undefined)).json[name]?.tags;

	before(async () => {
		panel = await startInstance({
			servers: (dir) => [
				serverEntry(dir, { name: "Alpha", processName: "nope-a.exe", tags: ["friends"] }),
				serverEntry(dir, { name: "Beta", processName: "nope-b.exe" }),
			],
		});
		api = panel.api;
		await api.post("/api/users", { username: "mod-tags", password: "TestMod!2345", role: "moderator" });
		mod = await api.cookieFor({ username: "mod-tags", password: "TestMod!2345" });
		guest = await api.cookieFor(GUEST);
	});
	after(() => panel.stop());

	it("shows the tags a server already has, and none for one without", async () => {
		assert.deepEqual(await until(async () => (await tagsOf("Alpha")) ?? null), ["friends"]);
		assert.deepEqual(await tagsOf("Beta"), []);
	});

	it("sets, trims, de-duplicates and keeps them", async () => {
		const r = await put("Beta", ["  Community ", "community", "Test  Bed", "v1.2"]);
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.deepEqual(r.json.tags, ["Community", "Test Bed", "v1.2"]);
		assert.equal(await until(async () => JSON.stringify(await tagsOf("Beta")) === JSON.stringify(["Community", "Test Bed", "v1.2"])), true, "the dashboard picks it up");
		const saved = JSON.parse(fs.readFileSync(path.join(panel.dir, "servers.json"), "utf8")).servers.find((s) => s.name === "Beta");
		assert.deepEqual(saved.tags, ["Community", "Test Bed", "v1.2"]);
	});

	it("clears them", async () => {
		assert.equal((await put("Beta", [])).status, 200);
		assert.equal(await until(async () => (await tagsOf("Beta"))?.length === 0), true);
	});

	it("refuses tags that aren't plain labels", async () => {
		for (const tags of [["<b>"], ["a;b"], ["x".repeat(25)], [""], ["   "], [1, {}]]) {
			const r = await put("Beta", tags);
			assert.equal(r.status, 400, JSON.stringify(tags));
		}
		assert.equal((await put("Beta", "friends")).status, 400, "not a list");
		assert.equal((await put("Beta", Array.from({ length: 11 }, (_, i) => `t${i}`))).json.code, "too_many_tags");
		assert.equal((await put("Nope", ["a"])).status, 404);
	});

	it("takes letters from any language", async () => {
		assert.equal((await put("Beta", ["Freunde", "友達", "Équipe"])).status, 200);
	});

	it("shows viewers the tags too, and lets only an administrator change them", async () => {
		assert.ok((await until(async () => (await tagsOf("Alpha", guest))?.length > 0)), "a viewer sees the tags");
		assert.equal((await put("Alpha", ["x"], guest)).status, 403);
		assert.equal((await put("Alpha", ["x"], mod)).status, 403);
		assert.deepEqual(await tagsOf("Alpha"), ["friends"]);
	});
});

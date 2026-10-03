import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readJson } from "../../src/server/util/atomicJson.js";
import { currentUserSid } from "../../src/server/util/lockDownDataDir.js";

// Reading the stores that hold accounts, secrets, servers and settings: a file that is missing or damaged reads
// as "nothing there", but a file that exists and can't be opened must not, or an existing install would look new.

const onWindows = process.platform === "win32";
const icacls = (...args) => execFileSync(path.join(process.env.SystemRoot || "C:/Windows", "System32", "icacls.exe"), args, { encoding: "utf8" });

describe("reading a data file", () => {
	let dir;
	before(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-readjson-"))));
	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	it("reads a good file, and gives the fallback for a missing or damaged one", async () => {
		fs.writeFileSync(path.join(dir, "good.json"), '{"a":1}');
		fs.writeFileSync(path.join(dir, "bad.json"), "{not json");
		assert.deepEqual(await readJson(path.join(dir, "good.json"), null, { strict: true }), { a: 1 });
		for (const options of [undefined, { strict: true }]) {
			assert.equal(await readJson(path.join(dir, "missing.json"), "fallback", options), "fallback");
			assert.equal(await readJson(path.join(dir, "bad.json"), "fallback", options), "fallback");
		}
	});

	it("refuses to call an existing but unreadable file empty, when asked to be strict", { skip: !onWindows }, async () => {
		const file = path.join(dir, "locked.json");
		fs.writeFileSync(file, '{"users":[1]}');
		const sid = await currentUserSid();
		icacls(file, "/deny", `*${sid}:(R)`);
		try {
			await assert.rejects(readJson(file, null, { strict: true }), /can't read .*locked\.json.*file was not changed/s);
			// Everything else keeps its old forgiving behaviour.
			assert.equal(await readJson(file, "fallback"), "fallback");
		} finally {
			icacls(file, "/remove:d", `*${sid}`);
		}
		assert.deepEqual(await readJson(file, null, { strict: true }), { users: [1] }, "readable again once permitted");
	});
});

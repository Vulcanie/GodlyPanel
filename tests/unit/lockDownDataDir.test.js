import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lockDownDataDir, lockArguments, currentUserSid } from "../../src/server/util/lockDownDataDir.js";

// The data folder is limited to the account that runs the panel, SYSTEM and Administrators, and the files
// inside (existing and new) follow. Run against a real throwaway folder with Windows' own icacls.

const onWindows = process.platform === "win32";
const acl = (target) => execFileSync(path.join(process.env.SystemRoot || "C:/Windows", "System32", "icacls.exe"), [target], { encoding: "utf8" });

describe("locking down the data folder", { skip: !onWindows }, () => {
	let dir;
	let sid;
	let broadBefore = false;

	before(async () => {
		// Under C:/ itself where possible: that is where a folder inherits permissions open to every account,
		// which is the situation being fixed. (Under the user's profile it would already be private.)
		try {
			dir = fs.mkdtempSync("C:/gp-lock-");
		} catch {
			dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-lock-"));
		}
		broadBefore = /BUILTIN\\Users|Authenticated Users/i.test(acl(dir));
		fs.mkdirSync(path.join(dir, "backups", "deep"), { recursive: true });
		fs.writeFileSync(path.join(dir, "secrets.json"), '{"jwtSecret":"x"}');
		fs.writeFileSync(path.join(dir, "backups", "deep", "world.zip"), "zip");
		sid = await currentUserSid();
	});
	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	it("builds the command from well-known SIDs, so any Windows language works", () => {
		const args = lockArguments("C:\\x", "S-1-5-21-1-2-3-1001");
		assert.deepEqual(args.slice(0, 2), ["C:\\x", "/inheritance:r"]);
		assert.ok(args.includes("*S-1-5-18:(OI)(CI)F") && args.includes("*S-1-5-32-544:(OI)(CI)F") && args.includes("*S-1-5-21-1-2-3-1001:(OI)(CI)F"));
	});

	it("limits the folder, what is already in it and what is made later", async () => {
		if (broadBefore) console.log("      (the folder started out open to every local account, as a folder under C:/ does)");
		const result = await lockDownDataDir(dir);
		assert.equal(result.locked, true, result.error);
		for (const target of [dir, path.join(dir, "secrets.json"), path.join(dir, "backups", "deep", "world.zip")]) {
			const text = acl(target);
			assert.doesNotMatch(text, /BUILTIN\\Users|Authenticated Users|Everyone/i, `${target}\n${text}`);
			assert.match(text, /NT AUTHORITY\\SYSTEM:/);
			assert.match(text, /BUILTIN\\Administrators:/);
		}
		fs.writeFileSync(path.join(dir, "made-later.json"), "{}");
		assert.doesNotMatch(acl(path.join(dir, "made-later.json")), /BUILTIN\\Users|Authenticated Users|Everyone/i);
	});

	it("leaves the panel's own account able to read and write everything", () => {
		assert.equal(fs.readFileSync(path.join(dir, "secrets.json"), "utf8"), '{"jwtSecret":"x"}');
		fs.writeFileSync(path.join(dir, "secrets.json"), '{"jwtSecret":"y"}');
		fs.appendFileSync(path.join(dir, "backups", "deep", "world.zip"), "more");
		assert.ok(fs.readdirSync(dir).includes("backups"));
		// The panel replaces files by writing a temp file and renaming it over the original; the result is still private.
		fs.writeFileSync(path.join(dir, "secrets.json.tmp"), "{}");
		fs.renameSync(path.join(dir, "secrets.json.tmp"), path.join(dir, "secrets.json"));
		assert.doesNotMatch(acl(path.join(dir, "secrets.json")), /BUILTIN\\Users|Authenticated Users|Everyone/i);
	});

	it("does nothing the second time", async () => {
		const again = await lockDownDataDir(dir);
		assert.equal(again.locked, true);
		assert.equal(again.skipped, "already done");
	});

	it("reports a problem instead of throwing, for a folder that isn't there", async () => {
		const result = await lockDownDataDir(path.join(dir, "no-such-folder"));
		assert.equal(result.locked, false);
		assert.ok(result.error);
	});

	it("records which account it was done for", () => {
		assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "state", "folder-locked.json"), "utf8")).sid, sid);
	});
});

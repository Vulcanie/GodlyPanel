import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { startInstance, tempDir, removeDir, ADMIN } from "../helpers/instance.js";

// secrets.json lives in a hidden, private folder of its own (GHP_SECRETS_DIR, which the desktop app points at a folder beside
// `data`), not in the data folder a person might copy or back up. An install that has it in the data folder gets it moved.

const system32 = path.join(process.env.SystemRoot || "C:/Windows", "System32");
const OLD = { jwtSecret: "old-signing-key", fixedRconPassword: "old-rcon-password", destinationKeys: { d1: "old-cloud-key" } };

describe("where secrets.json is kept", () => {
	let panel;
	let outside;
	let secretsDir;

	before(async () => {
		outside = tempDir("secrets-home");
		secretsDir = path.join(outside, ".godlypanel-secrets");
		panel = await startInstance({
			prepare: (dir) => {
				// What an older version left: the file, its backup and a temp file, all holding the same secrets.
				for (const name of ["secrets.json", "secrets.json.bak", "secrets.json.tmp"]) fs.writeFileSync(path.join(dir, name), JSON.stringify(OLD));
			},
			env: { GHP_SECRETS_DIR: secretsDir },
		});
	});
	after(async () => {
		await panel?.stop();
		removeDir(outside);
	});

	it("moves an existing secrets.json out of the data folder, unchanged", () => {
		assert.deepEqual(JSON.parse(fs.readFileSync(path.join(secretsDir, "secrets.json"), "utf8")).destinationKeys, OLD.destinationKeys);
		const moved = JSON.parse(fs.readFileSync(path.join(secretsDir, "secrets.json"), "utf8"));
		assert.equal(moved.jwtSecret, OLD.jwtSecret, "the signing key is the same one, so nobody is signed out");
		assert.equal(moved.fixedRconPassword, OLD.fixedRconPassword);
	});

	it("leaves no copy of the secrets in the data folder", () => {
		for (const name of fs.readdirSync(panel.dir, { recursive: true })) {
			assert.doesNotMatch(String(name), /secrets\.json/i, `${name} is still in the data folder`);
		}
		const everything = fs.readdirSync(panel.dir, { recursive: true }).map((n) => path.join(panel.dir, String(n)));
		for (const file of everything.filter((f) => fs.statSync(f).isFile() && fs.statSync(f).size < 200_000)) {
			assert.equal(fs.readFileSync(file, "utf8").includes("old-signing-key"), false, `${file} holds the signing key`);
		}
	});

	it("keeps the folder hidden", () => {
		assert.match(execFileSync(path.join(system32, "attrib.exe"), [secretsDir], { encoding: "utf8" }).slice(0, 20), /H/);
	});

	it("keeps the folder private to this account, SYSTEM and Administrators", () => {
		const acl = execFileSync(path.join(system32, "icacls.exe"), [secretsDir], { encoding: "utf8" });
		assert.doesNotMatch(acl, /BUILTIN\\Users|Authenticated Users|Everyone/i);
	});

	it("still works: an account can sign in, and the session it gets is accepted", async () => {
		const login = await panel.api.post("/api/auth/login", ADMIN);
		assert.equal(login.status, 200, JSON.stringify(login.json));
		assert.equal((await panel.api.get("/api/auth/me")).status, 200);
	});
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The console's command scope: which commands a role may send to a game's console. The data folder is set before the stores load,
// as in roleStore.test.js, because paths.js reads it once.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-cmdscope-"));
process.env.GHP_DATA_DIR = dir;
const roleStore = await import("../../src/server/data/roleStore.js");
const { PRESETS, firstToken, matchesPattern, checkCommand } = await import("../../src/server/services/commandScope.js");

let made = 0;
// A custom role with the given scope. Names are unique, as the store requires.
const scopedRole = async (mode, patterns, permissions = ["server.console"]) =>
	(await roleStore.create({ name: `Scoped ${++made}`, permissions, commandScope: { mode, patterns } })).id;
const as = (roleId) => ({ username: "tester", role: roleId });

describe("firstToken", () => {
	it("is the text up to the first whitespace, lower-cased", () => {
		assert.equal(firstToken("list players"), "list");
		assert.equal(firstToken("Say Hello"), "say");
	});

	it("ignores spaces around the command and one leading slash", () => {
		assert.equal(firstToken("  /LIST  "), "list");
		assert.equal(firstToken("\tlist"), "list");
		assert.equal(firstToken("//list"), "/list", "only one slash is taken off");
	});

	it("is empty for anything that is not a string", () => {
		assert.equal(firstToken(undefined), "");
		assert.equal(firstToken(42), "");
		assert.equal(firstToken(""), "");
	});
});

describe("matchesPattern", () => {
	it("matches a trailing * with any run of characters, including none", () => {
		assert.equal(matchesPattern("kick*", "kick"), true);
		assert.equal(matchesPattern("kick*", "kickall"), true);
		assert.equal(matchesPattern("kick*", "skick"), false);
	});

	it("ignores case", () => {
		assert.equal(matchesPattern("Stop", "stop"), true);
		assert.equal(matchesPattern("stop", "STOP"), true);
	});

	it("treats regex characters as plain text", () => {
		assert.equal(matchesPattern("a.b", "a.b"), true);
		assert.equal(matchesPattern("a.b", "axb"), false);
		assert.equal(matchesPattern("(x", "(x"), true);
		assert.equal(matchesPattern("(x", "x"), false);
	});

	it("refuses a token longer than 256 characters", () => {
		assert.equal(matchesPattern("*", "a".repeat(257)), false);
		assert.equal(matchesPattern("*", "a".repeat(256)), true);
	});

	it("finishes quickly on a pattern full of stars", () => {
		const started = Date.now();
		assert.equal(matchesPattern("*a".repeat(30) + "*b", "a".repeat(256)), false);
		assert.equal(matchesPattern("a*".repeat(30) + "*", "a".repeat(256)), true);
		assert.ok(Date.now() - started < 500, "the match did not blow up");
	});
});

describe("checkCommand with an allow list", () => {
	let id;
	before(async () => {
		id = await scopedRole("allow", ["list", "say"]);
	});

	it("lets through the listed command in any case, with a slash, padding or arguments", () => {
		for (const command of ["list", "LIST", "/list", "  list", "list players"]) {
			assert.deepEqual(checkCommand(as(id), "Alpha", command), { ok: true }, command);
		}
	});

	it("refuses a command that only starts the same way", () => {
		assert.equal(checkCommand(as(id), "Alpha", "listplayers").ok, false);
	});

	it("refuses a second command in the same line, however it is joined", () => {
		for (const command of ["list\nstop", "list\rstop", "list; stop", "say hi && stop", "say hi | tee x", "list\u0000", "list\tstop"]) {
			assert.equal(checkCommand(as(id), "Alpha", command).ok, false, JSON.stringify(command));
		}
	});
});

describe("checkCommand with a deny list", () => {
	let id;
	before(async () => {
		id = await scopedRole("deny", ["stop"]);
	});

	it("refuses the listed command in any case, with a slash or arguments", () => {
		for (const command of ["stop", "Stop", "/STOP now"]) {
			assert.equal(checkCommand(as(id), "Alpha", command).ok, false, command);
		}
	});

	it("lets through anything else, even a word that starts the same way", () => {
		assert.equal(checkCommand(as(id), "Alpha", "save").ok, true);
		assert.equal(checkCommand(as(id), "Alpha", "stopx").ok, true);
	});

	it("refuses a double slash, which is not a name the list can judge", () => {
		assert.equal(checkCommand(as(id), "Alpha", "//stop").ok, false);
	});
});

describe("checkCommand with globs", () => {
	let kicker;
	let wiper;
	before(async () => {
		kicker = await scopedRole("allow", ["kick*"]);
		wiper = await scopedRole("deny", ["wipe*"]);
	});

	it("matches a pattern with a star against the whole first word", () => {
		assert.equal(checkCommand(as(kicker), "Alpha", "kick Steve").ok, true);
		assert.equal(checkCommand(as(kicker), "Alpha", "kickall").ok, true);
		assert.equal(checkCommand(as(kicker), "Alpha", "skick Steve").ok, false);
	});

	it("uses the same matching for a deny list", () => {
		assert.equal(checkCommand(as(wiper), "Alpha", "wipeworld").ok, false);
		assert.equal(checkCommand(as(wiper), "Alpha", "save").ok, true);
	});
});

describe("checkCommand for the scope 'all'", () => {
	let id;
	before(async () => {
		id = await scopedRole("all", []);
	});

	it("lets any command through, newlines included", () => {
		assert.deepEqual(checkCommand(as(id), "Alpha", "list\nstop"), { ok: true });
		assert.deepEqual(checkCommand(as(id), "Alpha", "anything; at all && more"), { ok: true });
	});

	it("the admin role is never limited", () => {
		assert.deepEqual(checkCommand({ username: "boss", role: "admin" }, "Alpha", "stop"), { ok: true });
	});
});

describe("checkCommand refusals before any scope is read", () => {
	const id = "moderator";

	it("refuses a command that is missing, blank or not text", () => {
		for (const command of [undefined, null, "", "   ", 5, ["list"]]) {
			const verdict = checkCommand(as(id), "Alpha", command);
			assert.equal(verdict.ok, false, JSON.stringify(command));
			assert.equal(verdict.reason, "A command is required.");
		}
	});

	it("refuses when there is no user", () => {
		assert.equal(checkCommand(undefined, "Alpha", "list").ok, false);
		assert.equal(checkCommand(null, "Alpha", "list").ok, false);
	});

	it("refuses an unknown role, rather than letting it through", () => {
		assert.equal(checkCommand({ username: "x", role: "no-such-role" }, "Alpha", "list").ok, false);
		assert.equal(checkCommand({ username: "x" }, "Alpha", "list").ok, false);
	});
});

describe("checkCommand per server", () => {
	let limited;
	before(async () => {
		limited = await scopedRole("allow", ["list"]);
	});

	it("a per-server role limits that server only", () => {
		const user = { username: "mod", role: "moderator", serverRoles: { Alpha: limited } };
		assert.equal(checkCommand(user, "Alpha", "list").ok, true);
		assert.equal(checkCommand(user, "Alpha", "say hi").ok, false);
		assert.equal(checkCommand(user, "Beta", "say hi").ok, true, "the moderator's own scope applies on Beta");
	});

	it("an 'admin' entry for a server is ignored, as it is for permissions", () => {
		const user = { username: "x", role: limited, serverRoles: { Alpha: "admin" } };
		assert.equal(checkCommand(user, "Alpha", "stop").ok, false);
	});
});

describe("the refusal reasons", () => {
	it("never contain the command", async () => {
		const id = await scopedRole("allow", ["list"]);
		const verdict = checkCommand(as(id), "Alpha", "stop\nhunter2");
		assert.equal(verdict.ok, false);
		assert.equal(typeof verdict.reason, "string");
		assert.ok(!verdict.reason.includes("hunter2"));
		assert.ok(!verdict.reason.includes("stop"));
	});
});

describe("PRESETS", () => {
	it("are well formed", () => {
		assert.ok(Array.isArray(PRESETS) && PRESETS.length === 3);
		assert.deepEqual(PRESETS.map((p) => p.id), ["read-only", "moderation", "no-destructive"]);
		for (const preset of PRESETS) {
			assert.equal(typeof preset.label, "string");
			assert.ok(["allow", "deny"].includes(preset.mode), preset.id);
			assert.ok(preset.patterns.length >= 1 && preset.patterns.length <= 50, preset.id);
			for (const pattern of preset.patterns) {
				assert.equal(typeof pattern, "string");
				assert.ok(pattern.length >= 1 && pattern.length <= 64, pattern);
				assert.doesNotMatch(pattern, /[\u0000-\u001f\u007f-\u009f]/);
			}
		}
	});

	it("keep the read-only list inside moderation, and block the destructive words", () => {
		const [readOnly, moderation, noDestructive] = PRESETS;
		for (const pattern of readOnly.patterns) assert.ok(moderation.patterns.includes(pattern), pattern);
		assert.ok(noDestructive.patterns.includes("stop"));
	});
});

after(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

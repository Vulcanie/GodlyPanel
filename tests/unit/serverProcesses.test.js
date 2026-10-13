import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { check, fc } from "../helpers/fc.js";
import { classify, findServerProcesses, ownedProgramRunning, ownedProgramGone, createSharedLister } from "../../src/server/services/serverProcesses.js";

// Telling "nothing is running" from "couldn't find out". The lookup that finds a server's own programs can fail or time out on a PC
// that is struggling, and an answer of "none" in that case would say a running game had stopped: a second copy gets started, or a
// backup or restore goes ahead on files the game still has open. Not knowing has to count as "still running".

// Paths are built with the platform's own separator: the code under test compares them with the path module, and a Windows-style
// path means nothing to it on another system. (`ROOT` is absolute on both: C:\ on Windows, / elsewhere.)
const ROOT = path.parse(process.cwd()).root;
const at = (...parts) => path.join(ROOT, ...parts);
const server = { name: "Valheim", processName: "valheim_server.exe", installDir: at("Servers", "Valheim"), workingDir: at("Servers", "Valheim") };
const mine = { pid: 10, path: at("Servers", "Valheim", "valheim_server.exe") };
const theirs = { pid: 11, path: at("Other", "valheim_server.exe") };

describe("finding a server's own programs", () => {
	it("splits the programs with its name into its own and others', and says the lookup worked", async () => {
		const found = await findServerProcesses(server, { list: async () => [mine, theirs] });
		assert.deepEqual(found.owned, [mine]);
		assert.deepEqual(found.foreign, [theirs]);
		assert.equal(found.unknown, false);
	});

	it("says 'unknown', not 'nothing', when the lookup itself failed", async () => {
		const found = await findServerProcesses(server, { list: async () => null });
		assert.equal(found.unknown, true);
		assert.deepEqual(found.owned, []);
	});

	it("says 'nothing' when the lookup worked and found nothing, and when there is no program name to look for", async () => {
		assert.equal((await findServerProcesses(server, { list: async () => [] })).unknown, false);
		assert.equal((await findServerProcesses({ name: "x" }, { list: async () => assert.fail("nothing to look up") })).unknown, false);
	});
});

describe("deciding from what was found", () => {
	const none = { owned: [], foreign: [], hasRoots: true, unknown: false };
	const some = { owned: [mine], foreign: [], hasRoots: true, unknown: false };
	const unknown = { owned: [], foreign: [], hasRoots: false, unknown: true };

	it("treats a running program as running and not gone, and an absent one as the reverse", () => {
		assert.equal(ownedProgramRunning(some), true);
		assert.equal(ownedProgramGone(some), false);
		assert.equal(ownedProgramRunning(none), false);
		assert.equal(ownedProgramGone(none), true);
	});

	it("treats a failed lookup as still running, and never as gone", () => {
		assert.equal(ownedProgramRunning(unknown), true, "refuse a second start; don't touch live files");
		assert.equal(ownedProgramGone(unknown), false, "keep waiting; don't copy or replace what the game may still have open");
	});

	it("never says a server is both running and gone, whatever was found", () => {
		const found = fc.record({
			owned: fc.array(fc.record({ pid: fc.nat(), path: fc.constant("C:\\x.exe") }), { maxLength: 3 }),
			foreign: fc.constant([]),
			hasRoots: fc.boolean(),
			unknown: fc.boolean(),
		});
		check(fc.property(found, (f) => assert.equal(ownedProgramRunning(f) && ownedProgramGone(f), false)));
		// And when the lookup worked, they are exact opposites; only a failed lookup is neither "gone" nor "definitely running".
		check(fc.property(found.map((f) => ({ ...f, unknown: false })), (f) => assert.equal(ownedProgramRunning(f), !ownedProgramGone(f))));
	});
});

describe("splitting running programs by where they run from", () => {
	it("calls a program the server's own only when it runs from inside the server's folder", () => {
		check(
			fc.property(fc.stringMatching(/^[a-z]{1,8}$/), fc.stringMatching(/^[a-z]{1,8}$/), (a, b) => {
				const own = { pid: 1, path: at("Servers", "Valheim", a, "game.exe") };
				const sibling = { pid: 2, path: at("Servers", "ValheimX", b, "game.exe") };
				const { owned, foreign } = classify(server, [own, sibling]);
				assert.deepEqual(owned, [own]);
				assert.deepEqual(foreign, [sibling], "a folder whose name merely starts with the server's is somebody else's");
			}),
		);
	});
});

describe("one listing of the running programs for a whole poll cycle", () => {
	const listing = [
		{ pid: 1, name: "valheim_server.exe", path: "D:\\Servers\\A\\valheim_server.exe" },
		{ pid: 2, name: "Valheim_Server.exe", path: "D:\\Servers\\B\\valheim_server.exe" },
		{ pid: 3, name: "other.exe", path: null },
	];

	it("asks Windows once however many servers want to know, and answers each from it", async () => {
		let asked = 0;
		const list = createSharedLister({ run: async () => (asked += 1, listing) });
		const answers = await Promise.all([list("valheim_server.exe"), list("VALHEIM_SERVER.EXE"), list("other.exe"), list("nothing.exe")]);
		assert.equal(asked, 1);
		assert.deepEqual(answers[0], [{ pid: 1, path: "D:\\Servers\\A\\valheim_server.exe" }, { pid: 2, path: "D:\\Servers\\B\\valheim_server.exe" }]);
		assert.deepEqual(answers[0], answers[1], "the name's letter case doesn't matter");
		assert.deepEqual(answers[2], [{ pid: 3, path: null }]);
		assert.deepEqual(answers[3], []);
	});

	it("asks again once the listing is a moment old", async () => {
		let asked = 0;
		let clock = 1000;
		const list = createSharedLister({ run: async () => (asked += 1, listing), ttlMs: 1500, now: () => clock });
		await list("other.exe");
		clock += 1000;
		await list("other.exe");
		assert.equal(asked, 1);
		clock += 600;
		await list("other.exe");
		assert.equal(asked, 2);
	});

	it("says 'couldn't tell' (null) rather than 'nothing is running' when the listing failed", async () => {
		const list = createSharedLister({ run: async () => null });
		assert.equal(await list("valheim_server.exe"), null);
		const found = await findServerProcesses({ name: "x", processName: "valheim_server.exe", installDir: "D:\\Servers\\A" }, { list });
		assert.equal(found.unknown, true);
	});

	it("does not look up a name that could not be a program's", async () => {
		const list = createSharedLister({ run: async () => assert.fail("not asked") });
		assert.deepEqual(await list("a'; Remove-Item *"), []);
	});
});

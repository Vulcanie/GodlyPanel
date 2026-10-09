import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { check, fc } from "../helpers/fc.js";
import { classify, findServerProcesses, ownedProgramRunning, ownedProgramGone } from "../../src/server/services/serverProcesses.js";

// Telling "nothing is running" from "couldn't find out". The lookup that finds a server's own programs can fail or time out on a PC
// that is struggling, and an answer of "none" in that case would say a running game had stopped: a second copy gets started, or a
// backup or restore goes ahead on files the game still has open. Not knowing has to count as "still running".

const server = { name: "Valheim", processName: "valheim_server.exe", installDir: "C:\\Servers\\Valheim", workingDir: "C:\\Servers\\Valheim" };
const mine = { pid: 10, path: "C:\\Servers\\Valheim\\valheim_server.exe" };
const theirs = { pid: 11, path: "D:\\Other\\valheim_server.exe" };

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
				const own = { pid: 1, path: `C:\\Servers\\Valheim\\${a}\\game.exe` };
				const sibling = { pid: 2, path: `C:\\Servers\\ValheimX\\${b}\\game.exe` };
				const { owned, foreign } = classify(server, [own, sibling]);
				assert.deepEqual(owned, [own]);
				assert.deepEqual(foreign, [sibling], "a folder whose name merely starts with the server's is somebody else's");
			}),
		);
	});
});

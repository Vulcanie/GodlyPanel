import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { tempDir, removeDir } from "../helpers/instance.js";

// Deleting a server's files is the one irreversible thing the panel does, so the
// rules for what it may delete are tested on their own, as a pure function, with
// no file system involved: none of these tests can delete anything.

const onWindows = process.platform === "win32";

describe("what deleting a server may remove", { skip: !onWindows && "Windows paths" }, () => {
	let dataDir;
	let planRemoval;
	const system = process.env.SystemRoot ?? "C:\\Windows";
	const home = process.env.USERPROFILE ?? os.homedir();

	const made = (name, dir, extra = {}) => ({
		name,
		source: "created",
		installDir: dir,
		startScriptPath: path.join(dir, "Start.bat"),
		...extra,
	});

	before(async () => {
		dataDir = tempDir("removal");
		process.env.GHP_DATA_DIR = dataDir;
		({ planRemoval } = await import("../../src/server/services/serverRemoval.js"));
	});
	after(() => removeDir(dataDir));

	it("offers to delete the folder of a server the panel created", () => {
		const dir = path.join("D:\\", "GameServers", "conan");
		const plan = planRemoval(made("Conan", dir), []);
		assert.equal(plan.canDeleteFiles, true);
		assert.equal(plan.mode, "folder");
		assert.equal(plan.target, path.resolve(dir));
	});

	it("never deletes the files of an imported server", () => {
		const plan = planRemoval(made("Old", "D:\\GameServers\\old", { source: "imported" }), []);
		assert.equal(plan.canDeleteFiles, false);
		assert.match(plan.reason, /imported/);
	});

	it("refuses a server with no install folder", () => {
		assert.equal(planRemoval({ name: "x", source: "created" }, []).canDeleteFiles, false);
	});

	it("refuses the top of a drive", () => {
		for (const dir of ["C:\\", "D:\\"]) {
			const plan = planRemoval(made("x", dir), []);
			assert.equal(plan.canDeleteFiles, false, dir);
		}
	});

	it("refuses Windows and Program Files, and anything inside them", () => {
		for (const dir of [system, path.join(system, "Temp", "gs"), process.env.ProgramFiles ?? "C:\\Program Files", path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Game")]) {
			assert.equal(planRemoval(made("x", dir), []).canDeleteFiles, false, dir);
		}
	});

	it("refuses the user's profile and its main folders, but not a servers folder inside one", () => {
		for (const dir of [home, path.join(home, "Desktop"), path.join(home, "Documents"), path.join(home, "Downloads")]) {
			assert.equal(planRemoval(made("x", dir), []).canDeleteFiles, false, dir);
		}
		assert.equal(planRemoval(made("x", path.join(home, "Desktop", "Servers", "conan")), []).canDeleteFiles, true);
	});

	it("refuses a folder that would contain the panel's own data", () => {
		assert.equal(planRemoval(made("x", path.dirname(dataDir)), []).canDeleteFiles, false, "a parent of the data folder");
		assert.equal(planRemoval(made("x", dataDir), []).canDeleteFiles, false, "the data folder itself");
	});

	it("allows a server folder inside the panel's data folder (the default location)", () => {
		assert.equal(planRemoval(made("x", path.join(dataDir, "servers", "conan")), []).canDeleteFiles, true);
	});

	it("refuses a folder that doesn't contain the server's own start script", () => {
		const plan = planRemoval(made("x", "D:\\GameServers\\a", { startScriptPath: "D:\\Elsewhere\\Start.bat" }), []);
		assert.equal(plan.canDeleteFiles, false);
		assert.match(plan.reason, /isn't inside its install folder/);
	});

	it("for a shared install, removes only this server's own start script", () => {
		const shared = "D:\\GameServers\\ark";
		const a = { ...made("Map A", shared), startScriptPath: path.join(shared, "Start_A.bat") };
		const b = { ...made("Map B", shared), startScriptPath: path.join(shared, "Start_B.bat") };
		const plan = planRemoval(a, [a, b]);
		assert.equal(plan.canDeleteFiles, true);
		assert.equal(plan.mode, "script");
		assert.equal(plan.script, path.resolve(a.startScriptPath));
		assert.equal(plan.target, null, "never the shared folder");
		assert.match(plan.reason, /shared/);
	});

	it("treats a nested install as shared too, in either direction", () => {
		const outer = made("Outer", "D:\\GameServers\\games");
		const inner = made("Inner", "D:\\GameServers\\games\\inner");
		assert.equal(planRemoval(outer, [outer, inner]).mode, "script");
		assert.equal(planRemoval(inner, [outer, inner]).mode, "script");
	});

	it("is not fooled by folders that merely share a prefix", () => {
		const a = made("A", "D:\\GameServers\\conan");
		const b = made("B", "D:\\GameServers\\conan-2");
		assert.equal(planRemoval(a, [a, b]).mode, "folder", "conan-2 is not inside conan");
	});

	it("compares paths without regard to case or a trailing slash", () => {
		const a = made("A", "D:\\GameServers\\Conan\\");
		const b = made("B", "d:\\gameservers\\conan");
		assert.equal(planRemoval(a, [a, b]).mode, "script");
	});
});

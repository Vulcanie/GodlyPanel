import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { removeDir } from "../helpers/instance.js";
import { checkProcess } from "../../src/server/services/processCheck.js";

// Finding a running program by its image name, including the long ones Unreal servers have
// (found on a real Dragonwilds install: its program is 38 characters long and was never seen).

describe("checkProcess", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-proc-"));
	const children = [];
	after(async () => {
		await Promise.all(children.map((c) => new Promise((resolve) => (c.exitCode !== null ? resolve() : (c.once("exit", resolve), c.kill())))));
		removeDir(dir);
	});

	const run = (image) => {
		fs.copyFileSync(process.execPath, path.join(dir, image));
		const child = spawn(path.join(dir, image), ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", windowsHide: true });
		children.push(child);
		return child;
	};

	it("sees a program with a long name, in any letter case", async () => {
		const image = "gp-Long-Image-Name-Win64-Shipping.exe";
		assert.ok(image.length > 25);
		run(image);
		assert.equal(await checkProcess(image, { fresh: true }), true);
		assert.equal(await checkProcess(image.toUpperCase(), { fresh: true }), true);
	});

	it("sees a short name, and says no to one that isn't running", async () => {
		run("gp-short.exe");
		assert.equal(await checkProcess("gp-short.exe", { fresh: true }), true);
		assert.equal(await checkProcess("gp-not-running.exe", { fresh: true }), false);
		assert.equal(await checkProcess("gp-Long-Image-Name-Win64-Other.exe", { fresh: true }), false, "a different long name with the same start");
	});

	it("says no to nothing at all", async () => {
		assert.equal(await checkProcess("", {}), false);
		assert.equal(await checkProcess(undefined, {}), false);
	});
});

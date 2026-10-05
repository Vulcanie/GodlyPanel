import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { killFakeGames } from "../helpers/fakeGame.js";

// resources/scripts/apply-update.ps1, the part of the updater that swaps files while the app is closed. It is run here
// against a stand-in "app" (a renamed node.exe whose resources/main.js says which version it is, and reports that it is
// up the way the real API does), through every way an update can end: it works, the new version never comes up, the new
// version dies at once, the staged files are unusable, and a full replacement that also removes what the old one had.

const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(here, "..", "..", "resources", "scripts", "apply-update.ps1");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// What resources/main.js does in each version of the stand-in: report "up" (or not), and stay running.
const main = (version, behaviour = "ok") =>
	behaviour === "dies"
		? "process.exit(3);\n"
		: `const fs = require("node:fs");\n` +
			(behaviour === "silent" ? "" : `setTimeout(() => fs.writeFileSync(process.env.HEALTH, JSON.stringify({ version: ${JSON.stringify(version)} })), 700);\n`) +
			`setInterval(() => {}, 1000);\n`;

describe("apply-update.ps1", () => {
	let root;
	let seq = 0;

	before(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-applyupdate-"));
	});
	after(() => {
		killFakeGames(root);
		try {
			fs.rmSync(root, { recursive: true, force: true });
		} catch {
			// A process may still be letting go.
		}
	});

	// An installed "app", running, and a staged update beside it.
	const goodStage = (dir) => {
		fs.mkdirSync(path.join(dir, "resources"), { recursive: true });
		fs.writeFileSync(path.join(dir, "resources", "main.js"), main("2.0.0"));
	};
	async function scene({ stage = goodStage, mode = "app", health = 30 } = {}) {
		const dir = path.join(root, `case-${++seq}`);
		const appDir = path.join(dir, "app");
		const stageDir = path.join(dir, "data", "updates", "stage");
		fs.mkdirSync(path.join(appDir, "resources"), { recursive: true });
		fs.mkdirSync(path.join(appDir, "data", "servers"), { recursive: true });
		fs.mkdirSync(stageDir, { recursive: true });
		const exe = path.join(appDir, "fakeapp.exe");
		fs.copyFileSync(process.execPath, exe);
		fs.writeFileSync(path.join(appDir, "resources", "main.js"), main("1.0.0"));
		fs.writeFileSync(path.join(appDir, "resources", "old-only.txt"), "only the old version has this");
		fs.writeFileSync(path.join(appDir, "stale.txt"), "left over from the old version");
		fs.writeFileSync(path.join(appDir, "data", "servers", "world.sav"), "a game server's files must survive");
		stage(stageDir);
		const dataDir = path.join(dir, "data");
		const files = {
			healthFile: path.join(dataDir, "state", "update-health.json"),
			resultFile: path.join(dataDir, "state", "update-result.json"),
			logFile: path.join(dataDir, "logs", "update.log"),
		};
		fs.mkdirSync(path.dirname(files.healthFile), { recursive: true });
		const env = { ...process.env, HEALTH: files.healthFile };
		// The old version, running. Its own report of being up stands in for an earlier boot.
		const old = spawn(exe, [path.join("resources", "main.js")], { cwd: appDir, env, stdio: "ignore" });
		// Until it has said it is up, so a slow machine doesn't have the script start before there is anything to replace.
		for (let i = 0; i < 100 && !fs.existsSync(files.healthFile); i += 1) await wait(200);
		const plan = {
			appDir,
			exePath: exe,
			exeArgs: [path.join("resources", "main.js")],
			stageDir,
			mode,
			version: "2.0.0",
			oldVersion: "1.0.0",
			parentPid: old.pid,
			dataDir,
			...files,
			cleanup: [stageDir],
			healthTimeoutSec: health,
		};
		const planFile = path.join(dir, "plan.json");
		fs.writeFileSync(planFile, JSON.stringify(plan));
		return { dir, appDir, stageDir, files, exe, old, planFile, env };
	}

	// Run the script as the app would (hidden, detached from it), the old version closing a moment after it starts.
	async function apply(s) {
		const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", SCRIPT, s.planFile], { env: s.env, stdio: "ignore", windowsHide: true });
		await wait(600);
		s.old.kill();
		const code = await new Promise((resolve) => child.on("exit", resolve));
		return code;
	}

	const read = (...p) => fs.readFileSync(path.join(...p), "utf8");
	const result = (s) => JSON.parse(fs.readFileSync(s.files.resultFile, "utf8"));
	const health = (s) => JSON.parse(fs.readFileSync(s.files.healthFile, "utf8"));
	// The version the running app last reported (it writes the file when it is up), waited for rather than guessed at.
	async function healthBecomes(s, version) {
		for (let i = 0; i < 100; i += 1) {
			try {
				if (health(s).version === version) return true;
			} catch {
				// Not written yet.
			}
			await wait(200);
		}
		return false;
	}

	it("swaps the app in, starts the new version, waits for it to say it is up, and tidies after itself", async () => {
		const s = await scene();
		const code = await apply(s);
		assert.equal(code, 0, fs.existsSync(s.files.logFile) ? read(s.files.logFile) : "no log");
		assert.match(read(s.appDir, "resources", "main.js"), /2\.0\.0/, "the new files are in place");
		assert.equal(fs.existsSync(path.join(s.appDir, "resources", "old-only.txt")), false, "and the old resources folder is replaced as a whole");
		assert.equal(read(s.appDir, "data", "servers", "world.sav"), "a game server's files must survive");
		assert.equal(fs.existsSync(path.join(s.appDir, ".update-backup")), false, "the backup is removed once it worked");
		assert.equal(fs.existsSync(s.stageDir), false, "and so is the unpacked update");
		assert.equal(health(s).version, "2.0.0", "the new version is the one running");
		const r = result(s);
		assert.equal(r.ok, true);
		assert.equal(r.version, "2.0.0");
		assert.equal(r.from, "1.0.0");
		assert.equal(fs.existsSync(path.join(s.appDir, "stale.txt")), true, "an app-only update leaves everything outside resources alone");
	});

	it("puts the old version back, and starts it, when the new one never says it is up", async () => {
		const s = await scene({
			health: 6,
			stage: (dir) => {
				fs.mkdirSync(path.join(dir, "resources"), { recursive: true });
				fs.writeFileSync(path.join(dir, "resources", "main.js"), main("2.0.0", "silent"));
			},
		});
		const code = await apply(s);
		assert.equal(code, 1);
		assert.match(read(s.appDir, "resources", "main.js"), /1\.0\.0/, "the old files are back");
		assert.equal(fs.existsSync(path.join(s.appDir, "resources", "old-only.txt")), true);
		assert.equal(fs.existsSync(path.join(s.appDir, ".update-backup")), false, "and the backup folder is gone once everything is back");
		const r = result(s);
		assert.equal(r.ok, false);
		assert.equal(r.rolledBack, true);
		assert.match(r.message, /didn't start properly/);
		assert.equal(await healthBecomes(s, "1.0.0"), true, "the old version is running again");
		assert.equal(read(s.appDir, "data", "servers", "world.sav"), "a game server's files must survive");
	});

	it("doesn't wait out the whole time when the new version closes straight away", async () => {
		const s = await scene({
			health: 60,
			stage: (dir) => {
				fs.mkdirSync(path.join(dir, "resources"), { recursive: true });
				fs.writeFileSync(path.join(dir, "resources", "main.js"), main("2.0.0", "dies"));
			},
		});
		const started = Date.now();
		const code = await apply(s);
		assert.equal(code, 1);
		assert.ok(Date.now() - started < 40_000, "gave up long before the 60 s it was allowed");
		assert.match(result(s).message, /closed again/);
		assert.match(read(s.appDir, "resources", "main.js"), /1\.0\.0/);
	});

	it("changes nothing when the staged files are unusable", async () => {
		const s = await scene({ stage: () => {} });
		const code = await apply(s);
		assert.equal(code, 1);
		assert.match(read(s.appDir, "resources", "main.js"), /1\.0\.0/, "the app is as it was");
		assert.equal(fs.existsSync(path.join(s.appDir, "resources", "old-only.txt")), true);
		assert.equal(fs.existsSync(path.join(s.appDir, ".update-backup")), false);
		assert.equal(result(s).ok, false);
		assert.equal(await healthBecomes(s, "1.0.0"), true, "and it is running");
	});

	it("replaces everything but data in a full update, including what the new version no longer has", async () => {
		const s = await scene({
			mode: "full",
			stage: (dir) => {
				fs.mkdirSync(path.join(dir, "resources"), { recursive: true });
				fs.writeFileSync(path.join(dir, "resources", "main.js"), main("2.0.0"));
				fs.copyFileSync(process.execPath, path.join(dir, "fakeapp.exe"));
				fs.writeFileSync(path.join(dir, "brand-new.txt"), "new in this version");
				fs.mkdirSync(path.join(dir, "data"), { recursive: true });
				fs.writeFileSync(path.join(dir, "data", "portable.txt"), "must not overwrite the real data folder");
			},
		});
		const code = await apply(s);
		assert.equal(code, 0, fs.existsSync(s.files.logFile) ? read(s.files.logFile) : "no log");
		assert.match(read(s.appDir, "resources", "main.js"), /2\.0\.0/);
		assert.equal(fs.existsSync(path.join(s.appDir, "brand-new.txt")), true);
		assert.equal(fs.existsSync(path.join(s.appDir, "stale.txt")), false, "a file only the old version had is gone");
		assert.equal(read(s.appDir, "data", "servers", "world.sav"), "a game server's files must survive");
		assert.equal(fs.existsSync(path.join(s.appDir, "data", "portable.txt")), false, "the new package's data folder is ignored");
		assert.equal(health(s).version, "2.0.0");
	});
});

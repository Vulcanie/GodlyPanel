import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { asaConfigSync, CONFIG_FOLDER } from "../../src/server/data/configSync.js";
import { windowsOnly } from "../helpers/winEmulation.js";
import { applyServerConfig, adoptMissingConfig, __setSettleMsForTests } from "../../src/server/services/perServerConfig.js";

// ARK Ascended maps share one install and so one settings folder. Each server keeps its own copy and the panel puts it in the
// shared folder just before that server starts.

describe("asaConfigSync", () => {
	it("points the config paths into a folder of the server's own and the live paths at the shared settings", () => {
		const { configSync, configPaths } = asaConfigSync("D:\\Games\\ark-asa\\", "Ragnarok");
		assert.equal(configSync.dir, `D:\\Games\\ark-asa\\${CONFIG_FOLDER}\\Ragnarok`);
		assert.equal(configPaths["GameUserSettings.ini"], `${configSync.dir}\\GameUserSettings.ini`);
		assert.equal(configSync.live["Game.ini"], "D:\\Games\\ark-asa\\ShooterGame\\Saved\\Config\\WindowsServer\\Game.ini");
	});

	it("gives two maps different config paths", () => {
		const a = asaConfigSync("D:\\ark", "Ragnarok").configPaths;
		const b = asaConfigSync("D:\\ark", "Island").configPaths;
		assert.notEqual(a["GameUserSettings.ini"], b["GameUserSettings.ini"]);
	});
});

describe("per-server settings for maps sharing an install", windowsOnly("the settings paths are Windows paths"), () => {
	let install;
	let live;
	const server = (slug) => ({ name: slug, ...asaConfigSync(install, slug) });
	const read = (file) => fs.readFileSync(file, "utf8");

	beforeEach(() => {
		__setSettleMsForTests(0);
		install = fs.mkdtempSync(path.join(os.tmpdir(), "asa-cfg-"));
		live = path.join(install, "ShooterGame", "Saved", "Config", "WindowsServer");
		fs.mkdirSync(live, { recursive: true });
	});
	afterEach(() => {
		__setSettleMsForTests(15_000);
		fs.rmSync(install, { recursive: true, force: true });
	});

	it("does nothing for a server that keeps no copy of its own", async () => {
		const release = await applyServerConfig({ name: "Other" });
		release();
		await adoptMissingConfig({ name: "Other" });
	});

	it("adopts what the shared folder holds when the server has no copy yet, and never replaces a copy it has", async () => {
		fs.writeFileSync(path.join(live, "GameUserSettings.ini"), "from-live");
		const s = server("Ragnarok");
		await adoptMissingConfig(s);
		assert.equal(read(s.configSync.dir + "\\GameUserSettings.ini"), "from-live");
		assert.equal(fs.existsSync(s.configSync.dir + "\\Game.ini"), false, "a file the game hasn't made isn't invented");
		fs.writeFileSync(path.join(live, "GameUserSettings.ini"), "changed-live");
		await adoptMissingConfig(s);
		assert.equal(read(s.configSync.dir + "\\GameUserSettings.ini"), "from-live");
	});

	it("puts the server's own settings where the game reads them, so each map starts with its own", async () => {
		const a = server("Ragnarok");
		const b = server("Island");
		fs.mkdirSync(a.configSync.dir, { recursive: true });
		fs.mkdirSync(b.configSync.dir, { recursive: true });
		fs.writeFileSync(a.configSync.dir + "\\GameUserSettings.ini", "ragnarok");
		fs.writeFileSync(b.configSync.dir + "\\GameUserSettings.ini", "island");

		(await applyServerConfig(a))();
		assert.equal(read(path.join(live, "GameUserSettings.ini")), "ragnarok");
		(await applyServerConfig(b))();
		assert.equal(read(path.join(live, "GameUserSettings.ini")), "island");
		assert.equal(read(a.configSync.dir + "\\GameUserSettings.ini"), "ragnarok", "starting another map leaves this map's copy alone");
	});

	it("keeps a second start waiting until the first has been launched and settled", async () => {
		const a = server("Ragnarok");
		const b = server("Island");
		for (const [s, text] of [[a, "ragnarok"], [b, "island"]]) {
			fs.mkdirSync(s.configSync.dir, { recursive: true });
			fs.writeFileSync(s.configSync.dir + "\\GameUserSettings.ini", text);
		}
		const releaseA = await applyServerConfig(a);
		let second = false;
		const pending = applyServerConfig(b).then((release) => {
			second = true;
			return release;
		});
		await new Promise((r) => setTimeout(r, 50));
		assert.equal(second, false);
		assert.equal(read(path.join(live, "GameUserSettings.ini")), "ragnarok", "the first map's settings stay until it has launched");
		releaseA();
		(await pending)();
		assert.equal(read(path.join(live, "GameUserSettings.ini")), "island");
	});

	it("lets the next start through when this one fails to copy", async () => {
		const bad = server("Bad");
		fs.mkdirSync(bad.configSync.dir + "\\GameUserSettings.ini", { recursive: true }); // a folder where the file should be
		fs.mkdirSync(path.join(live, "GameUserSettings.ini"), { recursive: true });
		await assert.rejects(applyServerConfig(bad));
		const good = server("Good");
		fs.mkdirSync(good.configSync.dir, { recursive: true });
		fs.writeFileSync(good.configSync.dir + "\\Game.ini", "ok");
		(await applyServerConfig(good))();
		assert.equal(read(path.join(live, "Game.ini")), "ok");
	});
});

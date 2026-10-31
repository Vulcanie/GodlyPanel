import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { serverEntry } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";
import { windowsOnly } from "../helpers/winEmulation.js";

// A panel from before servers had settings of their own has every ARK Ascended server pointing at the one shared settings folder.
// Starting the panel gives each its own copy, so the settings page shows that map's file.

describe("ARK Ascended servers keep their own settings, also on the same map", windowsOnly("the settings paths are Windows paths"), () => {
	let panel;
	let api;
	let install;
	let live;
	let migrateSharedConfigs;

	before(async () => {
		panel = await startInProcess({
			servers: (dir) => {
				install = path.join(dir, "ark-asa");
				live = path.join(install, "ShooterGame", "Saved", "Config", "WindowsServer");
				fs.mkdirSync(live, { recursive: true });
				fs.writeFileSync(path.join(live, "GameUserSettings.ini"), "[ServerSettings]\r\nFromLive=1\r\n");
				const entry = (name) => {
					const script = path.join(install, `Start_${name}.bat`);
					fs.writeFileSync(script, "rem\r\n");
					const shared = Object.fromEntries(["GameUserSettings.ini", "Game.ini"].map((f) => [f, path.join(live, f)]));
					return serverEntry(install, { name, type: "ark", updateAppId: "2430930", processName: `nope-${name}.exe`, startScriptPath: script, workingDir: install, configPaths: shared });
				};
				return [entry("Ragnarok"), entry("Ragnarok2")];
			},
		});
		api = panel.api;
		({ migrateSharedConfigs } = await import("../../src/server/services/perServerConfig.js"));
	});
	after(() => panel.stop());

	const config = (name, file = "GameUserSettings.ini") => api.get(`/api/config/${encodeURIComponent(name)}?file=${encodeURIComponent(file)}`);

	it("gives each server a folder of its own, seeded from what the shared folder held", async () => {
		for (const name of ["Ragnarok", "Ragnarok2"]) {
			const res = await config(name);
			assert.equal(res.status, 200);
			assert.match(res.json.content, /FromLive=1/);
			assert.ok(fs.existsSync(path.join(install, "GodlyPanelConfigs", name, "GameUserSettings.ini")));
		}
	});

	it("saves one server's settings without touching another's or the shared file", async () => {
		const saved = await api.post("/api/config/Ragnarok", { fileName: "GameUserSettings.ini", content: "[ServerSettings]\r\nOnlyRagnarok=1\r\n" });
		assert.equal(saved.status, 200);
		assert.match((await config("Ragnarok")).json.content, /OnlyRagnarok=1/);
		assert.match((await config("Ragnarok2")).json.content, /FromLive=1/);
		assert.match(fs.readFileSync(path.join(live, "GameUserSettings.ini"), "utf8"), /FromLive=1/);
	});

	it("leaves a migrated server alone the second time", async () => {
		await migrateSharedConfigs();
		assert.match((await config("Ragnarok")).json.content, /OnlyRagnarok=1/);
	});
});

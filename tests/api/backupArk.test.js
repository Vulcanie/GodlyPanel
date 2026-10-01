import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry } from "../helpers/instance.js";
import { optionValue } from "../../src/server/services/backupService.js";

// Several ARK Ascended maps share one install, each with its own save folder named in its launch line. A server's
// backup is its own map's folder (plus the small shared settings), never the whole Saved folder.

describe("reading an option out of a launch line", () => {
	const line = 'start /MIN "R" ArkAscendedServer.exe Ragnarok_WP?SessionName=Godly?AltSaveDirectoryName=RagnarokSave?MaxPlayers=10?ClusterId=C -RCONPort=27025';
	it("finds it between question marks and at the end", () => {
		assert.equal(optionValue(line, "AltSaveDirectoryName"), "RagnarokSave");
		assert.equal(optionValue(line, "ClusterId"), "C");
		assert.equal(optionValue("X?AltSaveDirectoryName=Last", "AltSaveDirectoryName"), "Last");
	});
	it("is not fooled by a similar name, or by nothing", () => {
		assert.equal(optionValue(line, "SaveDirectory"), null);
		assert.equal(optionValue(line, "Nope"), null);
		assert.equal(optionValue("", "ClusterId"), null);
	});
});

describe("ARK Ascended backups with several maps in one install", () => {
	let panel;
	let api;
	let install;

	before(async () => {
		panel = await startInstance({
			servers: (dir) => {
				install = path.join(dir, "ark-asa");
				const saved = path.join(install, "ShooterGame", "Saved");
				for (const rel of ["RagnarokSave", "IslandSave", "SavedArks/TheIsland_WP", "Config/WindowsServer"]) fs.mkdirSync(path.join(saved, rel), { recursive: true });
				fs.mkdirSync(path.join(install, "ClusterStorage"), { recursive: true });
				const script = (name, map, alt) => {
					const file = path.join(install, `Start_${name}.bat`);
					fs.writeFileSync(file, `start /MIN "${name}" ArkAscendedServer.exe ${map}?SessionName=${name}${alt ? `?AltSaveDirectoryName=${alt}` : ""}?MaxPlayers=10 -RCONPort=27025\r\n`);
					return file;
				};
				const entry = (name, file) => serverEntry(install, { name, type: "ark", updateAppId: "2430930", processName: `nope-${name}.exe`, startScriptPath: file, workingDir: install, installDir: install });
				return [entry("Ragnarok", script("Ragnarok", "Ragnarok_WP", "RagnarokSave")), entry("Island", script("Island", "TheIsland_WP", "IslandSave")), entry("Plain", script("Plain", "TheIsland_WP", null))];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	const specs = async (name) => (await api.get(`/api/server/${encodeURIComponent(name)}/backups`)).json.specs;
	const rel = (p) => path.relative(install, p).replaceAll("\\", "/");

	it("backs up each map's own folder, so the same world isn't copied once per server", async () => {
		const a = await specs("Ragnarok");
		const b = await specs("Island");
		assert.equal(rel(a.find((s) => s.label === "This map's saved world").path), "ShooterGame/Saved/RagnarokSave");
		assert.equal(rel(b.find((s) => s.label === "This map's saved world").path), "ShooterGame/Saved/IslandSave");
		assert.equal(a.find((s) => s.label === "This map's saved world").exists, true);
	});

	it("also takes the shared settings and the cluster's transfer folder", async () => {
		const a = await specs("Ragnarok");
		assert.deepEqual(a.filter((s) => s.exists).map((s) => rel(s.path)).sort(), ["ClusterStorage", "ShooterGame/Saved/Config/WindowsServer", "ShooterGame/Saved/RagnarokSave"]);
	});

	it("falls back to the game's default folder when the launch line names none", async () => {
		const p = await specs("Plain");
		assert.equal(rel(p.find((s) => s.label === "This map's saved world").path), "ShooterGame/Saved/SavedArks");
	});
});

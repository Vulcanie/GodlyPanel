import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BACKUP_TEMPLATES } from "../../src/server/data/backupTemplates.js";

// Subsistence keeps its world in UDKGame/SaveData and its settings in UDKGame/Config. Whether the server runs from
// the game's root (an imported one) or from Binaries/Win64 (one the panel made), the template must find them.

const existing = (workingDir) =>
	BACKUP_TEMPLATES.subsistence.paths.map((p) => ({ ...p, full: path.resolve(workingDir, p.rel) })).filter((p) => fs.existsSync(p.full));

describe("Subsistence backup folders", () => {
	let root;
	before(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-subs-"));
		for (const dir of ["UDKGame/SaveData", "UDKGame/Config", "Binaries/Win64"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
	});
	after(() => fs.rmSync(root, { recursive: true, force: true }));

	it("finds them when the server runs from the game's root", () => {
		const found = existing(root);
		assert.deepEqual(found.map((p) => p.label).sort(), ["Saved world and players", "Server settings"]);
	});

	it("finds them when the server runs from Binaries/Win64", () => {
		const found = existing(path.join(root, "Binaries", "Win64"));
		assert.deepEqual(found.map((p) => path.relative(root, p.full).replaceAll("\\", "/")).sort(), ["UDKGame/Config", "UDKGame/SaveData"]);
	});

	it("never picks the same folder twice (one archive can't hold two with one name)", () => {
		for (const dir of [root, path.join(root, "Binaries", "Win64")]) {
			const leaves = existing(dir).map((p) => path.basename(p.full).toLowerCase());
			assert.equal(new Set(leaves).size, leaves.length);
		}
	});
});

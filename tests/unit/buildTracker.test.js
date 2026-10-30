import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { removeDir } from "../helpers/instance.js";

// The panel reads the installed build id from Steam's own manifest for the game. It must never read outside the install folder,
// so an app id that is not plain digits is refused before it goes into a path.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-build-"));
process.env.GHP_DATA_DIR = dir;
const { readInstalledBuild } = await import("../../src/server/services/buildTracker.js");

const install = path.join(dir, "game");
const manifest = (name, text) => {
	fs.mkdirSync(path.join(install, "steamapps"), { recursive: true });
	fs.writeFileSync(path.join(install, "steamapps", name), text);
};

describe("reading the installed build id", () => {
	before(() => {
		manifest("appmanifest_123.acf", `"AppState"\n{\n\t"appid"\t\t"123"\n\t"buildid"\t\t"4567"\n\t"Universe"\t\t"1"\n}\n`);
		manifest("appmanifest_124.acf", `"AppState"\n{\n\t"appid"\t\t"124"\n}\n`);
	});
	after(() => removeDir(dir));

	it("returns the build id from the app's manifest", async () => {
		assert.equal(await readInstalledBuild({ name: "A", installDir: install, updateAppId: "123" }), "4567");
	});

	it("null when the manifest is missing", async () => {
		assert.equal(await readInstalledBuild({ name: "A", installDir: install, updateAppId: "999" }), null);
	});

	it("null when the manifest has no build id", async () => {
		assert.equal(await readInstalledBuild({ name: "A", installDir: install, updateAppId: "124" }), null);
	});

	it("null with no install folder or no app id", async () => {
		assert.equal(await readInstalledBuild({ name: "A", installDir: null, updateAppId: "123" }), null);
		assert.equal(await readInstalledBuild({ name: "A", installDir: install }), null);
	});

	it("null for an app id that is not plain digits, so it never reaches a path", async () => {
		assert.equal(await readInstalledBuild({ name: "A", installDir: install, updateAppId: "1;2" }), null);
		assert.equal(await readInstalledBuild({ name: "A", installDir: install, updateAppId: "../x" }), null);
	});
});

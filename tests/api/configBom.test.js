import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { serverEntry } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Some games write their own settings with a byte-order mark (V Rising's default ServerHostSettings.json starts with one), and
// Windows PowerShell and Notepad add one too. A mark in front of the text makes the form's JSON.parse fail, so the form never gets
// it; and saving puts it back so the file stays as the game wrote it.

const BOM = "﻿";

describe("a settings file saved with a byte-order mark", () => {
	let panel;
	let api;
	let file;

	before(async () => {
		panel = await startInProcess({
			servers: (dir) => {
				const home = path.join(dir, "vrising");
				fs.mkdirSync(home, { recursive: true });
				file = path.join(home, "ServerHostSettings.json");
				fs.writeFileSync(file, `${BOM}{\n  "Name": "Bom Test"\n}\n`);
				return [serverEntry(home, { name: "Bom", type: "vrising", method: "process", configPath: file, processName: "VRisingServer.exe" })];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("is sent to the form without the mark", async () => {
		const read = await api.get("/api/config/Bom?file=ServerHostSettings.json");
		assert.equal(read.status, 200, JSON.stringify(read.json));
		assert.equal(read.json.content.charCodeAt(0), "{".charCodeAt(0));
		assert.doesNotThrow(() => JSON.parse(read.json.content));
	});

	it("keeps its mark when it is saved again", async () => {
		const saved = await api.post("/api/config/Bom", { fileName: "ServerHostSettings.json", content: '{\n  "Name": "Changed"\n}\n' });
		assert.equal(saved.status, 200, JSON.stringify(saved.json));
		assert.equal(fs.readFileSync(file, "utf8"), `${BOM}{\n  "Name": "Changed"\n}\n`);
	});

	it("does not gain a mark it never had", async () => {
		fs.writeFileSync(file, '{\n  "Name": "Plain"\n}\n');
		await api.post("/api/config/Bom", { fileName: "ServerHostSettings.json", content: '{\n  "Name": "Plain 2"\n}\n' });
		assert.equal(fs.readFileSync(file, "utf8").charCodeAt(0), "{".charCodeAt(0));
	});
});

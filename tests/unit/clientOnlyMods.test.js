import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

// A modpack's mods are resolved through CurseForge, which tags each file with the places it runs
// ("Client", "Server", a game version, a loader). A file tagged Client and not Server is dead weight on
// a dedicated server and is left out; anything else, including a file with no such tag, is kept.
// The stand-in below answers like CurseForge's /mods/files and serves the files themselves.

const FILES = {
	// id: [fileName, gameVersions, downloadable]
	1: ["client-only.jar", ["1.20.1", "Fabric", "Client"], true],
	2: ["server-only.jar", ["1.20.1", "Fabric", "Server"], true],
	3: ["both-sides.jar", ["1.20.1", "Fabric", "Client", "Server"], true],
	4: ["untagged.jar", ["1.20.1", "Fabric"], true],
	5: ["no-tags-at-all.jar", undefined, true],
	6: ["no-download-url.jar", ["Server"], false],
	7: ["client-lowercase-lookalike.jar", ["client"], true],
};

describe("client-only mods in a modpack", () => {
	let dir;
	let stand;
	let resolveAndDownloadMods;
	let isClientOnly;
	let seenKeys = [];

	before(async () => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-cf-"));
		stand = http.createServer((req, res) => {
			if (req.method === "POST" && req.url === "/v1/mods/files") {
				seenKeys.push(req.headers["x-api-key"]);
				let body = "";
				req.on("data", (c) => (body += c));
				req.on("end", () => {
					const { fileIds } = JSON.parse(body);
					const data = fileIds
						.filter((id) => FILES[id])
						.map((id) => ({ id, fileName: FILES[id][0], gameVersions: FILES[id][1], downloadUrl: FILES[id][2] ? `http://127.0.0.1:${stand.address().port}/files/${FILES[id][0]}` : null }));
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ data }));
				});
				return;
			}
			if (req.url.startsWith("/files/")) return res.end(`contents of ${req.url.slice(7)}`);
			res.statusCode = 404;
			res.end();
		});
		await new Promise((resolve) => stand.listen(0, "127.0.0.1", resolve));

		process.env.GHP_DATA_DIR = dir;
		process.env.GHP_CURSEFORGE_API = `http://127.0.0.1:${stand.address().port}/v1`;
		const secrets = await import("../../src/server/config/secretsStore.js");
		await secrets.initSecrets();
		await secrets.patchSecrets({ curseForgeApiKey: "test-key" });
		({ resolveAndDownloadMods, isClientOnly } = await import("../../src/server/services/modpackService.js"));
	});

	after(async () => {
		await new Promise((resolve) => stand.close(resolve));
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("tells client-only from everything else", () => {
		assert.equal(isClientOnly(["1.20.1", "Client"]), true);
		assert.equal(isClientOnly(["Client", "Server"]), false, "both sides: needed");
		assert.equal(isClientOnly(["Server"]), false);
		assert.equal(isClientOnly(["1.20.1", "Fabric"]), false, "untagged: kept rather than guessed at");
		assert.equal(isClientOnly(undefined), false);
		assert.equal(isClientOnly([]), false);
	});

	it("leaves client-only files out of the server's mods folder and says which", async () => {
		const mods = path.join(dir, "mods");
		const progress = [];
		const manifest = { files: Object.keys(FILES).map((id) => ({ projectID: 100 + Number(id), fileID: Number(id) })) };
		const result = await resolveAndDownloadMods(manifest, mods, { onProgress: (done, total) => progress.push([done, total]) });

		assert.deepEqual(result.skippedClientOnly.map((s) => s.fileName), ["client-only.jar"]);
		assert.deepEqual(fs.readdirSync(mods).sort(), ["both-sides.jar", "client-lowercase-lookalike.jar", "no-tags-at-all.jar", "server-only.jar", "untagged.jar"]);
		assert.deepEqual(result.downloaded.sort(), fs.readdirSync(mods).sort());
		assert.equal(fs.readFileSync(path.join(mods, "server-only.jar"), "utf8"), "contents of server-only.jar");
		assert.equal(result.failed.length, 1);
		assert.match(result.failed[0].reason, /third-party distribution/);
		assert.deepEqual(progress.at(-1), [Object.keys(FILES).length, Object.keys(FILES).length], "every file is counted, skipped ones too");
		assert.ok(seenKeys.every((k) => k === "test-key"), "the saved key is what is sent");
	});

	it("asks for the key only when there is something to look up", async () => {
		const secrets = await import("../../src/server/config/secretsStore.js");
		await secrets.patchSecrets({ curseForgeApiKey: "" });
		const none = await resolveAndDownloadMods({ files: [] }, path.join(dir, "empty"));
		assert.deepEqual(none, { downloaded: [], failed: [], skippedClientOnly: [] });
		await assert.rejects(resolveAndDownloadMods({ files: [{ projectID: 1, fileID: 1 }] }, path.join(dir, "nokey")), /No CurseForge API key/);
	});
});

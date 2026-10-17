import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { until } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// A game installed from a GitHub release zip (a template's `zipInstall`) is never downloaded without the person agreeing to it:
// the API answers 409 with its own code, and the details the form needs to say what, from where and how big, until the request
// carries acceptZipDownload. GitHub and the unpacker are replaced (zipDeps), so nothing here touches the network.

const onWindows = process.platform === "win32";
const BODY = Buffer.from("a pretend zip file");
const DIGEST = crypto.createHash("sha256").update(BODY).digest("hex");
const GOOD_URL = "https://github.com/owner/zipgame/releases/download/v9.9.9/zipgame.zip";

const release = (extra = {}) => ({
	tag_name: "v9.9.9",
	assets: [{ name: "zipgame.zip", size: BODY.length, digest: `sha256:${DIGEST}`, browser_download_url: GOOD_URL, ...extra }],
});

describe("creating a server from a GitHub release zip", () => {
	let panel;
	let api;
	let zipDeps;
	let requests;
	let current; // what the pretend GitHub answers with

	const create = (body) => api.post("/api/servers", { templateId: "zipgame", name: "Zip One", ...body });

	before(async () => {
		panel = await startInProcess({
			prepare: (dir) => fs.mkdirSync(path.join(dir, "servers"), { recursive: true }),
		});
		api = panel.api;
		await api.put("/api/settings", { paths: { serversRoot: path.join(panel.dir, "servers") } });

		// Server modules are loaded only now, after the data folder is fixed.
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		({ zipDeps } = await import("../../src/server/services/zipInstall.js"));
		GAME_TEMPLATES.push({
			id: "zipgame",
			displayName: "Zip Game",
			type: "zipgame",
			method: "process",
			fields: ["sessionName"],
			ports: [{ key: "port", label: "Game Port", default: 9111 }],
			zipInstall: { repo: "owner/zipgame", asset: "zipgame.zip", expect: ["server.exe"] },
			buildStartScriptFilename: () => "Start_Zip.bat",
			buildStartScript: () => "@echo off\r\ncd /d \"%~dp0\"\r\nstart /MIN \"zip\" server.exe\r\n",
			buildServerEntry: (p) => ({
				name: p.name,
				type: "zipgame",
				method: "process",
				host: "127.0.0.1",
				port: p.port,
				startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
				workingDir: `${p.installDir}`,
				processName: "server.exe",
				installDir: `${p.installDir}\\`,
			}),
		});

		requests = [];
		current = release();
		zipDeps.fetchImpl = async (url) => {
			requests.push(String(url));
			if (String(url).startsWith("https://api.github.com/")) return new Response(JSON.stringify(current), { status: 200, headers: { "Content-Type": "application/json" } });
			const res = new Response(BODY, { status: 200 });
			Object.defineProperty(res, "url", { value: String(url) });
			return res;
		};
		zipDeps.archive = {
			list: async () => ["server.exe"],
			extract: async (_zip, dir) => fs.writeFileSync(path.join(dir, "server.exe"), "x"),
		};
	});
	after(() => {
		delete zipDeps?.fetchImpl;
		delete zipDeps?.archive;
		return panel.stop();
	});

	it("lists where the game comes from, so the form can say it", async () => {
		const t = (await api.get("/api/templates")).json.find((x) => x.id === "zipgame");
		assert.deepEqual(t.zipInstall, { repo: "owner/zipgame", asset: "zipgame.zip" });
		assert.equal((await api.get("/api/templates")).json.find((x) => x.id === "valheim").zipInstall, null, "a SteamCMD game has none");
	});

	it("answers 409 with its own code, and what will be fetched, until the person agrees", async () => {
		requests.length = 0;
		const r = await create({ port: 9111 });
		assert.equal(r.status, 409, JSON.stringify(r.json));
		assert.equal(r.json.code, "zip-download-not-accepted");
		assert.notEqual(r.json.code, "steamcmd-not-installed");
		assert.deepEqual(r.json.details, { repo: "owner/zipgame", asset: "zipgame.zip", tag: "v9.9.9", size: BODY.length, sizeText: "1 KB" });
		assert.match(r.json.error, /GitHub/);
		assert.deepEqual(requests, ["https://api.github.com/repos/owner/zipgame/releases/latest"], "only the release's details were read; the file was not requested");
		assert.equal(fs.existsSync(path.join(panel.dir, "servers", "zip-one")), false, "and no folder was made");
		const registered = JSON.parse(fs.readFileSync(path.join(panel.dir, "servers.json"), "utf8")).servers.map((s) => s.name);
		assert.equal(registered.includes("Zip One"), false);
	});

	it("takes anything but a real true for no", async () => {
		for (const acceptZipDownload of ["true", 1, "yes", false, null]) {
			const r = await create({ port: 9111, acceptZipDownload });
			assert.equal(r.status, 409, JSON.stringify(acceptZipDownload));
			assert.equal(r.json.code, "zip-download-not-accepted");
		}
	});

	it("still asks, without a size, when GitHub cannot be reached", async () => {
		const keep = zipDeps.fetchImpl;
		zipDeps.fetchImpl = async () => {
			throw new Error("offline");
		};
		try {
			const r = await create({ port: 9111 });
			assert.equal(r.status, 409);
			assert.equal(r.json.code, "zip-download-not-accepted");
			assert.deepEqual(r.json.details, { repo: "owner/zipgame", asset: "zipgame.zip" });
		} finally {
			zipDeps.fetchImpl = keep;
		}
	});

	it("refuses with an ordinary error, not the question, when the release has no checksum", async () => {
		current = release({ digest: null });
		try {
			const r = await create({ port: 9111 });
			assert.equal(r.status, 400, JSON.stringify(r.json));
			assert.match(r.json.error, /publishes no SHA-256/);
		} finally {
			current = release();
		}
	});

	it("checks the ports before it asks anything", async () => {
		const r = await create({ port: 80 });
		assert.equal(r.status, 400);
		assert.match(r.json.error, /whole number from 1024 to 65535/);
	});

	it("installs once the person has agreed: downloads, checks, unpacks, writes the script and registers the server", { skip: !onWindows }, async () => {
		requests.length = 0;
		const r = await create({ port: 9111, acceptZipDownload: true });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		const job = await until(async () => {
			const j = (await api.get(`/api/servers/create/${r.json.jobId}`)).json;
			return j.status === "done" || j.status === "error" ? j : null;
		});
		assert.equal(job.status, "done", JSON.stringify(job));
		assert.equal(requests.filter((u) => u === GOOD_URL).length, 1, "the file was fetched exactly once");
		const dir = path.join(panel.dir, "servers", "zip-one");
		assert.ok(fs.existsSync(path.join(dir, "server.exe")));
		assert.ok(fs.existsSync(path.join(dir, "Start_Zip.bat")));
		assert.equal(fs.existsSync(path.join(dir, ".godlypanel-download")), false, "the download is cleaned up");
		const log = fs.readFileSync(job.logPath, "utf8");
		assert.match(log, /Asking GitHub for the latest release of owner\/zipgame/);
		assert.match(log, /SHA-256 matches/);
		assert.match(log, /Installed v9\.9\.9/);
		const registered = JSON.parse(fs.readFileSync(path.join(panel.dir, "servers.json"), "utf8")).servers.map((s) => s.name);
		assert.ok(registered.includes("Zip One"));
	});
});

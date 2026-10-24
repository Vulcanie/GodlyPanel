import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { until } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// A game installed from its maker's website (a template's `webInstall`) is never downloaded without the person agreeing to it: the
// API answers 409 with its own code, and the details the form needs to say what, from where, how big and whether a checksum exists,
// until the request carries acceptWebDownload. The network is replaced (webDeps), so nothing here touches the internet.

const onWindows = process.platform === "win32";
const BODY = Buffer.from("a pretend server jar");
const SHA1 = crypto.createHash("sha1").update(BODY).digest("hex");
const URL_OK = "https://files.example.com/webgame/server.jar";

describe("creating a server from the maker's website", () => {
	let panel;
	let api;
	let webDeps;
	let requests;
	let published; // whether the pretend maker publishes a checksum

	const create = (body) => api.post("/api/servers", { templateId: "webgame", name: "Web One", ...body });

	before(async () => {
		panel = await startInProcess({
			prepare: (dir) => fs.mkdirSync(path.join(dir, "servers"), { recursive: true }),
		});
		api = panel.api;
		await api.put("/api/settings", { paths: { serversRoot: path.join(panel.dir, "servers") } });

		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		({ webDeps } = await import("../../src/server/services/webInstall.js"));
		published = true;
		GAME_TEMPLATES.push({
			id: "webgame",
			displayName: "Web Game",
			type: "webgame",
			method: "process",
			fields: ["sessionName"],
			ports: [{ key: "port", label: "Game Port", default: 9112 }],
			webInstall: {
				label: "Web Game server 1.0",
				hosts: ["files.example.com"],
				kind: "file",
				fileName: "server.jar",
				resolve: async () => ({ url: URL_OK, bytes: BODY.length, sha1: published ? SHA1 : null, version: "1.0" }),
			},
			buildStartScriptFilename: () => "Start_Web.bat",
			buildStartScript: () => "@echo off\r\ncd /d \"%~dp0\"\r\nstart /MIN \"web\" java -jar server.jar\r\n",
			buildServerEntry: (p) => ({
				name: p.name,
				type: "webgame",
				method: "process",
				host: "127.0.0.1",
				port: p.port,
				startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
				workingDir: `${p.installDir}`,
				processName: "java.exe",
				installDir: `${p.installDir}\\`,
			}),
		});

		const base = GAME_TEMPLATES.find((t) => t.id === "webgame");
		GAME_TEMPLATES.push({
			...base,
			id: "webgame-extras",
			displayName: "Web Game With Extras",
			webInstall: {
				...base.webInstall,
				extras: [
					{
						label: "Helper Framework 4.0",
						why: "the server will not start without it",
						hosts: ["files.example.com"],
						url: "https://files.example.com/helper.msi",
						kind: "msi",
						bytes: 7054848,
						sha256: "a".repeat(64),
						signer: "Example Corporation",
						pick: /\.dll$/i,
						into: "",
					},
				],
			},
		});

		requests = [];
		webDeps.fetchImpl = async (url) => {
			requests.push(String(url));
			const res = new Response(BODY, { status: 200 });
			Object.defineProperty(res, "url", { value: String(url) });
			return res;
		};
	});
	after(() => {
		delete webDeps?.fetchImpl;
		return panel.stop();
	});

	it("lists where the game comes from, so the form can say it", async () => {
		const all = (await api.get("/api/templates")).json;
		assert.deepEqual(all.find((x) => x.id === "webgame").webInstall, { label: "Web Game server 1.0", hosts: ["files.example.com"] });
		assert.equal(all.find((x) => x.id === "valheim").webInstall, null, "a SteamCMD game has none");
	});

	it("answers 409 with its own code, and what will be fetched, until the person agrees", async () => {
		requests.length = 0;
		const r = await create({ port: 9112 });
		assert.equal(r.status, 409, JSON.stringify(r.json));
		assert.equal(r.json.code, "web-download-not-accepted");
		assert.deepEqual(r.json.details, { label: "Web Game server 1.0", host: "files.example.com", version: "1.0", size: BODY.length, sizeText: "1 KB", checksum: "SHA-1" });
		assert.deepEqual(requests, [], "nothing was requested but the lookup");
		assert.equal(fs.existsSync(path.join(panel.dir, "servers", "web-one")), false, "and no folder was made");
	});

	it("also asks about the extra files a game needs: what, from where, how big, signed by whom", async () => {
		requests.length = 0;
		const r = await api.post("/api/servers", { templateId: "webgame-extras", name: "Web Two", port: 9112 });
		assert.equal(r.status, 409, JSON.stringify(r.json));
		assert.equal(r.json.code, "web-download-not-accepted");
		assert.deepEqual(r.json.details.extras, [
			{ label: "Helper Framework 4.0", why: "the server will not start without it", host: "files.example.com", size: 7054848, sizeText: "6.7 MB", signer: "Example Corporation" },
		]);
		assert.match(r.json.error, /Helper Framework 4\.0/);
		assert.deepEqual(requests, [], "nothing was requested but the lookup");
		assert.equal("extras" in (await api.post("/api/servers", { templateId: "webgame", name: "Web One", port: 9112 })).json.details, false, "a game with none says nothing of them");
	});

	it("says in the question when the maker publishes no checksum", async () => {
		published = false;
		try {
			const r = await create({ port: 9112 });
			assert.equal(r.status, 409);
			assert.equal(r.json.details.checksum, null);
			assert.match(r.json.error, /no checksum/i);
		} finally {
			published = true;
		}
	});

	it("takes anything but a real true for no", async () => {
		for (const acceptWebDownload of ["true", 1, "yes", false, null]) {
			const r = await create({ port: 9112, acceptWebDownload });
			assert.equal(r.status, 409, JSON.stringify(acceptWebDownload));
			assert.equal(r.json.code, "web-download-not-accepted");
		}
	});

	it("installs once the person has agreed: downloads, checks, writes the script and registers the server", { skip: !onWindows }, async () => {
		requests.length = 0;
		const r = await create({ port: 9112, acceptWebDownload: true });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		const job = await until(async () => {
			const j = (await api.get(`/api/servers/create/${r.json.jobId}`)).json;
			return j.status === "done" || j.status === "error" ? j : null;
		});
		assert.equal(job.status, "done", JSON.stringify(job));
		assert.deepEqual(requests, [URL_OK]);
		const dir = path.join(panel.dir, "servers", "web-one");
		assert.equal(fs.readFileSync(path.join(dir, "server.jar"), "utf8"), BODY.toString());
		assert.ok(fs.existsSync(path.join(dir, "Start_Web.bat")));
		assert.match(fs.readFileSync(job.logPath, "utf8"), /Installed 1\.0/);
		const registered = JSON.parse(fs.readFileSync(path.join(panel.dir, "servers.json"), "utf8")).servers.map((s) => s.name);
		assert.ok(registered.includes("Web One"));
	});
});

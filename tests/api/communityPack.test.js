import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import { serverEntry } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// The mod pack on the community address: a link with a secret token that a player can open without signing in. Every failed link
// must look the same, nothing about the server may leak, and the token must never reach the activity log. Only the admin turns it on.

// Pack temp folders are made in the temp folder, so this file gets its own, to see that its downloads clean up after themselves.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gp-sharetest-"));
process.env.TMPDIR = tmp;
process.env.TMP = tmp;
process.env.TEMP = tmp;

const PUBLIC = "pack-share-test.example.com";
const RCON = "rcon-sentinel-7731";
const SERVER = "Zq Server";
const enc = encodeURIComponent;
const shareUrl = `/api/server/${enc(SERVER)}/mods/share`;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;
const NOT_FOUND = JSON.stringify({ error: "Not found." });

// Each request comes from its own address, so the per-address limit doesn't trip on the ordinary tests.
let addresses = 0;
const freshAddress = () => `198.51.100.${(addresses += 1) % 250}`;

describe("the mod pack on the community address", () => {
	let panel;
	let listener;
	let port;
	let api;
	let dirs;
	let modCookie;
	const tokensSeen = new Set();

	/** A request to the community address, as the tunnel would send it: arriving from this PC, with the public name as Host. */
	function raw(method, url, { headers = {}, body } = {}) {
		return new Promise((resolve, reject) => {
			const data = body === undefined ? undefined : JSON.stringify(body);
			const req = http.request(
				{
					host: "127.0.0.1",
					port,
					method,
					path: url,
					headers: {
						Host: PUBLIC,
						"cf-connecting-ip": freshAddress(),
						...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
						...headers,
					},
				},
				(res) => {
					const chunks = [];
					res.on("data", (c) => chunks.push(c));
					res.on("end", () => {
						const buffer = Buffer.concat(chunks);
						resolve({ status: res.statusCode, headers: res.headers, buffer, text: buffer.toString("utf8") });
					});
				},
			);
			req.on("error", reject);
			if (data) req.write(data);
			req.end();
		});
	}

	const enable = (enabled) => api.put(shareUrl, { enabled });
	const rotate = () => api.post(`${shareUrl}/rotate`, {});
	const remember = (r) => {
		if (r.json?.token) tokensSeen.add(r.json.token);
		return r;
	};

	before(async () => {
		panel = await startInProcess({
			prepare: (folder) => {
				dirs = {
					mc: path.join(folder, "world", "mc"),
					plain: path.join(folder, "world", "plain"),
					gone: path.join(folder, "world", "gone"),
				};
				fs.mkdirSync(path.join(dirs.mc, "mods"), { recursive: true });
				fs.mkdirSync(dirs.plain, { recursive: true });
				fs.mkdirSync(dirs.gone, { recursive: true });
				fs.writeFileSync(path.join(dirs.mc, "mods", "Cool.jar"), "cool mod bytes");
				fs.writeFileSync(path.join(dirs.mc, "mods", "Server.jar"), "server only bytes");
				// A Minecraft server's game version comes from its variables.txt, which the Modrinth pack needs.
				fs.writeFileSync(path.join(dirs.mc, "variables.txt"), "MINECRAFT_VERSION=1.21.1\nMODLOADER=fabric\n");
			},
			servers: () => [
				serverEntry(dirs.mc, { name: SERVER, type: "minecraft", installDir: dirs.mc, workingDir: dirs.mc, processName: "java-none.exe", rconPassword: RCON }),
				serverEntry(dirs.plain, { name: "Plain One", processName: "plain-none.exe" }),
				serverEntry(dirs.gone, { name: "Gone Soon", type: "minecraft", installDir: dirs.gone, workingDir: dirs.gone, processName: "gone-none.exe" }),
			],
		});
		api = panel.api;
		assert.equal((await api.post("/api/users", { username: "mod-share", password: "ModShare!12345", role: "moderator" })).status, 200);
		modCookie = await api.cookieFor({ username: "mod-share", password: "ModShare!12345" });

		// The lock records Cool.jar as a mod the players use, and Server.jar as one only the server runs.
		const lock = await import("../../src/server/services/modLock.js");
		const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
		await lock.add(SERVER, { id: "github:acme/cool", source: "github", ref: "acme/cool", version: "v1.0.0", side: "both", names: ["Cool.jar"], files: [{ path: "Cool.jar", sha256: sha("cool mod bytes") }] });
		await lock.add(SERVER, { id: "github:acme/serveronly", source: "github", ref: "acme/serveronly", version: "v1.0.0", side: "server", names: ["Server.jar"], files: [{ path: "Server.jar", sha256: sha("server only bytes") }] });

		listener = await import("../../src/server/services/communityListener.js");
		port = await listener.startListener({ port: 0, hostRule: () => ({ exact: PUBLIC }) });
	});
	after(async () => {
		await listener.stopListener();
		await panel.stop();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("is off by default: a link with any token is a plain 404", async () => {
		const r = await raw("GET", `/api/pack/${"a".repeat(43)}/manifest.json`);
		assert.equal(r.status, 404);
		assert.equal(r.text, NOT_FOUND);
		const status = (await api.get(shareUrl)).json;
		assert.equal(status.enabled, false);
		assert.equal(status.path, null);
		// Only a Minecraft server can make the Modrinth pack, and the admin's panel reads this to show its row.
		assert.equal(status.mrpack, true);
		assert.equal((await api.get(`/api/server/${enc("Plain One")}/mods/share`)).json.mrpack, false);
	});

	let token;
	it("the admin turns the share on, and the manifest carries nothing about the server", async () => {
		const on = remember(await enable(true));
		assert.equal(on.status, 200);
		assert.equal(on.json.enabled, true);
		assert.match(on.json.token, TOKEN_SHAPE);
		assert.equal(on.json.path, `/api/pack/${on.json.token}/`);
		token = on.json.token;

		const m = await raw("GET", `/api/pack/${token}/manifest.json`);
		assert.equal(m.status, 200);
		assert.match(m.headers["content-type"], /json/);
		const manifest = JSON.parse(m.text);
		assert.deepEqual(manifest.mods.map((x) => x.name), ["Cool.jar"], "the server-only mod is left out");
		for (const secret of [SERVER, dirs.mc, panel.dir, RCON]) assert.equal(m.text.includes(secret), false, `manifest mentions ${secret}`);
	});

	it("the zip holds the manifest, the README and the mod's own file, and no server-only mod", async () => {
		const z = await raw("GET", `/api/pack/${token}/mod-pack.zip`);
		assert.equal(z.status, 200);
		const zip = new AdmZip(z.buffer);
		assert.deepEqual(zip.getEntries().map((e) => e.entryName).sort(), ["README.txt", "manifest.json", "mods/Cool.jar"]);
		assert.equal(zip.readAsText("mods/Cool.jar"), "cool mod bytes");
	});

	it("the list is plain text naming the mod", async () => {
		const l = await raw("GET", `/api/pack/${token}/mod-list.txt`);
		assert.equal(l.status, 200);
		assert.match(l.headers["content-type"], /text\/plain/);
		assert.match(l.text, /Cool\.jar/);
		assert.equal(l.text.includes("Server.jar"), false);
	});

	it("the Modrinth pack is a zip with the index, for a Minecraft server, and holds no server-only mod", async () => {
		const m = await raw("GET", `/api/pack/${token}/mod-pack.mrpack`);
		assert.equal(m.status, 200);
		const zip = new AdmZip(m.buffer);
		assert.deepEqual(zip.getEntries().map((e) => e.entryName).sort(), ["modrinth.index.json", "overrides/mods/Cool.jar"]);
		const index = JSON.parse(zip.readAsText("modrinth.index.json"));
		assert.deepEqual(index.dependencies, { minecraft: "1.21.1" });
		// The index names the pack after the server, as a launcher shows it; the panel's folder and RCON password stay out.
		for (const secret of [dirs.mc, panel.dir, RCON]) assert.equal(zip.readAsText("modrinth.index.json").includes(secret), false, `index mentions ${secret}`);
	});

	it("needs no sign-in, and the community host rule still applies", async () => {
		const wrongHost = await raw("GET", `/api/pack/${token}/manifest.json`, { headers: { Host: "evil.example.com" } });
		assert.equal(wrongHost.status, 421);
	});

	it("every failed link gives the same 404: wrong, malformed, and an unknown file", async () => {
		const wrong = await raw("GET", `/api/pack/${"B".repeat(43)}/mod-pack.zip`);
		const malformed = await raw("GET", "/api/pack/short/mod-list.txt");
		const unknownFile = await raw("GET", `/api/pack/${token}/secret.txt`);
		for (const r of [wrong, malformed, unknownFile]) {
			assert.equal(r.status, 404);
			assert.equal(r.text, NOT_FOUND);
		}
	});

	it("answers carry no-store, no-referrer and noindex, even the 404s", async () => {
		const ok = await raw("GET", `/api/pack/${token}/manifest.json`);
		const missing = await raw("GET", `/api/pack/${"C".repeat(43)}/manifest.json`);
		for (const r of [ok, missing]) {
			assert.match(r.headers["cache-control"], /no-store/);
			assert.equal(r.headers["referrer-policy"], "no-referrer");
			assert.equal(r.headers["x-robots-tag"], "noindex");
		}
	});

	it("a pack link answers GET only", async () => {
		for (const method of ["POST", "PUT"]) {
			const r = await raw(method, `/api/pack/${token}/manifest.json`, { body: {} });
			assert.notEqual(r.status, 200, method);
			assert.equal(r.text.includes("Cool.jar"), false, method);
		}
	});

	it("the admin's share routes: a moderator is refused, a bad value is 400, a game without a mods folder is unsupported", async () => {
		const asMod = await api.call("PUT", shareUrl, { enabled: true }, { cookie: modCookie });
		assert.equal(asMod.status, 403);
		const bad = await enable("yes");
		assert.equal(bad.status, 400);
		assert.equal(bad.json.code, "bad_input");
		const plain = await api.put(`/api/server/${enc("Plain One")}/mods/share`, { enabled: true });
		assert.equal(plain.json.code, "unsupported");
		assert.equal((await api.put(`/api/server/${enc("Plain One")}/mods/share`, { enabled: false })).status, 200, "turning off is always allowed");
	});

	it("rotating gives a new link, and the old one answers exactly like a wrong one", async () => {
		const first = await raw("GET", `/api/pack/${token}/manifest.json`);
		assert.equal(first.status, 200);
		const r = remember(await rotate());
		assert.equal(r.status, 200);
		assert.notEqual(r.json.token, token);
		const old = await raw("GET", `/api/pack/${token}/manifest.json`);
		const wrong = await raw("GET", `/api/pack/${"D".repeat(43)}/manifest.json`);
		assert.equal(old.status, 404);
		assert.equal(old.text, wrong.text);
		assert.equal((await raw("GET", `/api/pack/${r.json.token}/manifest.json`)).status, 200);
		token = r.json.token;
	});

	it("turning the share off stops the link, and turning it on again makes a new one", async () => {
		const off = remember(await enable(false));
		assert.equal(off.status, 200);
		assert.equal(off.json.enabled, false);
		assert.equal(off.json.path, null);
		const old = await raw("GET", `/api/pack/${token}/manifest.json`);
		assert.equal(old.status, 404);
		assert.equal(old.text, NOT_FOUND);

		assert.equal((await rotate()).json.code, "not_enabled");

		const again = remember(await enable(true));
		assert.notEqual(again.json.token, token);
		token = again.json.token;
	});

	it("the token never reaches the activity log, and the changes are logged in plain words", async () => {
		const activity = JSON.stringify((await api.get("/api/activity?limit=500")).json);
		for (const t of tokensSeen) assert.equal(activity.includes(t), false, "a link's token is in the activity log");
		assert.match(activity, /Sharing the mod pack of Zq Server was turned on/);
		assert.match(activity, /Sharing the mod pack of Zq Server was turned off/);
		assert.match(activity, /its link was changed/);
	});

	it("the 31st pack request from one address in a minute is 429", async () => {
		const headers = { "cf-connecting-ip": "203.0.113.200" };
		for (let i = 0; i < 30; i += 1) {
			assert.equal((await raw("GET", `/api/pack/${"E".repeat(43)}/manifest.json`, { headers })).status, 404, `request ${i + 1}`);
		}
		const limited = await raw("GET", `/api/pack/${"E".repeat(43)}/manifest.json`, { headers });
		assert.equal(limited.status, 429);
		assert.deepEqual(JSON.parse(limited.text), { error: "Slow down a little.", code: "rate_limited" });
	});

	it("a temp pack folder is gone once a zip download has finished", async () => {
		const leftovers = () => fs.readdirSync(tmp).filter((n) => n.startsWith("ghp-pack-"));
		const z = await raw("GET", `/api/pack/${token}/mod-pack.zip`);
		assert.equal(z.status, 200);
		const deadline = Date.now() + 3000;
		while (leftovers().length > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
		assert.deepEqual(leftovers(), []);
	});

	it("a Modrinth pack link that is wrong, or for a Minecraft server with no known game version, is the same 404", async () => {
		const wrong = await raw("GET", `/api/pack/${"B".repeat(43)}/mod-pack.mrpack`);
		assert.equal(wrong.status, 404);
		assert.equal(wrong.text, NOT_FOUND);
		// Gone Soon is a Minecraft server with no variables.txt, so the panel can't say which game version to pack for.
		const on = remember(await api.put(`/api/server/${enc("Gone Soon")}/mods/share`, { enabled: true }));
		const noVersion = await raw("GET", `/api/pack/${on.json.token}/mod-pack.mrpack`);
		assert.equal(noVersion.status, 404);
		assert.equal(noVersion.text, NOT_FOUND);
	});

	it("removing the server removes its share, so the old link stops working", async () => {
		const on = remember(await api.put(`/api/server/${enc("Gone Soon")}/mods/share`, { enabled: true }));
		assert.equal(on.status, 200);
		const oldToken = on.json.token;
		const removed = await api.call("DELETE", `/api/server/${enc("Gone Soon")}`, { confirmName: "Gone Soon", deleteFiles: false });
		assert.equal(removed.status, 200);
		const r = await raw("GET", `/api/pack/${oldToken}/manifest.json`);
		assert.equal(r.status, 404);
		assert.equal(r.text, NOT_FOUND);
		const shares = await import("../../src/server/services/packShare.js");
		assert.deepEqual(await shares.shareStatus("Gone Soon"), { enabled: false, token: null, createdAt: null });
	});
});

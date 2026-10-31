import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

// The CurseForge provider: a project and its files from CurseForge's API, then the one file the installer downloads. The stand-in
// server answers like CurseForge's core API and records every request, so a test can check what was asked and with which headers.
// Installing uses the same loopback test hook as the installer tests.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-cf-"));
const tmp = path.join(root, "tmp");
fs.mkdirSync(tmp, { recursive: true });
process.env.TMPDIR = tmp;
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.GHP_DATA_DIR = path.join(root, "data");
const savedLoopback = process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
const savedCurseForge = process.env.GHP_CURSEFORGE_API;
process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = "1";

const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const secrets = await import("../../src/server/config/secretsStore.js");
const { ModError } = await import("../../src/server/services/modService.js");
const { getProvider } = await import("../../src/server/services/modSources/index.js");
const { installFromSource } = await import("../../src/server/services/modSources/installer.js");

const REFUSAL = { message: "That address isn't one the panel will download from." };
const sha1 = (bytes) => crypto.createHash("sha1").update(bytes).digest("hex");
const good = Buffer.from("a good jar with class files in it ".repeat(40));
const ZEROS40 = "0".repeat(40);
const KEY = "cf-key-test-123";
const provider = () => getProvider("curseforge");

const leftovers = () => fs.readdirSync(tmp).filter((n) => n.startsWith("gp-modsrc-") || n.startsWith("gp-mod-"));
const listing = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);
// The error a call throws, so its code and message can be checked. Fails the test if the call succeeds.
async function failure(promise) {
	try {
		await promise;
	} catch (err) {
		return err;
	}
	assert.fail("expected the call to fail");
}

let folders = 0;
/** A fresh Minecraft server, so each install starts with an empty mods folder. */
function freshServer() {
	folders += 1;
	const folder = path.join(root, "data", "servers", `cf-${folders}`);
	fs.mkdirSync(folder, { recursive: true });
	return { server: { name: `Cf ${folders}`, type: "minecraft", installDir: folder, workingDir: folder }, mods: path.join(folder, "mods") };
}

const withKey = (extra = {}) => ({ secrets: { curseForgeApiKey: KEY }, ...extra });

describe("curseforge provider", () => {
	let stand;
	let base;
	let requests;
	let projects;
	let filesBy;

	before(async () => {
		await initConfig();
		await secrets.initSecrets();
		requests = [];
		stand = http.createServer((req, res) => {
			const url = new URL(req.url, "http://stand-in");
			requests.push({ path: url.pathname, query: url.searchParams, headers: req.headers });
			const send = (status, body, headers = {}) => {
				res.statusCode = status;
				for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
				res.end(body);
			};
			const json = (status, body) => send(status, JSON.stringify(body), { "Content-Type": "application/json" });

			if (url.pathname.startsWith("/files/")) {
				if (url.pathname === "/files/redirect.jar") return send(302, "", { Location: "https://elsewhere.example.test/x.jar" });
				return send(200, good);
			}
			if (req.headers["x-api-key"] === "bad-key") return json(401, { error: "Forbidden" });
			if (url.pathname === "/v1/mods/search") {
				const slug = url.searchParams.get("slug");
				return json(200, { data: [...projects.values()].filter((m) => m.slug === slug) });
			}
			const match = /^\/v1\/mods\/(\d+)(\/files)?$/.exec(url.pathname);
			if (match) {
				const id = Number(match[1]);
				if (id === 302) return send(302, "", { Location: `${base}/v1/mods/100` });
				if (id === 777) return send(500, JSON.stringify({ echoed: req.headers["x-api-key"] }));
				if (match[2]) {
					const files = filesBy.get(id);
					return files ? json(200, { data: files, pagination: {} }) : json(404, {});
				}
				const project = projects.get(id);
				return project ? json(200, { data: project }) : json(404, {});
			}
			return json(404, {});
		});
		await new Promise((r) => stand.listen(0, "127.0.0.1", r));
		base = `http://127.0.0.1:${stand.address().port}`;
		process.env.GHP_CURSEFORGE_API = `${base}/v1`;

		// A file: a jar, with its checksum and the listing's flags. Every field can be overridden by a test.
		const file = (id, fileName, extra = {}) => ({
			id,
			fileName,
			displayName: fileName.replace(/\.jar$/, ""),
			releaseType: 1,
			fileDate: "2026-01-01T00:00:00Z",
			fileLength: good.length,
			downloadUrl: `${base}/files/${fileName}`,
			gameVersions: ["Fabric", "1.21.1"],
			hashes: [{ value: sha1(good), algo: 1 }],
			dependencies: [],
			isAvailable: true,
			...extra,
		});
		const project = (id, slug, name) => ({ id, slug, name, links: { websiteUrl: `https://www.curseforge.com/minecraft/mc-mods/${slug}` } });

		projects = new Map([
			[100, project(100, "jei", "JEI")],
			[200, project(200, "blocked", "Blocked Mod")],
			[300, project(300, "holder", "Holder")],
			[310, project(310, "bad-sum", "Bad Sum")],
			[320, project(320, "redirect-mod", "Redirect Mod")],
			[330, project(330, "no-sum", "No Sum")],
			[500, project(500, "dep-lib", "Dep Lib")],
			[600, project(600, "client-only", "Client Only")],
			[700, project(700, "empty", "Empty")],
		]);
		filesBy = new Map([
			[
				100,
				[
					file(1001, "jei-old.jar", { displayName: "JEI 1.0", fileDate: "2025-01-01T00:00:00Z" }),
					file(1002, "jei-beta.jar", { displayName: "JEI 1.5 beta", releaseType: 2, fileDate: "2026-06-01T00:00:00Z" }),
					file(1003, "jei-new.jar", { displayName: "JEI 2.0", fileDate: "2026-02-01T00:00:00Z" }),
					file(1004, "jei-gone.jar", { displayName: "JEI gone", fileDate: "2026-09-01T00:00:00Z", isAvailable: false }),
					file(1005, "jei-junk.jar", { displayName: "JEI junk", fileDate: "not a date" }),
					// No file name: skipped even though it is the newest.
					{ id: 1006, displayName: "Nameless", releaseType: 1, fileDate: "2027-01-01T00:00:00Z", downloadUrl: `${base}/files/x.jar`, hashes: [] },
				],
			],
			[200, [file(2001, "blocked-new.jar", { downloadUrl: null, displayName: "Blocked 2", fileDate: "2026-05-01T00:00:00Z" }), file(2002, "blocked-old.jar", { fileDate: "2025-05-01T00:00:00Z" })]],
			[
				300,
				[
					file(3001, "holder.jar", {
						displayName: "Holder 1",
						dependencies: [
							{ modId: 500, relationType: 3 },
							{ modId: 501, relationType: 2 },
						],
					}),
				],
			],
			[310, [file(3101, "bad-sum.jar", { hashes: [{ value: ZEROS40, algo: 1 }] })]],
			[320, [file(3201, "redirect-mod.jar", { downloadUrl: `${base}/files/redirect.jar` })]],
			[330, [file(3301, "no-sum.jar", { hashes: [] })]],
			[500, [file(5001, "dep-lib.jar", { displayName: "Dep Lib 1" })]],
			[600, [file(6001, "client-only.jar", { gameVersions: ["Client", "1.21.1"] })]],
			[700, []],
		]);
	});

	after(async () => {
		if (savedLoopback === undefined) delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
		else process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = savedLoopback;
		if (savedCurseForge === undefined) delete process.env.GHP_CURSEFORGE_API;
		else process.env.GHP_CURSEFORGE_API = savedCurseForge;
		await new Promise((r) => stand.close(r));
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("is registered with the hosts it downloads from", () => {
		assert.equal(provider().id, "curseforge");
		assert.equal(provider().label, "CurseForge");
		assert.deepEqual(provider().hosts, ["curseforge.com", "www.curseforge.com", "api.curseforge.com", "edge.forgecdn.net", "mediafilez.forgecdn.net"]);
	});

	it("says it needs an API key until one is set, and not once one is", async () => {
		assert.equal(provider().needs, "apiKey");
		await secrets.patchSecrets({ curseForgeApiKey: "set-for-this-check" });
		try {
			assert.equal(provider().needs, undefined);
		} finally {
			await secrets.patchSecrets({ curseForgeApiKey: "" });
		}
	});

	it("refuses to start without a key, and makes no request", async () => {
		requests.length = 0;
		const err = await failure(provider().resolve("jei", { secrets: { curseForgeApiKey: "" } }));
		assert.equal(err.code, "needs_api_key");
		assert.equal(err.status, 400);
		assert.equal(requests.length, 0);
	});

	it("picks the newest release for the loader and game version, and asks CurseForge for those", async () => {
		requests.length = 0;
		const mod = await provider().resolve("jei", withKey({ loader: "fabric", gameVersion: "1.21.1" }));
		assert.deepEqual(mod, {
			source: "curseforge",
			ref: "jei",
			name: "JEI",
			version: "JEI 2.0",
			side: "both",
			files: [{ url: `${base}/files/jei-new.jar`, name: "jei-new.jar", size: good.length, sha1: sha1(good) }],
			dependencies: [],
		});
		const files = requests.find((r) => r.path === "/v1/mods/100/files").query;
		assert.equal(files.get("gameVersion"), "1.21.1");
		assert.equal(files.get("modLoaderType"), "4", "fabric is 4");
		assert.equal(files.get("pageSize"), "50");
		const search = requests.find((r) => r.path === "/v1/mods/search").query;
		assert.equal(search.get("gameId"), "432");
		assert.equal(search.get("slug"), "jei");
	});

	it("sends the key and a user agent on every request, and no loader it doesn't map", async () => {
		requests.length = 0;
		await provider().resolve("100", withKey({ loader: "bukkit" }));
		assert.ok(requests.length > 0);
		assert.ok(requests.every((r) => r.headers["x-api-key"] === KEY && r.headers["user-agent"] === "GodlyPanel"));
		assert.equal(requests.find((r) => r.path === "/v1/mods/100/files").query.has("modLoaderType"), false);
	});

	it("installs the file a pin names, even an older one", async () => {
		const mod = await provider().resolve("jei@1002", withKey());
		assert.equal(mod.ref, "jei@1002");
		assert.equal(mod.version, "JEI 1.5 beta");
		assert.deepEqual(mod.files.map((f) => f.name), ["jei-beta.jar"]);
	});

	it("refuses a pinned file that doesn't exist or is unavailable, rather than the latest", async () => {
		for (const ref of ["jei@9999", "jei@1004"]) {
			const err = await failure(provider().resolve(ref, withKey()));
			assert.equal(err.code, "not_found", ref);
		}
	});

	it("refuses a bad ref before any request is made", async () => {
		requests.length = 0;
		for (const ref of ["../x", "a/b", "12@x", "Jei", "-x", "a".repeat(65), "", "jei@", "jei@1@2", "jei@1234567890123", "jei@-1", 42]) {
			const err = await failure(provider().resolve(ref, withKey()));
			assert.equal(err.code, "bad_ref", String(ref));
		}
		assert.equal(requests.length, 0);
	});

	it("says so when the project doesn't exist", async () => {
		const err = await failure(provider().resolve("nope", withKey()));
		assert.equal(err.code, "not_found");
	});

	it("says no file fits when the project has none", async () => {
		const err = await failure(provider().resolve("700", withKey()));
		assert.equal(err.code, "no_matching_version");
	});

	it("refuses a file the author doesn't let anyone download, and never takes an older file in its place", async () => {
		const err = await failure(provider().resolve("200", withKey()));
		assert.equal(err.code, "third_party_blocked");
		assert.equal(err.status, 409);
		assert.ok(err.message.includes("https://www.curseforge.com/projects/200"), err.message);
	});

	it("says the key was refused when CurseForge answers 401, without the key in the message", async () => {
		const err = await failure(provider().resolve("jei", { secrets: { curseForgeApiKey: "bad-key" } }));
		assert.equal(err.code, "needs_api_key");
		assert.equal(err.status, 400);
		assert.equal(err.message.includes("bad-key"), false);
	});

	it("never puts the key in an error message, even when CurseForge's answer echoes it", async () => {
		const secret = "k-secret-500";
		const err = await failure(provider().resolve("777", { secrets: { curseForgeApiKey: secret } }));
		assert.equal(err.code, "curseforge_failed");
		assert.equal(err.status, 502);
		assert.equal(err.message.includes(secret), false);
		assert.ok(err instanceof ModError);
	});

	it("doesn't follow a redirect from CurseForge's API, and says so", async () => {
		requests.length = 0;
		const err = await failure(provider().resolve("302", withKey()));
		assert.equal(err.code, "curseforge_failed");
		assert.equal(requests.some((r) => r.path === "/v1/mods/100"), false, "the redirect target was never asked for");
	});

	it("reports a client-only file as side client", async () => {
		assert.equal((await provider().resolve("600", withKey())).side, "client");
	});

	it("installs the newest file, checked against its sha1", async () => {
		const { server, mods } = freshServer();
		const result = await installFromSource(server, "curseforge", "jei", withKey({ loader: "fabric", gameVersion: "1.21.1" }));
		assert.deepEqual(result, { installed: ["jei-new.jar"], unverified: [] });
		assert.deepEqual(fs.readFileSync(path.join(mods, "jei-new.jar")), good);
		assert.deepEqual(leftovers(), []);
	});

	it("installs a required dependency first and never asks for an optional one", async () => {
		const { server, mods } = freshServer();
		requests.length = 0;
		const result = await installFromSource(server, "curseforge", "300", withKey());
		assert.deepEqual(result.installed, ["dep-lib.jar", "holder.jar"]);
		assert.deepEqual(listing(mods).sort(), ["dep-lib.jar", "holder.jar"]);
		assert.equal(requests.some((r) => r.path === "/v1/mods/501"), false);
	});

	it("deletes a download whose sha1 is wrong, and leaves nothing behind", async () => {
		const { server, mods } = freshServer();
		await assert.rejects(() => installFromSource(server, "curseforge", "310", withKey()), /doesn't match the checksum in the CurseForge listing/);
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});

	it("reports a file with no checksum as unverified, by name", async () => {
		const { server } = freshServer();
		const result = await installFromSource(server, "curseforge", "330", withKey());
		assert.deepEqual(result, { installed: ["no-sum.jar"], unverified: ["no-sum.jar"] });
	});

	it("refuses a download that redirects to another host, and installs nothing", async () => {
		const { server, mods } = freshServer();
		await assert.rejects(() => installFromSource(server, "curseforge", "320", withKey()), REFUSAL);
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { detectSource, getProvider, listProviders, registerProvider, KNOWN_SOURCES } from "../../src/server/services/modSources/index.js";

// Mod sources: which provider a pasted mod address belongs to, and the two providers
// that exist so far. The input is typed by a user, so detectSource has to refuse
// anything it can't place rather than guess.

describe("detectSource", () => {
	const yes = [
		["1234567890", { source: "workshop", ref: "1234567890" }],
		["123", { source: "workshop", ref: "123" }],
		["https://steamcommunity.com/sharedfiles/filedetails/?id=1234567890", { source: "workshop", ref: "1234567890" }],
		["https://www.steamcommunity.com/workshop/filedetails/?id=987654&searchtext=x", { source: "workshop", ref: "987654" }],
		["https://thunderstore.io/c/valheim/p/RandyKnapp/EpicLoot/", { source: "thunderstore", ref: "RandyKnapp-EpicLoot" }],
		["https://thunderstore.io/c/valheim/p/RandyKnapp/EpicLoot/versions/1.2.3/", { source: "thunderstore", ref: "RandyKnapp-EpicLoot" }],
		["Someone-Mod", { source: "thunderstore", ref: "Someone-Mod" }],
		["Someone-Mod-1.2.3", { source: "thunderstore", ref: "Someone-Mod-1.2.3" }],
		["  Someone-Mod  ", { source: "thunderstore", ref: "Someone-Mod" }],
		["https://modrinth.com/mod/sodium", { source: "modrinth", ref: "sodium" }],
		["https://modrinth.com/modpack/fabulously-optimized/", { source: "modrinth", ref: "fabulously-optimized" }],
		["https://www.curseforge.com/minecraft/mc-mods/jei", { source: "curseforge", ref: "jei" }],
		["https://github.com/owner/repo", { source: "github", ref: "owner/repo" }],
		["https://github.com/owner/repo/releases", { source: "github", ref: "owner/repo" }],
		["https://github.com/owner/repo/releases/latest", { source: "github", ref: "owner/repo" }],
		["https://github.com/owner/repo/releases/tag/v1.2.3", { source: "github", ref: "owner/repo@v1.2.3" }],
		["https://github.com/owner/repo/releases/download/v1/mod.jar", { source: "url", ref: "https://github.com/owner/repo/releases/download/v1/mod.jar" }],
		["https://example.com/files/Mod.zip", { source: "url", ref: "https://example.com/files/Mod.zip" }],
		["https://example.com/files/Mod.JAR?token=abc#x", { source: "url", ref: "https://example.com/files/Mod.JAR?token=abc#x" }],
		["https://example.com/a.dll", { source: "url", ref: "https://example.com/a.dll" }],
		["https://example.com/a.pak", { source: "url", ref: "https://example.com/a.pak" }],
		["https://example.com/a.VPK", { source: "url", ref: "https://example.com/a.VPK" }],
	];

	const no = [
		"",
		"   ",
		null,
		42,
		"javascript:alert(1)",
		"data:text/html,x",
		"http://example.com/a.zip",
		"https://127.0.0.1/a.zip",
		"https://[::1]/a.zip",
		"https://localhost/a.zip",
		"https://user:pw@example.com/a.zip",
		"https://example.com:8443/a.zip",
		"https://example.com/page.html",
		"https://evil.com/?x=thunderstore.io/c/a/p/B/C/",
		"https://thunderstore.io.evil.com/c/a/p/B/C/",
		"https://evilthunderstore.io/c/a/p/B/C/",
		"https://x.thunderstore.io/c/a/p/B/C/",
		"https://modrinth.com.evil.com/mod/sodium",
		"https://github.com.evil.com/owner/repo",
		"x".repeat(3000),
		"12",
		"Owner Name",
		"https://steamcommunity.com/sharedfiles/filedetails/?id=12",
		"https://steamcommunity.com/sharedfiles/filedetails/?id=abc",
		"https://steamcommunity.com.evil.com/sharedfiles/filedetails/?id=1234567890",
		"https://service.internal/a.zip",
		"https://printer.local/a.zip",
		"https://[fe80::1]/a.zip",
		"https://example.com/a\n.zip",
		"https://example.com/a.zip.html",
	];

	for (const [input, expected] of yes) {
		it(`places ${JSON.stringify(input)} as ${expected.source}`, () => {
			assert.deepEqual(detectSource(input), expected);
		});
	}

	for (const input of no) {
		it(`refuses ${JSON.stringify(typeof input === "string" && input.length > 60 ? `${input.slice(0, 20)}...` : input)}`, () => {
			assert.equal(detectSource(input), null);
		});
	}

	it("never throws on odd input", () => {
		for (const input of [undefined, {}, [], Symbol("x"), "https://", "https://[", "http://[::1"]) {
			assert.equal(detectSource(input), null);
		}
	});
});

describe("provider registry", () => {
	it("has workshop and thunderstore registered", () => {
		assert.equal(getProvider("workshop").id, "workshop");
		assert.equal(getProvider("thunderstore").id, "thunderstore");
	});

	it("returns null for names that are not registered, including Object prototype names", () => {
		for (const id of ["constructor", "__proto__", "toString", "curseforge", "", null, 5, undefined]) {
			assert.equal(getProvider(id), null, `getProvider(${String(id)})`);
		}
	});

	it("lists providers as a copy", () => {
		const list = listProviders();
		assert.deepEqual(list.map((p) => p.id), ["workshop", "thunderstore", "modrinth", "url"]);
		list.length = 0;
		assert.equal(listProviders().length, 4);
	});

	it("names every source detectSource may return", () => {
		assert.deepEqual(KNOWN_SOURCES, ["workshop", "thunderstore", "modrinth", "curseforge", "github", "url"]);
	});

	it("refuses to register a second provider under the same id", () => {
		assert.throws(() => registerProvider({ id: "workshop", resolve() {} }), /already registered/);
	});

	it("refuses a provider without an id or resolve", () => {
		assert.throws(() => registerProvider({ resolve() {} }));
		assert.throws(() => registerProvider({ id: "nope" }));
	});

	it("both providers have install as a function", () => {
		assert.equal(typeof getProvider("workshop").install, "function");
		assert.equal(typeof getProvider("thunderstore").install, "function");
	});
});

describe("workshop provider resolve", () => {
	it("returns the item with no files and no version", async () => {
		const mod = await getProvider("workshop").resolve("1234567890");
		assert.deepEqual(mod, { source: "workshop", ref: "1234567890", name: "Workshop item 1234567890", version: "", side: "both", files: [], dependencies: [] });
	});

	it("rejects anything that isn't 3 to 12 digits", async () => {
		const provider = getProvider("workshop");
		for (const ref of ["12", "1234567890123", "12a4", "../1234", "", 1234567890]) {
			await assert.rejects(() => provider.resolve(ref), { code: "bad_id" }, `ref ${String(ref)}`);
		}
	});
});

describe("thunderstore provider resolve", () => {
	const base = (port) => `http://127.0.0.1:${port}`;
	const pkg = {
		namespace: "Someone",
		name: "Mod",
		full_name: "Someone-Mod",
		latest: {
			version_number: "1.2.0",
			download_url: "https://thunderstore.io/download/Someone/Mod/1.2.0/",
			dependencies: ["BepInEx-BepInExPack-5.4.2100"],
		},
		versions: [
			{ version_number: "1.2.0", download_url: "https://thunderstore.io/download/Someone/Mod/1.2.0/", dependencies: ["BepInEx-BepInExPack-5.4.2100"] },
			{ version_number: "1.1.0", download_url: "https://thunderstore.io/download/Someone/Mod/1.1.0/", dependencies: [] },
		],
	};
	const routes = new Map([["/api/experimental/package/Someone/Mod/", pkg]]);

	let server;
	let savedEnv;

	before(async () => {
		server = http.createServer((req, res) => {
			if (!routes.has(req.url)) {
				res.statusCode = 404;
				return res.end("{}");
			}
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify(routes.get(req.url)));
		});
		await new Promise((r) => server.listen(0, "127.0.0.1", r));
		savedEnv = process.env.GHP_THUNDERSTORE_API;
		process.env.GHP_THUNDERSTORE_API = base(server.address().port);
	});

	after(async () => {
		if (savedEnv === undefined) delete process.env.GHP_THUNDERSTORE_API;
		else process.env.GHP_THUNDERSTORE_API = savedEnv;
		await new Promise((r) => server.close(r));
	});

	const provider = () => getProvider("thunderstore");

	it("resolves the latest version when no version is given", async () => {
		const mod = await provider().resolve("Someone-Mod");
		assert.deepEqual(mod, {
			source: "thunderstore",
			ref: "Someone-Mod",
			name: "Someone-Mod",
			version: "1.2.0",
			side: "both",
			files: [{ url: "https://thunderstore.io/download/Someone/Mod/1.2.0/", name: "Someone-Mod.zip" }],
			dependencies: [{ source: "thunderstore", ref: "BepInEx-BepInExPack-5.4.2100" }],
		});
	});

	it("resolves the version the ref names", async () => {
		const mod = await provider().resolve("Someone-Mod-1.1.0");
		assert.equal(mod.ref, "Someone-Mod-1.1.0");
		assert.equal(mod.version, "1.1.0");
		assert.deepEqual(mod.files, [{ url: "https://thunderstore.io/download/Someone/Mod/1.1.0/", name: "Someone-Mod.zip" }]);
		assert.deepEqual(mod.dependencies, []);
	});

	it("refuses a version the package doesn't have rather than installing the latest", async () => {
		await assert.rejects(() => provider().resolve("Someone-Mod-9.9.9"), { code: "not_found" });
	});

	it("says so when the package is missing", async () => {
		await assert.rejects(() => provider().resolve("Nobody-Nothing"), { message: "Thunderstore has no package Nobody-Nothing." });
	});

	it("rejects a ref that is not a package name", async () => {
		await assert.rejects(() => provider().resolve("nope"), { code: "bad_package" });
		await assert.rejects(() => provider().resolve("https://thunderstore.io/c/valheim/p/Someone/Mod/"), { code: "bad_package" });
	});
});

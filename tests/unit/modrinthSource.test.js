import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { getProvider, detectSource } from "../../src/server/services/modSources/index.js";

// Modrinth's answers are read by the panel and turned into a plan to download. The stand-in below answers like Modrinth's v2
// API. It doesn't filter, so the choice of version is the provider's own, and every request it gets is recorded.

const SHA512 = "a".repeat(128);
const provider = () => getProvider("modrinth");

describe("modrinth provider", () => {
	let server;
	let base;
	let savedApi;
	let requests;
	let answers;

	const file = (name, extra = {}) => ({ url: `${base}/cdn/${name}`, filename: name, size: 10, primary: false, hashes: { sha512: SHA512 }, ...extra });
	const version = (number, extra = {}) => ({
		version_number: number,
		version_type: "release",
		date_published: "2026-01-01T00:00:00Z",
		loaders: ["fabric"],
		game_versions: ["1.21.1"],
		files: [file(`mod-${number}.jar`, { primary: true })],
		dependencies: [],
		...extra,
	});

	before(async () => {
		answers = new Map();
		requests = [];
		server = http.createServer((req, res) => {
			const url = new URL(req.url, "http://stand-in");
			requests.push(url);
			if (url.pathname === "/v2/project/huge") {
				res.setHeader("Content-Type", "application/json");
				return res.end(`{"title":"${"x".repeat(6 * 1024 * 1024)}"}`);
			}
			const match = /^\/v2\/project\/([^/]+)(\/version)?$/.exec(url.pathname);
			if (match) {
				const [, slug, isVersions] = match;
				const found = answers.get(slug);
				if (!found) {
					res.statusCode = 404;
					return res.end("{}");
				}
				res.setHeader("Content-Type", "application/json");
				return res.end(JSON.stringify(isVersions ? found.versions : found.project));
			}
			if (url.pathname === "/v2/search") {
				res.setHeader("Content-Type", "application/json");
				return res.end(JSON.stringify(answers.get("__search__")));
			}
			res.statusCode = 404;
			res.end("{}");
		});
		await new Promise((r) => server.listen(0, "127.0.0.1", r));
		base = `http://127.0.0.1:${server.address().port}`;
		savedApi = process.env.GHP_MODRINTH_API;
		process.env.GHP_MODRINTH_API = `${base}/v2`;

		answers.set("fine-mod", {
			project: { title: "Fine Mod", client_side: "required", server_side: "required" },
			versions: [
				version("1.8.0", { date_published: "2025-06-01T00:00:00Z" }),
				version("1.9.0", { date_published: "2026-01-10T00:00:00Z" }),
				version("2.0.0-beta", { version_type: "beta", date_published: "2026-03-01T00:00:00Z" }),
				version("2.1.0", { loaders: ["forge"], date_published: "2026-04-01T00:00:00Z" }),
			],
		});
		answers.set("client-mod", {
			project: { title: "Client Mod", client_side: "required", server_side: "unsupported" },
			versions: [version("1.0.0")],
		});
		answers.set("server-mod", {
			project: { title: "Server Mod", client_side: "unsupported", server_side: "required" },
			versions: [version("1.0.0")],
		});
		answers.set("with-dep", {
			project: { title: "With Dep", client_side: "required", server_side: "required" },
			versions: [
				version("1.0.0", {
					dependencies: [
						{ dependency_type: "required", project_id: "dep-one" },
						{ dependency_type: "optional", project_id: "opt-one" },
						{ dependency_type: "required", project_id: "../evil" },
						{ dependency_type: "incompatible", project_id: "bad-one" },
					],
				}),
			],
		});
		answers.set("two-files", {
			project: { title: "Two Files", client_side: "required", server_side: "required" },
			versions: [
				version("1.0.0", {
					files: [file("extra.jar"), file("main.jar", { primary: true })],
				}),
			],
		});
		answers.set("incomplete", {
			project: { title: "Incomplete", client_side: "required", server_side: "required" },
			versions: [version("1.0.0", { files: [{ url: `${base}/cdn/x.jar`, filename: "x.jar", size: 10, primary: true, hashes: {} }] })],
		});
		answers.set("empty", {
			project: { title: "Empty", client_side: "required", server_side: "required" },
			versions: [],
		});
		answers.set("__search__", {
			hits: [
				{ slug: "fine-mod", title: "Fine Mod", description: "d".repeat(300) },
				{ slug: "../evil", title: "Evil", description: "x" },
				{ slug: "sodium", title: 42, description: "fast" },
			],
		});
	});

	after(async () => {
		if (savedApi === undefined) delete process.env.GHP_MODRINTH_API;
		else process.env.GHP_MODRINTH_API = savedApi;
		await new Promise((r) => server.close(r));
	});

	it("is registered with the hosts it downloads from", () => {
		assert.equal(provider().id, "modrinth");
		assert.deepEqual(provider().hosts, ["modrinth.com", "api.modrinth.com", "cdn.modrinth.com"]);
	});

	it("picks the newest release for the loader and version, skipping a newer beta and another loader", async () => {
		const mod = await provider().resolve("fine-mod", { loader: "fabric", gameVersion: "1.21.1" });
		assert.deepEqual(mod, {
			source: "modrinth",
			ref: "fine-mod",
			name: "Fine Mod",
			version: "1.9.0",
			side: "both",
			files: [{ url: `${base}/cdn/mod-1.9.0.jar`, name: "mod-1.9.0.jar", size: 10, sha512: SHA512 }],
			dependencies: [],
		});
	});

	it("sends the loader and game version as JSON in the query", async () => {
		requests.length = 0;
		await provider().resolve("fine-mod", { loader: "fabric", gameVersion: "1.21.1" });
		const q = requests.find((u) => u.pathname === "/v2/project/fine-mod/version").searchParams;
		assert.equal(q.get("loaders"), '["fabric"]');
		assert.equal(q.get("game_versions"), '["1.21.1"]');
	});

	it("doesn't filter when no loader or version is given", async () => {
		requests.length = 0;
		const mod = await provider().resolve("fine-mod", {});
		const q = requests.find((u) => u.pathname === "/v2/project/fine-mod/version").searchParams;
		assert.equal(q.has("loaders"), false);
		assert.equal(q.has("game_versions"), false);
		assert.equal(mod.version, "2.1.0", "the newest release of any loader");
	});

	it("installs the version the ref pins, even an older one", async () => {
		const mod = await provider().resolve("fine-mod@1.8.0", { loader: "fabric", gameVersion: "1.21.1" });
		assert.equal(mod.ref, "fine-mod@1.8.0");
		assert.equal(mod.version, "1.8.0");
	});

	it("refuses a pinned version that doesn't exist, rather than falling back to the latest", async () => {
		await assert.rejects(() => provider().resolve("fine-mod@9.9.9", {}), { code: "not_found", status: 404 });
	});

	it("refuses a pinned version that doesn't fit this server", async () => {
		await assert.rejects(() => provider().resolve("fine-mod@2.1.0", { loader: "fabric" }), { code: "not_found" });
	});

	it("says no version fits when none does", async () => {
		await assert.rejects(() => provider().resolve("fine-mod", { loader: "neoforge", gameVersion: "1.21.1" }), {
			code: "no_matching_version",
			status: 404,
			message: "No version of fine-mod fits this server.",
		});
	});

	it("says no version fits when the project has no versions at all", async () => {
		await assert.rejects(() => provider().resolve("empty", {}), { code: "no_matching_version" });
	});

	it("says so when the project doesn't exist", async () => {
		await assert.rejects(() => provider().resolve("missing", {}), { code: "not_found", message: "Modrinth has no project missing." });
	});

	it("maps a client-only mod to side client", async () => {
		assert.equal((await provider().resolve("client-mod", {})).side, "client");
	});

	it("maps a server-only mod to side server", async () => {
		assert.equal((await provider().resolve("server-mod", {})).side, "server");
	});

	it("takes the primary file, not the first one", async () => {
		const mod = await provider().resolve("two-files", {});
		assert.deepEqual(mod.files.map((f) => f.name), ["main.jar"]);
	});

	it("keeps only required dependencies, and only ones with a valid slug", async () => {
		const mod = await provider().resolve("with-dep", {});
		assert.deepEqual(mod.dependencies, [{ source: "modrinth", ref: "dep-one" }]);
	});

	it("refuses an answer whose file has no sha512", async () => {
		await assert.rejects(() => provider().resolve("incomplete", {}), { code: "bad_answer", message: "Modrinth's answer for incomplete is incomplete." });
	});

	it("refuses an answer over 5 MiB", async () => {
		await assert.rejects(() => provider().resolve("huge", {}), { code: "modrinth_failed" });
	});

	it("refuses a bad slug or version before any request is made", async () => {
		requests.length = 0;
		for (const ref of ["../x", "a/b", "a".repeat(65), "", "fine-mod@", 42]) {
			await assert.rejects(() => provider().resolve(ref, {}), { code: "bad_ref" }, String(ref));
		}
		assert.equal(requests.length, 0);
	});

	it("maps a search to mods only, with the loader and game version as facets", async () => {
		requests.length = 0;
		const hits = await provider().search("  fine  ", { loader: "fabric", gameVersion: "1.21.1" });
		const q = requests.find((u) => u.pathname === "/v2/search").searchParams;
		assert.equal(q.get("query"), "fine");
		assert.equal(q.get("limit"), "10");
		assert.deepEqual(JSON.parse(q.get("facets")), [["project_type:mod"], ["categories:fabric"], ["versions:1.21.1"]]);
		assert.equal(hits.length, 2, "a hit with a bad slug is dropped");
		assert.equal(hits[0].ref, "fine-mod");
		assert.equal(hits[0].description.length, 200);
		assert.equal(hits[1].name, "sodium", "a non-string name falls back to the slug");
		assert.ok(hits.every((h) => Object.keys(h).sort().join() === "description,name,ref,source"));
	});

	it("refuses a search that is empty or too long", async () => {
		await assert.rejects(() => provider().search("   ", {}), { code: "bad_query" });
		await assert.rejects(() => provider().search("q".repeat(101), {}), { code: "bad_query" });
	});

	it("is found from a modrinth.com address", () => {
		assert.deepEqual(detectSource("https://modrinth.com/mod/fine-mod"), { source: "modrinth", ref: "fine-mod" });
	});
});

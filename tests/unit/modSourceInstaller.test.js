import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

// Installing a mod from a source: its dependencies first, each file downloaded through the guard and checked against its
// checksum, then handed to installUpload. Every failure leaves nothing behind in the mods folder or the temp folder. The
// stand-in server runs on 127.0.0.1, so the loopback test hook is on for this file.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-src-"));
const tmp = path.join(root, "tmp");
fs.mkdirSync(tmp, { recursive: true });
// The installer's scratch folders come from the temp folder: keep this file's own, so it can check nothing is left behind.
process.env.TMPDIR = tmp;
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.GHP_DATA_DIR = path.join(root, "data");
const savedLoopback = process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = "1";

const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const { initSecrets } = await import("../../src/server/config/secretsStore.js");
const { ModError } = await import("../../src/server/services/modService.js");
const { registerProvider, getProvider } = await import("../../src/server/services/modSources/index.js");
const { installFromSource } = await import("../../src/server/services/modSources/installer.js");
const { createZip } = await import("../../src/server/util/tarZip.js");

const REFUSAL = { message: "That address isn't one the panel will download from." };
// The fields an install is judged by. The result also lists the mods and skipped files, which these checks don't look at.
const pick = ({ installed, unverified }) => ({ installed, unverified });
const sha512 = (bytes) => crypto.createHash("sha512").update(bytes).digest("hex");
const good = Buffer.from("a good jar with class files in it ".repeat(40));
const ZEROS = "0".repeat(128);

const leftovers = () => fs.readdirSync(tmp).filter((n) => n.startsWith("gp-modsrc-") || n.startsWith("gp-mod-"));
const listing = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

let folders = 0;
/** A fresh Minecraft server (its mods folder is the one installUpload writes to), so each test starts empty. */
function freshServer() {
	folders += 1;
	const folder = path.join(root, "data", "servers", `mc-${folders}`);
	fs.mkdirSync(folder, { recursive: true });
	return { server: { name: `Mc ${folders}`, type: "minecraft", installDir: folder, workingDir: folder }, mods: path.join(folder, "mods") };
}

/** A fetch that records every address it is asked for, and sends it to the stand-in (`map`) when one is needed. */
function recordingFetch(map = (u) => u) {
	const seen = [];
	const fetchImpl = (url, init) => {
		seen.push(url);
		return fetch(map(url), init);
	};
	return { seen, fetchImpl };
}

describe("installing from a source", () => {
	let server;
	let base;
	let requests;
	let savedModrinth;
	let fixtures;
	let serverListening;
	// A zip with one folder in it, the way a 7 Days to Die mod comes. Installing it twice is the case that is already_installed.
	let packZip;

	const modrinthProject = (slug, title, extra = {}) => ({ title, client_side: "required", server_side: "required", slug, ...extra });

	before(async () => {
		await initConfig();
		await initSecrets();
		requests = [];
		const packStage = path.join(root, "pack-stage");
		fs.mkdirSync(path.join(packStage, "SharedLib"), { recursive: true });
		fs.writeFileSync(path.join(packStage, "SharedLib", "lib.txt"), "a library two mods share");
		await createZip(path.join(root, "pack.zip"), [{ dir: packStage, name: "SharedLib" }]);
		packZip = fs.readFileSync(path.join(root, "pack.zip"));
		serverListening = http.createServer((req, res) => {
			requests.push(req.url);
			const send = (status, body, headers = {}) => {
				res.statusCode = status;
				for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
				res.end(body);
			};
			const modrinthVersion = (fileUrl, sum = sha512(good)) => [
				{ version_number: "1.0.0", version_type: "release", date_published: "2026-01-01T00:00:00Z", loaders: ["fabric"], game_versions: ["1.21.1"], dependencies: [], files: [{ url: fileUrl, filename: "Fine.jar", size: good.length, primary: true, hashes: { sha512: sum } }] },
			];
			// The query string is ignored for routing; the version routes are asked with one.
			switch (req.url.split("?")[0]) {
				case "/files/good.jar":
					return send(200, good);
				case "/files/big.jar":
					return send(200, Buffer.alloc(5000, 1));
				case "/files/redirect.jar":
					return send(302, "", { Location: "https://elsewhere.example.test/x.jar" });
				case "/files/relative.jar":
					return send(302, "", { Location: "/files/good.jar" });
				case "/files/pack.zip":
					return send(200, packZip);
				case "/v2/project/fine":
					return send(200, JSON.stringify(modrinthProject("fine", "Fine")), { "Content-Type": "application/json" });
				case "/v2/project/fine/version":
					return send(200, JSON.stringify(modrinthVersion(`${base}/files/good.jar`)), { "Content-Type": "application/json" });
				case "/v2/project/wrongsum":
					return send(200, JSON.stringify(modrinthProject("wrongsum", "Wrong Sum")), { "Content-Type": "application/json" });
				case "/v2/project/wrongsum/version":
					return send(200, JSON.stringify(modrinthVersion(`${base}/files/good.jar`, ZEROS)), { "Content-Type": "application/json" });
				case "/v2/project/with-dep":
					return send(200, JSON.stringify(modrinthProject("with-dep", "With Dep")), { "Content-Type": "application/json" });
				case "/v2/project/with-dep/version":
					return send(
						200,
						JSON.stringify([
							{
								version_number: "1.0.0",
								version_type: "release",
								date_published: "2026-01-01T00:00:00Z",
								loaders: ["fabric"],
								game_versions: ["1.21.1"],
								files: [{ url: `${base}/files/good.jar`, filename: "WithDep.jar", size: good.length, primary: true, hashes: { sha512: sha512(good) } }],
								dependencies: [
									{ dependency_type: "required", project_id: "fine" },
									{ dependency_type: "optional", project_id: "missing-opt" },
								],
							},
						]),
						{ "Content-Type": "application/json" },
					);
				default:
					return send(404, "{}");
			}
		});
		await new Promise((r) => serverListening.listen(0, "127.0.0.1", r));
		base = `http://127.0.0.1:${serverListening.address().port}`;
		savedModrinth = process.env.GHP_MODRINTH_API;
		process.env.GHP_MODRINTH_API = `${base}/v2`;

		// A test-only source, registered under an id no real source uses. Its answers are the fixtures below, and its
		// files are served by the stand-in.
		const file = (name, extra = {}) => ({ url: `${base}/files/good.jar`, name, sha512: sha512(good), ...extra });
		fixtures = new Map([
			["good", { files: [file("Good.jar")] }],
			["wrong", { files: [file("Wrong.jar", { sha512: ZEROS })] }],
			["nosum", { files: [{ url: `${base}/files/good.jar`, name: "NoSum.jar" }] }],
			["big", { files: [{ url: `${base}/files/big.jar`, name: "Big.jar" }] }],
			["redirect", { files: [{ url: `${base}/files/redirect.jar`, name: "Redirect.jar" }] }],
			["relative", { files: [{ url: `${base}/files/relative.jar`, name: "Relative.jar", sha512: sha512(good) }] }],
			["chain-dep", { files: [file("DepOne.jar")] }],
			["chain-a", { deps: [{ source: "fixture", ref: "chain-dep" }], files: [file("ChainA.jar")] }],
			["cycle-a", { deps: [{ source: "fixture", ref: "cycle-b" }], files: [file("CycleA.jar")] }],
			["cycle-b", { deps: [{ source: "fixture", ref: "cycle-a" }], files: [file("CycleB.jar")] }],
			["roll-ok", { files: [file("RollOk.jar")] }],
			["roll-bad", { files: [file("RollBad.jar", { sha512: ZEROS })] }],
			["roll-root", { deps: [{ source: "fixture", ref: "roll-ok" }, { source: "fixture", ref: "roll-bad" }], files: [file("RollRoot.jar")] }],
			// A mod for players only (a client mod), as a top-level mod and as a dependency.
			["client-top", { side: "client", files: [file("ClientTop.jar")] }],
			["client-dep", { side: "client", files: [file("ClientDep.jar")] }],
			["parent-client-dep", { deps: [{ source: "fixture", ref: "client-dep" }], files: [file("ParentOk.jar")] }],
			["shared-lib", { files: [{ url: `${base}/files/pack.zip`, name: "SharedLib.zip", sha512: sha512(packZip) }] }],
			["uses-lib", { deps: [{ source: "fixture", ref: "shared-lib" }], files: [] }],
			// The same, with a plain .jar for the library, which the folder adapter would overwrite rather than refuse.
			["jar-lib", { files: [file("SharedLib.jar")] }],
			["uses-jar-lib", { deps: [{ source: "fixture", ref: "jar-lib" }], files: [file("UsesJarLib.jar")] }],
			["uses-jar-lib-bad", { deps: [{ source: "fixture", ref: "jar-lib" }, { source: "fixture", ref: "roll-bad" }], files: [file("UsesJarLibBad.jar")] }],
		]);
		for (let i = 0; i < 26; i += 1) fixtures.set(`fan-dep-${i}`, { files: [file(`Fan${i}.jar`)] });
		fixtures.set("fan-24", { deps: Array.from({ length: 24 }, (_, i) => ({ source: "fixture", ref: `fan-dep-${i}` })), files: [file("FanRoot24.jar")] });
		fixtures.set("fan-26", { deps: Array.from({ length: 26 }, (_, i) => ({ source: "fixture", ref: `fan-dep-${i}` })), files: [file("FanRoot26.jar")] });
		for (let i = 0; i <= 8; i += 1) {
			const next = i < 8 ? [{ source: "fixture", ref: `deep-${i + 1}` }] : [];
			fixtures.set(`deep-${i}`, { deps: next, files: [file(`Deep${i}.jar`)] });
		}
		registerProvider({
			id: "fixture",
			label: "Fixture",
			hosts: ["127.0.0.1"],
			async resolve(ref) {
				const found = fixtures.get(ref);
				if (!found) throw new ModError("No such fixture.", "not_found", 404);
				return { source: "fixture", ref, name: ref, version: "1.0.0", side: found.side ?? "both", files: found.files, dependencies: found.deps ?? [] };
			},
		});
	});

	after(async () => {
		if (savedModrinth === undefined) delete process.env.GHP_MODRINTH_API;
		else process.env.GHP_MODRINTH_API = savedModrinth;
		if (savedLoopback === undefined) delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
		else process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = savedLoopback;
		await new Promise((r) => serverListening.close(r));
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("refuses a source nothing is registered under", async () => {
		const { server: s } = freshServer();
		await assert.rejects(() => installFromSource(s, "nope", "x", {}), { code: "bad_source" });
		await assert.rejects(() => installFromSource(s, "constructor", "x", {}), { code: "bad_source" });
	});

	it("installs a good file, and leaves nothing in the temp folder", async () => {
		const { server: s, mods } = freshServer();
		const result = await installFromSource(s, "fixture", "good", {});
		assert.deepEqual(pick(result), { installed: ["Good.jar"], unverified: [] });
		assert.deepEqual(fs.readFileSync(path.join(mods, "Good.jar")), good);
		assert.deepEqual(leftovers(), []);
	});

	it("deletes a download whose checksum is wrong, and leaves the mods folder and temp folder empty", async () => {
		const { server: s, mods } = freshServer();
		await assert.rejects(() => installFromSource(s, "fixture", "wrong", {}), /doesn't match the checksum in the Fixture listing/);
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});

	it("installs what a mod depends on first", async () => {
		const { server: s, mods } = freshServer();
		const result = await installFromSource(s, "fixture", "chain-a", {});
		assert.deepEqual(result.installed, ["DepOne.jar", "ChainA.jar"]);
		assert.deepEqual(listing(mods).sort(), ["ChainA.jar", "DepOne.jar"]);
	});

	it("reports each mod it installed, dependencies first, and nothing skipped", async () => {
		const { server: s } = freshServer();
		const result = await installFromSource(s, "fixture", "chain-a", {});
		assert.deepEqual(result.mods, [
			{ source: "fixture", ref: "chain-dep", name: "chain-dep", version: "1.0.0", side: "both", installed: ["DepOne.jar"], dependencyOf: "fixture:chain-a" },
			{ source: "fixture", ref: "chain-a", name: "chain-a", version: "1.0.0", side: "both", installed: ["ChainA.jar"], dependencyOf: null },
		]);
		assert.deepEqual(result.skipped, []);
	});

	it("refuses a mod for players only when it is the one asked for, and installs nothing", async () => {
		const { server: s, mods } = freshServer();
		const err = await installFromSource(s, "fixture", "client-top", {}).then(
			() => assert.fail("expected a refusal"),
			(e) => e,
		);
		assert.equal(err.code, "client_only");
		assert.equal(err.status, 409);
		assert.equal(err.message, "This mod is for players only, so it isn't installed on the server.");
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});

	it("skips a player-only dependency, says so, and installs the rest", async () => {
		const { server: s, mods } = freshServer();
		const result = await installFromSource(s, "fixture", "parent-client-dep", {});
		assert.deepEqual(result.installed, ["ParentOk.jar"]);
		assert.deepEqual(result.skipped, [{ source: "fixture", ref: "client-dep", reason: "client_only" }]);
		assert.deepEqual(listing(mods), ["ParentOk.jar"]);
	});

	it("ends a cycle, and installs each mod once", async () => {
		const { server: s, mods } = freshServer();
		const result = await installFromSource(s, "fixture", "cycle-a", {});
		assert.deepEqual(result.installed, ["CycleB.jar", "CycleA.jar"]);
		assert.deepEqual(listing(mods).sort(), ["CycleA.jar", "CycleB.jar"]);
	});

	it("installs a mod with 24 dependencies (25 mods in all)", async () => {
		const { server: s } = freshServer();
		const result = await installFromSource(s, "fixture", "fan-24", {});
		assert.equal(result.installed.length, 25);
	});

	it("refuses a mod that pulls in 26 others (27 in all), and installs none of them", async () => {
		const { server: s, mods } = freshServer();
		await assert.rejects(() => installFromSource(s, "fixture", "fan-26", {}), { code: "too_many_dependencies", message: "This mod pulls in too many other mods." });
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});

	it("refuses a chain of dependencies deeper than six", async () => {
		const { server: s, mods } = freshServer();
		await assert.rejects(() => installFromSource(s, "fixture", "deep-0", {}), { code: "too_many_dependencies" });
		assert.deepEqual(listing(mods), []);
	});

	it("takes back a dependency that installed before a later one failed", async () => {
		const { server: s, mods } = freshServer();
		await assert.rejects(() => installFromSource(s, "fixture", "roll-root", {}), /doesn't match the checksum/);
		assert.deepEqual(listing(mods), [], "RollOk.jar was installed first and must be gone again");
		assert.deepEqual(leftovers(), []);
	});

	it("reports a file with no checksum as unverified, by name", async () => {
		const { server: s } = freshServer();
		const result = await installFromSource(s, "fixture", "nosum", {});
		assert.deepEqual(pick(result), { installed: ["NoSum.jar"], unverified: ["NoSum.jar"] });
	});

	it("refuses a download that redirects to another host, and never asks that host for anything", async () => {
		const { server: s, mods } = freshServer();
		const fetchRec = recordingFetch();
		await assert.rejects(() => installFromSource(s, "fixture", "redirect", { fetchImpl: fetchRec.fetchImpl }), REFUSAL);
		assert.deepEqual(fetchRec.seen, [`${base}/files/redirect.jar`]);
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});

	it("follows a redirect to the same host", async () => {
		const { server: s } = freshServer();
		const result = await installFromSource(s, "fixture", "relative", {});
		assert.deepEqual(result.installed, ["Relative.jar"]);
	});

	it("stops a download that runs past the byte cap, and leaves nothing behind", async () => {
		const { server: s, mods } = freshServer();
		await assert.rejects(() => installFromSource(s, "fixture", "big", { maxBytes: 1000 }), {
			message: "The download is larger than it should be, so it was stopped.",
		});
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});

	describe("a direct link", () => {
		const trusted = { trusted: true };
		// The link names a host the stand-in can't be reached at, so the fetch maps that host to the stand-in. The guard still sees
		// the link's own host, which is what it checks.
		const mapTo = (u) => u.replace("https://files.example.test", base);

		it("refuses a link that the user hasn't confirmed", async () => {
			const { server: s } = freshServer();
			await assert.rejects(() => installFromSource(s, "url", "https://files.example.test/files/good.jar", {}), { code: "untrusted_address" });
		});

		it("refuses an address that isn't a direct download the panel will use", async () => {
			const { server: s, mods } = freshServer();
			for (const ref of [
				"http://files.example.test/files/good.jar",
				"https://127.0.0.1/a.zip",
				"https://user:pw@files.example.test/a.zip",
				"https://files.example.test:8443/a.zip",
				"https://localhost/a.jar",
			]) {
				await assert.rejects(() => installFromSource(s, "url", ref, trusted), { code: "bad_ref" }, ref);
			}
			assert.deepEqual(listing(mods), []);
		});

		it("installs a good .jar from a trusted link and lists it as unverified", async () => {
			const { server: s, mods } = freshServer();
			const fetchRec = recordingFetch(mapTo);
			const result = await installFromSource(s, "url", "https://files.example.test/files/good.jar", { ...trusted, fetchImpl: fetchRec.fetchImpl });
			assert.deepEqual(pick(result), { installed: ["good.jar"], unverified: ["good.jar"] });
			assert.deepEqual(fs.readFileSync(path.join(mods, "good.jar")), good);
			assert.deepEqual(fetchRec.seen, ["https://files.example.test/files/good.jar"]);
		});

		it("refuses a redirect to another host", async () => {
			const { server: s, mods } = freshServer();
			const fetchRec = recordingFetch(mapTo);
			await assert.rejects(() => installFromSource(s, "url", "https://files.example.test/files/redirect.jar", { ...trusted, fetchImpl: fetchRec.fetchImpl }), REFUSAL);
			assert.deepEqual(fetchRec.seen, ["https://files.example.test/files/redirect.jar"]);
			assert.deepEqual(listing(mods), []);
		});

		it("refuses a body over the byte cap, and leaves nothing behind", async () => {
			const { server: s, mods } = freshServer();
			await assert.rejects(() => installFromSource(s, "url", "https://files.example.test/files/big.jar", { ...trusted, fetchImpl: recordingFetch(mapTo).fetchImpl, maxBytes: 1000 }), {
				message: "The download is larger than it should be, so it was stopped.",
			});
			assert.deepEqual(listing(mods), []);
			assert.deepEqual(leftovers(), []);
		});
	});

	describe("a dependency already in the mods folder", () => {
		// A 7 Days to Die server takes .zip archives, so the shared library can be a folder that is already there.
		function archiveServer() {
			folders += 1;
			const folder = path.join(root, "data", "servers", `sd-${folders}`);
			fs.mkdirSync(folder, { recursive: true });
			return { server: { name: `Seven ${folders}`, type: "7days", installDir: folder, workingDir: folder }, mods: path.join(folder, "Mods") };
		}

		it("with skipInstalled, skips it, lists it with the mod that needed it, and installs the rest", async () => {
			const { server: s, mods } = archiveServer();
			await installFromSource(s, "fixture", "shared-lib", {});
			const result = await installFromSource(s, "fixture", "uses-lib", { skipInstalled: true });
			assert.deepEqual(result.skipped, [{ source: "fixture", ref: "shared-lib", reason: "already_installed", dependencyOf: "fixture:uses-lib" }]);
			assert.deepEqual(result.installed, []);
			assert.deepEqual(listing(mods), ["SharedLib"]);
		});

		it("without the flag, it still fails as before, and leaves what was there alone", async () => {
			const { server: s, mods } = archiveServer();
			await installFromSource(s, "fixture", "shared-lib", {});
			await assert.rejects(() => installFromSource(s, "fixture", "uses-lib", {}), { code: "already_installed" });
			assert.deepEqual(listing(mods), ["SharedLib"]);
			assert.deepEqual(leftovers(), []);
		});

		it("still refuses when it is the mod asked for, since only a dependency is skipped", async () => {
			const { server: s, mods } = archiveServer();
			await installFromSource(s, "fixture", "shared-lib", {});
			await assert.rejects(() => installFromSource(s, "fixture", "shared-lib", { skipInstalled: true }), { code: "already_installed" });
			assert.deepEqual(listing(mods), ["SharedLib"]);
		});

		describe("a plain file that is already there", () => {
			const mine = Buffer.from("the library as it already was");
			const withLibrary = () => {
				const made = freshServer();
				fs.mkdirSync(made.mods, { recursive: true });
				fs.writeFileSync(path.join(made.mods, "SharedLib.jar"), mine);
				return made;
			};

			it("with skipInstalled, is left as it was and listed as skipped", async () => {
				const { server: s, mods } = withLibrary();
				const result = await installFromSource(s, "fixture", "uses-jar-lib", { skipInstalled: true });
				assert.deepEqual(result.skipped, [{ source: "fixture", ref: "jar-lib", reason: "already_installed", dependencyOf: "fixture:uses-jar-lib" }]);
				assert.deepEqual(result.installed, ["UsesJarLib.jar"]);
				assert.deepEqual(fs.readFileSync(path.join(mods, "SharedLib.jar")), mine);
			});

			it("with skipInstalled, is still there after a later failure takes the install back", async () => {
				const { server: s, mods } = withLibrary();
				await assert.rejects(() => installFromSource(s, "fixture", "uses-jar-lib-bad", { skipInstalled: true }), /doesn't match the checksum/);
				assert.deepEqual(fs.readFileSync(path.join(mods, "SharedLib.jar")), mine);
				assert.deepEqual(listing(mods), ["SharedLib.jar"]);
			});

			it("without the flag, is replaced as before", async () => {
				const { server: s, mods } = withLibrary();
				await installFromSource(s, "fixture", "uses-jar-lib", {});
				assert.deepEqual(fs.readFileSync(path.join(mods, "SharedLib.jar")), good);
			});

			it("with skipInstalled, is still replaced when it is the mod asked for", async () => {
				const { server: s, mods } = withLibrary();
				await installFromSource(s, "fixture", "jar-lib", { skipInstalled: true });
				assert.deepEqual(fs.readFileSync(path.join(mods, "SharedLib.jar")), good);
			});
		});

		it("other errors still roll back when the flag is on", async () => {
			const { server: s, mods } = freshServer();
			await assert.rejects(() => installFromSource(s, "fixture", "roll-root", { skipInstalled: true }), /doesn't match the checksum/);
			assert.deepEqual(listing(mods), []);
			assert.deepEqual(leftovers(), []);
		});
	});

	describe("Modrinth, end to end", () => {
		const ctx = { loader: "fabric", gameVersion: "1.21.1" };

		it("installs the file Modrinth names, checked against its sha512", async () => {
			const { server: s, mods } = freshServer();
			const result = await installFromSource(s, "modrinth", "fine", ctx);
			assert.deepEqual(pick(result), { installed: ["Fine.jar"], unverified: [] });
			assert.deepEqual(fs.readFileSync(path.join(mods, "Fine.jar")), good);
			assert.deepEqual(leftovers(), []);
		});

		it("deletes a file whose sha512 is wrong, and leaves nothing", async () => {
			const { server: s, mods } = freshServer();
			await assert.rejects(() => installFromSource(s, "modrinth", "wrongsum", ctx), /doesn't match the checksum in the Modrinth listing/);
			assert.deepEqual(listing(mods), []);
			assert.deepEqual(leftovers(), []);
		});

		it("installs a required dependency first, and never asks for an optional one", async () => {
			const { server: s, mods } = freshServer();
			requests.length = 0;
			const result = await installFromSource(s, "modrinth", "with-dep", ctx);
			assert.deepEqual(result.installed, ["Fine.jar", "WithDep.jar"]);
			assert.deepEqual(listing(mods).sort(), ["Fine.jar", "WithDep.jar"]);
			assert.equal(requests.some((u) => u.includes("missing-opt")), false);
		});
	});
});

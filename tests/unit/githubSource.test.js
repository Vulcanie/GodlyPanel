import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

// The GitHub releases provider: a release is read through GitHub's API and the one file it ships is downloaded. The stand-in server
// answers like the API and the download host, and records every request, so a test can check the headers each one was sent with.
// The token is sent to the API only, never to a download.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-gh-"));
const tmp = path.join(root, "tmp");
fs.mkdirSync(tmp, { recursive: true });
process.env.TMPDIR = tmp;
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.GHP_DATA_DIR = path.join(root, "data");
const savedLoopback = process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
const savedGitHub = process.env.GHP_GITHUB_API;
process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = "1";

const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const secrets = await import("../../src/server/config/secretsStore.js");
const { ModError } = await import("../../src/server/services/modService.js");
const { getProvider } = await import("../../src/server/services/modSources/index.js");
const { installFromSource } = await import("../../src/server/services/modSources/installer.js");

const REFUSAL = { message: "That address isn't one the panel will download from." };
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const good = Buffer.from("a good jar with class files in it ".repeat(40));
const ZEROS64 = "0".repeat(64);
const TOKEN = "gh-token-test-789";
const provider = () => getProvider("github");

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
	const folder = path.join(root, "data", "servers", `gh-${folders}`);
	fs.mkdirSync(folder, { recursive: true });
	return { server: { name: `Gh ${folders}`, type: "minecraft", installDir: folder, workingDir: folder }, mods: path.join(folder, "mods") };
}

describe("github releases provider", () => {
	let stand;
	let base;
	let requests;
	let releases;

	before(async () => {
		await initConfig();
		await secrets.initSecrets();
		requests = [];
		stand = http.createServer((req, res) => {
			const url = new URL(req.url, "http://stand-in");
			requests.push({ path: url.pathname, headers: req.headers });
			const send = (status, body, headers = {}) => {
				res.statusCode = status;
				for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
				res.end(body);
			};
			const json = (status, body) => send(status, JSON.stringify(body), { "Content-Type": "application/json" });

			if (url.pathname.startsWith("/dl/")) {
				const name = url.pathname.slice("/dl/".length);
				if (name === "redirect.jar") return send(302, "", { Location: "https://elsewhere.example.test/x.jar" });
				if (name === "sib.jar.sha256") return send(200, `${sha256(good)}  sib.jar\n`);
				if (name === "badsib.jar.sha256") return send(200, `${ZEROS64}  badsib.jar\n`);
				if (name === "junk.jar.sha256") return send(200, "this is not a checksum");
				return send(200, good);
			}
			const match = /^\/api\/repos\/([^/]+)\/([^/]+)\/releases\/(latest|tags\/([^/]+))$/.exec(url.pathname);
			if (!match) return json(404, {});
			const [, owner, repo, , tag] = match;
			if (repo === "bounce") return send(302, "", { Location: `${base}/api/repos/acme/mod/releases/latest` });
			if (repo === "boom") return send(500, JSON.stringify({ echoed: req.headers.authorization ?? "" }));
			const found = releases.get(tag === undefined ? `${owner}/${repo}` : `${owner}/${repo}@${decodeURIComponent(tag)}`);
			return found ? json(200, found) : json(404, { message: "Not Found" });
		});
		await new Promise((r) => stand.listen(0, "127.0.0.1", r));
		base = `http://127.0.0.1:${stand.address().port}`;
		process.env.GHP_GITHUB_API = `${base}/api`;

		const asset = (name, extra = {}) => ({ name, size: good.length, browser_download_url: `${base}/dl/${name}`, ...extra });
		const release = (tagName, assets, extra = {}) => ({ tag_name: tagName, draft: false, prerelease: false, assets, ...extra });
		releases = new Map([
			// One jar, beside its sources jar and a text file: the one jar is the file.
			[
				"acme/mod",
				release("v2.0.0", [
					asset("mod-2.0.0.jar", { digest: `sha256:${sha256(good)}` }),
					asset("mod-2.0.0-sources.jar"),
					asset("notes.txt"),
				]),
			],
			["acme/two", release("v1.0.0", [asset("two-1.jar"), asset("two-2.jar")])],
			["acme/none", release("v1.0.0", [asset("notes.txt"), asset("setup.exe")])],
			["acme/zipper", release("v1.0.0", [asset("pack.zip"), asset("pack.jar")])],
			["acme/digest", release("v1.0.0", [asset("dig.jar", { digest: `sha256:${ZEROS64}` })])],
			["acme/sibling", release("v1.0.0", [asset("sib.jar"), asset("sib.jar.sha256", { size: 80 })])],
			["acme/badsib", release("v1.0.0", [asset("badsib.jar"), asset("badsib.jar.sha256", { size: 80 })])],
			["acme/junk", release("v1.0.0", [asset("junk.jar"), asset("junk.jar.sha256", { size: 30 })])],
			["acme/redir", release("v1.0.0", [asset("redirect.jar")])],
			["acme/pre", release("v0.9.0", [asset("pre.jar")], { prerelease: true })],
			["acme/draft", release("v0.9.1", [asset("draft.jar")], { draft: true })],
			["acme/pre@v0.1.0-beta", release("v0.1.0-beta", [asset("pre.jar")], { prerelease: true })],
			["acme/tagged@v1.0.0", release("v1.0.0", [asset("tagged-1.0.0.jar")])],
		]);
	});

	after(async () => {
		if (savedLoopback === undefined) delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
		else process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = savedLoopback;
		if (savedGitHub === undefined) delete process.env.GHP_GITHUB_API;
		else process.env.GHP_GITHUB_API = savedGitHub;
		await new Promise((r) => stand.close(r));
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("is registered with the hosts it downloads from", () => {
		assert.equal(provider().id, "github");
		assert.equal(provider().label, "GitHub releases");
		assert.deepEqual(provider().hosts, ["github.com", "api.github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]);
	});

	it("picks the one jar in the release, not its sources or the text file, and takes the digest from the listing", async () => {
		const mod = await provider().resolve("acme/mod", {});
		assert.deepEqual(mod, {
			source: "github",
			ref: "acme/mod",
			name: "acme/mod",
			version: "v2.0.0",
			side: "both",
			files: [{ url: `${base}/dl/mod-2.0.0.jar`, name: "mod-2.0.0.jar", size: good.length, sha256: sha256(good) }],
			dependencies: [],
		});
	});

	it("fetches a pinned tag by tag, and a pinned prerelease is allowed", async () => {
		requests.length = 0;
		const mod = await provider().resolve("acme/pre@v0.1.0-beta", {});
		assert.equal(mod.ref, "acme/pre@v0.1.0-beta");
		assert.equal(mod.version, "v0.1.0-beta");
		assert.ok(requests.some((r) => r.path === "/api/repos/acme/pre/releases/tags/v0.1.0-beta"));
		const tagged = await provider().resolve("acme/tagged@v1.0.0", {});
		assert.equal(tagged.files[0].name, "tagged-1.0.0.jar");
	});

	it("skips a prerelease or draft when no tag is pinned", async () => {
		for (const ref of ["acme/pre", "acme/draft"]) {
			const err = await failure(provider().resolve(ref, {}));
			assert.equal(err.code, "no_matching_version", ref);
		}
	});

	it("says so when the repository has no release", async () => {
		const err = await failure(provider().resolve("acme/missing", {}));
		assert.equal(err.code, "not_found");
		assert.equal(err.status, 404);
	});

	it("asks which file to take when two fit, and takes the one named", async () => {
		const err = await failure(provider().resolve("acme/two", {}));
		assert.equal(err.code, "choose_asset");
		assert.equal(err.status, 409);
		const picked = await provider().resolve("acme/two", { assetName: "two-2.jar" });
		assert.deepEqual(picked.files.map((f) => f.name), ["two-2.jar"]);
		const missing = await failure(provider().resolve("acme/two", { assetName: "nope.jar" }));
		assert.equal(missing.code, "no_matching_asset");
	});

	it("lists the matching files for a choice, and never throws choose_asset", async () => {
		const list = await provider().assets("acme/two", {});
		assert.deepEqual(list, [
			{ name: "two-1.jar", size: good.length },
			{ name: "two-2.jar", size: good.length },
		]);
		assert.deepEqual(await provider().assets("acme/none", {}), []);
	});

	it("says no file can be used when the release has none that fit", async () => {
		const err = await failure(provider().resolve("acme/none", {}));
		assert.equal(err.code, "no_matching_asset");
		assert.equal(err.status, 404);
	});

	it("takes the file type the template accepts, and reads archive as .zip", async () => {
		const zip = await provider().resolve("acme/zipper", { accepts: ["archive"] });
		assert.deepEqual(zip.files.map((f) => f.name), ["pack.zip"]);
		const jarOnly = await provider().resolve("acme/zipper", { accepts: [".jar"] });
		assert.deepEqual(jarOnly.files.map((f) => f.name), ["pack.jar"]);
		const err = await failure(provider().resolve("acme/zipper", {}));
		assert.equal(err.code, "choose_asset", "no list given: .jar and .zip both fit");
	});

	it("checks a download against its digest, and a wrong digest leaves nothing installed", async () => {
		const { server, mods } = freshServer();
		await assert.rejects(() => installFromSource(server, "github", "acme/digest", {}), /doesn't match the checksum in the GitHub releases listing/);
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});

	it("installs a file whose digest is right, with no unverified note", async () => {
		const { server, mods } = freshServer();
		const result = await installFromSource(server, "github", "acme/mod", {});
		assert.deepEqual(result, { installed: ["mod-2.0.0.jar"], unverified: [] });
		assert.deepEqual(fs.readFileSync(path.join(mods, "mod-2.0.0.jar")), good);
	});

	it("uses a .sha256 file beside the asset when there is no digest, and refuses a wrong one", async () => {
		const good1 = freshServer();
		assert.deepEqual(await installFromSource(good1.server, "github", "acme/sibling", {}), { installed: ["sib.jar"], unverified: [] });
		const bad = freshServer();
		await assert.rejects(() => installFromSource(bad.server, "github", "acme/badsib", {}), /doesn't match the checksum/);
		assert.deepEqual(listing(bad.mods), []);
	});

	it("ignores a .sha256 file that isn't a checksum, and says the file is unverified", async () => {
		const { server } = freshServer();
		const result = await installFromSource(server, "github", "acme/junk", {});
		assert.deepEqual(result, { installed: ["junk.jar"], unverified: ["junk.jar"] });
	});

	it("sends the token on API calls and never on a download", async () => {
		requests.length = 0;
		const ctx = { secrets: { githubToken: TOKEN } };
		await provider().resolve("acme/mod", ctx);
		const api = requests.filter((r) => r.path.startsWith("/api/"));
		assert.ok(api.length > 0);
		assert.ok(api.every((r) => r.headers.authorization === `Bearer ${TOKEN}`));

		requests.length = 0;
		const { server } = freshServer();
		await installFromSource(server, "github", "acme/sibling", ctx);
		const downloads = requests.filter((r) => r.path.startsWith("/dl/"));
		assert.ok(downloads.length >= 2, "the file and its checksum were both fetched");
		assert.ok(downloads.every((r) => r.headers.authorization === undefined), "no download carries the token");
	});

	it("sends no authorization header when no token is set", async () => {
		requests.length = 0;
		await provider().resolve("acme/mod", { secrets: { githubToken: "" } });
		assert.ok(requests.every((r) => r.headers.authorization === undefined));
	});

	it("refuses a download that redirects to another host, and installs nothing", async () => {
		const { server, mods } = freshServer();
		await assert.rejects(() => installFromSource(server, "github", "acme/redir", {}), REFUSAL);
		assert.deepEqual(listing(mods), []);
		assert.deepEqual(leftovers(), []);
	});

	it("refuses a bad ref before any request is made", async () => {
		requests.length = 0;
		for (const ref of ["", "acme", "acme/", "/repo", "a/b/c", "ac me/x", "acme/..", "acme/.", "acme/repo@", "acme/repo@..", "acme/repo@../x", "acme/repo@v1/x", "acme/" + "r".repeat(101), 42]) {
			const err = await failure(provider().resolve(ref, {}));
			assert.equal(err.code, "bad_ref", String(ref));
		}
		assert.equal(requests.length, 0);
	});

	it("keeps the token out of an error message, even when GitHub's answer echoes it", async () => {
		const secret = "gh-secret-500";
		const err = await failure(provider().resolve("acme/boom", { secrets: { githubToken: secret } }));
		assert.equal(err instanceof ModError, true);
		assert.equal(err.code, "github_failed");
		assert.equal(err.message.includes(secret), false);
	});

	it("doesn't follow a redirect from the API", async () => {
		requests.length = 0;
		const err = await failure(provider().resolve("acme/bounce", {}));
		assert.equal(err.code, "github_failed");
		assert.equal(requests.some((r) => r.path === "/api/repos/acme/mod/releases/latest"), false, "the redirect target was never asked for");
	});
});

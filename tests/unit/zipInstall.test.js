import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import AdmZip from "adm-zip";
import {
	ZIP_DOWNLOAD_HOSTS,
	isAllowedDownloadUrl,
	checkSpec,
	pickAsset,
	sha256FromDigest,
	resolveRelease,
	installZipRelease,
} from "../../src/server/services/zipInstall.js";
import { listZip, extractZip } from "../../src/server/util/tarZip.js";

// A game installed from a GitHub release zip (a template's `zipInstall`): which file is picked, what is refused (no checksum, a
// checksum that doesn't match, a host that isn't GitHub's, an archive that reaches outside the folder), and what happens in what
// order. GitHub and the unpacker are replaced, so no test touches the network. The ones that use the Windows tar are marked.

const onWindows = process.platform === "win32";
const SPEC = { repo: "owner/game", asset: "server.zip" };
const GOOD_URL = "https://github.com/owner/game/releases/download/v1.2.3/server.zip";

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "gp-zipinstall-"));
const cleanup = (...dirs) => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));

function releaseFor(body, assetExtra = {}, releaseExtra = {}) {
	return {
		tag_name: "v1.2.3",
		draft: false,
		prerelease: false,
		assets: [
			{ name: "server.zip.sig", size: 10, digest: `sha256:${"a".repeat(64)}`, browser_download_url: `${GOOD_URL}.sig` },
			{ name: "Server.zip", size: 10, digest: `sha256:${"b".repeat(64)}`, browser_download_url: GOOD_URL.replace("server", "Server") },
			{ name: "server.zip", size: body.length, digest: `sha256:${sha(body)}`, browser_download_url: GOOD_URL, ...assetExtra },
		],
		...releaseExtra,
	};
}

/** A fetch that answers GitHub's API with `release` and the file with `body`, recording every address it was asked for. */
function fakeFetch({ release, body, finalUrl = null, apiStatus = 200 }) {
	const calls = [];
	const fetchImpl = async (url) => {
		calls.push(String(url));
		if (String(url).startsWith("https://api.github.com/")) return new Response(apiStatus === 200 ? JSON.stringify(release) : "nope", { status: apiStatus, headers: { "Content-Type": "application/json" } });
		const res = new Response(body, { status: 200 });
		Object.defineProperty(res, "url", { value: finalUrl ?? String(url) });
		return res;
	};
	return { fetchImpl, calls };
}

/** An unpacker that records what it is asked and "unpacks" the given files. */
function fakeArchive(names, files = names.filter((n) => !n.endsWith("/"))) {
	const seen = { listed: 0, extracted: [] };
	return {
		seen,
		list: async () => {
			seen.listed += 1;
			return names;
		},
		extract: async (_zip, dir) => {
			seen.extracted.push(dir);
			for (const f of files) {
				fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
				fs.writeFileSync(path.join(dir, f), "x");
			}
		},
	};
}

describe("which file is picked", () => {
	it("takes the asset with exactly the requested name, whatever else the release holds", () => {
		const release = releaseFor(Buffer.from("zip"));
		assert.equal(pickAsset(release, "server.zip").name, "server.zip");
		assert.equal(pickAsset(release, "Server.zip").name, "Server.zip", "case matters");
		assert.equal(pickAsset(release, "server.zip.sig").name, "server.zip.sig");
	});

	it("takes nothing for a prefix, a pattern, another case or a missing name", () => {
		const release = releaseFor(Buffer.from("zip"));
		for (const name of ["server", "server.z", "*.zip", "SERVER.ZIP", "other.zip", "", undefined]) assert.equal(pickAsset(release, name), null, String(name));
		assert.equal(pickAsset({ assets: null }, "server.zip"), null);
		assert.equal(pickAsset(null, "server.zip"), null);
	});

	it("reads the checksum from GitHub's digest field and from nothing else", () => {
		assert.equal(sha256FromDigest(`sha256:${"AB".repeat(32)}`), "ab".repeat(32));
		for (const bad of [null, undefined, "", `md5:${"a".repeat(32)}`, `sha256:${"a".repeat(63)}`, `sha256:${"g".repeat(64)}`, `${"a".repeat(64)}`, `sha256:${"a".repeat(64)} `]) {
			assert.equal(sha256FromDigest(bad), null, String(bad));
		}
	});

	it("checks the template's own spec", () => {
		assert.deepEqual(checkSpec(SPEC), { repo: "owner/game", asset: "server.zip", maxBytes: 1024 ** 3, expect: [] });
		for (const bad of [{ repo: "nope", asset: "a.zip" }, { repo: "a/b/c", asset: "a.zip" }, { repo: "a/b", asset: "../a.zip" }, { repo: "a/b", asset: "dir/a.zip" }, { repo: "a/b", asset: "" }, null]) {
			assert.throws(() => checkSpec(bad), undefined, JSON.stringify(bad));
		}
	});
});

describe("which addresses a download may come from", () => {
	it("allows https on GitHub's three hosts and nothing else", () => {
		assert.deepEqual(ZIP_DOWNLOAD_HOSTS, ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]);
		for (const url of [GOOD_URL, "https://objects.githubusercontent.com/x/y", "https://release-assets.githubusercontent.com/github-production-release-asset/1/2?x=1", "https://GitHub.com/a/b"]) {
			assert.equal(isAllowedDownloadUrl(url), true, url);
		}
		for (const url of [
			"http://github.com/a/b/releases/download/v1/x.zip",
			"https://github.com.evil.example/a.zip",
			"https://evil.example/github.com/a.zip",
			"https://evilgithub.com/a.zip",
			"https://api.github.com/a",
			"https://raw.githubusercontent.com/a/b/c",
			"https://sub.github.com/a.zip",
			"https://user:pw@github.com/a.zip",
			"https://github.com:8443/a.zip",
			"ftp://github.com/a.zip",
			"//github.com/a.zip",
			"github.com/a.zip",
			"",
			null,
		]) {
			assert.equal(isAllowedDownloadUrl(url), false, String(url));
		}
	});
});

describe("what a release must have before anything is downloaded", () => {
	const body = Buffer.from("the zip");
	const resolve = (release, spec = SPEC) => resolveRelease(spec, { fetchImpl: fakeFetch({ release }).fetchImpl });

	it("describes the file, its size and the checksum GitHub publishes for it", async () => {
		const found = await resolve(releaseFor(body));
		assert.deepEqual(found, { repo: "owner/game", asset: "server.zip", tag: "v1.2.3", size: body.length, sha256: sha(body), url: GOOD_URL });
	});

	it("asks GitHub's API for the latest release of the template's repo, and only that", async () => {
		const f = fakeFetch({ release: releaseFor(body) });
		await resolveRelease(SPEC, { fetchImpl: f.fetchImpl });
		assert.deepEqual(f.calls, ["https://api.github.com/repos/owner/game/releases/latest"]);
	});

	it("refuses a release that publishes no checksum for the file", async () => {
		for (const digest of [undefined, null, "", `md5:${"a".repeat(32)}`, "sha256:abc"]) {
			await assert.rejects(resolve(releaseFor(body, { digest })), (e) => e.refusal === true && /publishes no SHA-256/.test(e.message), String(digest));
		}
	});

	it("refuses a release without a file of that name", async () => {
		await assert.rejects(resolve(releaseFor(body), { repo: "owner/game", asset: "missing.zip" }), (e) => e.refusal && /no file named missing\.zip/.test(e.message));
		await assert.rejects(resolve({ tag_name: "v1", assets: [] }), (e) => e.refusal && /no file named server\.zip/.test(e.message));
	});

	it("refuses a draft or a pre-release", async () => {
		await assert.rejects(resolve(releaseFor(body, {}, { prerelease: true })), (e) => e.refusal && /pre-release/.test(e.message));
		await assert.rejects(resolve(releaseFor(body, {}, { draft: true })), (e) => e.refusal);
	});

	it("refuses a file over the size cap, and one with no size", async () => {
		await assert.rejects(resolve(releaseFor(body, { size: 5000 }), { ...SPEC, maxBytes: 1000 }), (e) => e.refusal && /more than the .* allows/.test(e.message));
		for (const size of [0, -1, 1.5, "10", null]) await assert.rejects(resolve(releaseFor(body, { size })), (e) => e.refusal, String(size));
	});

	it("refuses a file offered at an address that isn't GitHub's", async () => {
		for (const url of ["https://evil.example/server.zip", "http://github.com/o/r/server.zip", "https://github.com.evil.example/server.zip", undefined]) {
			await assert.rejects(resolve(releaseFor(body, { browser_download_url: url })), (e) => e.refusal && /not GitHub's/.test(e.message), String(url));
		}
	});

	it("passes GitHub being unreachable or unhappy on as an ordinary error, not a refusal", async () => {
		const down = async () => {
			throw new Error("getaddrinfo ENOTFOUND api.github.com");
		};
		await assert.rejects(resolveRelease(SPEC, { fetchImpl: down }), (e) => !e.refusal && /ENOTFOUND/.test(e.message));
		await assert.rejects(resolveRelease(SPEC, { fetchImpl: fakeFetch({ apiStatus: 403 }).fetchImpl }), (e) => !e.refusal && /403/.test(e.message));
		await assert.rejects(resolveRelease(SPEC, { fetchImpl: fakeFetch({ apiStatus: 404 }).fetchImpl }), (e) => !e.refusal && /doesn't know/.test(e.message));
	});
});

describe("installing from a release zip", () => {
	const body = Buffer.from("pretend this is a zip file");

	it("downloads, checks, unpacks into the folder, logs each step and leaves no download behind", async () => {
		const dir = tmp();
		const install = path.join(dir, "srv");
		try {
			const f = fakeFetch({ release: releaseFor(body), body });
			const archive = fakeArchive(["bin/", "bin/server.dll", "readme.txt"]);
			const lines = [];
			const stages = [];
			const out = await installZipRelease({ ...SPEC, expect: ["bin\\server.dll"] }, install, { fetchImpl: f.fetchImpl, archive, log: (m) => lines.push(m), onStage: (s) => stages.push(s) });
			assert.deepEqual(out, { tag: "v1.2.3", size: body.length, sha256: sha(body) });
			assert.deepEqual(f.calls, ["https://api.github.com/repos/owner/game/releases/latest", GOOD_URL]);
			assert.deepEqual(archive.seen.extracted, [install]);
			assert.ok(fs.existsSync(path.join(install, "bin", "server.dll")));
			assert.deepEqual(stages, ["downloading", "installing"]);
			assert.deepEqual(fs.readdirSync(install).sort(), ["bin", "readme.txt"], "the downloaded zip and its folder are gone");
			const text = lines.join("\n");
			for (const step of [/Asking GitHub for the latest release of owner\/game/, /Found v1\.2\.3: server\.zip/, /Downloading https:\/\/github\.com/, /SHA-256 matches/, /Checking the names/, /Unpacking 3 entries/, /Installed v1\.2\.3/]) {
				assert.match(text, step);
			}
			assert.ok(lines.indexOf(lines.find((l) => /SHA-256 matches/.test(l))) < lines.indexOf(lines.find((l) => /Unpacking/.test(l))), "the check comes before the unpacking");
		} finally {
			cleanup(dir);
		}
	});

	it("accepts a redirect to GitHub's own download hosts", async () => {
		const dir = tmp();
		try {
			for (const finalUrl of ["https://objects.githubusercontent.com/github-production-release-asset/1/2", "https://release-assets.githubusercontent.com/github-production-release-asset/1/2?sp=r"]) {
				const f = fakeFetch({ release: releaseFor(body), body, finalUrl });
				await installZipRelease(SPEC, path.join(dir, "ok"), { fetchImpl: f.fetchImpl, archive: fakeArchive(["a.txt"]) });
			}
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a download whose checksum does not match, unpacks nothing and deletes the file", async () => {
		const dir = tmp();
		const install = path.join(dir, "srv");
		try {
			const tampered = Buffer.from("pretend this is a DIFFERENT file");
			const f = fakeFetch({ release: releaseFor(body, { size: tampered.length }), body: tampered });
			const archive = fakeArchive(["a.txt"]);
			await assert.rejects(installZipRelease(SPEC, install, { fetchImpl: f.fetchImpl, archive }), /doesn't match the checksum in the GitHub release/);
			assert.equal(archive.seen.listed, 0, "the archive was never opened");
			assert.deepEqual(archive.seen.extracted, []);
			assert.deepEqual(fs.readdirSync(install), [], "nothing is left in the server's folder, not even the partial download");
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a release with no checksum before downloading anything", async () => {
		const dir = tmp();
		try {
			const f = fakeFetch({ release: releaseFor(body, { digest: null }), body });
			const archive = fakeArchive(["a.txt"]);
			await assert.rejects(installZipRelease(SPEC, path.join(dir, "srv"), { fetchImpl: f.fetchImpl, archive }), /publishes no SHA-256/);
			assert.deepEqual(f.calls, ["https://api.github.com/repos/owner/game/releases/latest"], "the file itself was never requested");
			assert.equal(archive.seen.listed, 0);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a download that GitHub redirects to a host that isn't its own, and never reads its content", async () => {
		const dir = tmp();
		try {
			for (const finalUrl of ["https://evil.example/server.zip", "http://objects.githubusercontent.com/x", "https://objects.githubusercontent.com.evil.example/x"]) {
				const archive = fakeArchive(["a.txt"]);
				const f = fakeFetch({ release: releaseFor(body), body, finalUrl });
				await assert.rejects(installZipRelease(SPEC, path.join(dir, "srv"), { fetchImpl: f.fetchImpl, archive }), /redirected somewhere the panel doesn't trust/, finalUrl);
				assert.equal(archive.seen.listed, 0);
			}
		} finally {
			cleanup(dir);
		}
	});

	it("refuses an address in the release that isn't GitHub's, without requesting it", async () => {
		const dir = tmp();
		try {
			const f = fakeFetch({ release: releaseFor(body, { browser_download_url: "https://evil.example/server.zip" }), body });
			await assert.rejects(installZipRelease(SPEC, path.join(dir, "srv"), { fetchImpl: f.fetchImpl, archive: fakeArchive(["a.txt"]) }), /not GitHub's/);
			assert.ok(!f.calls.some((c) => c.includes("evil.example")), f.calls.join(", "));
		} finally {
			cleanup(dir);
		}
	});

	it("stops a download that is larger than the release says", async () => {
		const dir = tmp();
		try {
			const big = Buffer.alloc(3 * 1024 * 1024, 1);
			const f = fakeFetch({ release: releaseFor(body, { size: 100, digest: `sha256:${sha(big)}` }), body: big });
			await assert.rejects(installZipRelease(SPEC, path.join(dir, "srv"), { fetchImpl: f.fetchImpl, archive: fakeArchive(["a.txt"]) }), /larger than it should be/);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses an archive with an entry outside the folder, before unpacking any of it", async () => {
		const dir = tmp();
		const install = path.join(dir, "srv");
		try {
			for (const evil of ["../evil.txt", "a/../../evil.txt", "/etc/evil", "C:\\Windows\\evil.dll", "C:/evil", "..\\evil.txt", "sub\\..\\..\\evil.txt"]) {
				const archive = fakeArchive(["fine.txt", evil]);
				const f = fakeFetch({ release: releaseFor(body), body });
				await assert.rejects(installZipRelease(SPEC, install, { fetchImpl: f.fetchImpl, archive }), /outside its own folder/, evil);
				assert.equal(archive.seen.listed, 1, evil);
				assert.deepEqual(archive.seen.extracted, [], `${evil}: nothing was unpacked`);
				assert.deepEqual(fs.readdirSync(install), [], `${evil}: the folder is untouched`);
			}
			assert.ok(!fs.existsSync(path.join(dir, "evil.txt")));
		} finally {
			cleanup(dir);
		}
	});

	it("refuses an empty archive and one that lacks a file the template expects", async () => {
		const dir = tmp();
		try {
			const f = () => fakeFetch({ release: releaseFor(body), body }).fetchImpl;
			await assert.rejects(installZipRelease(SPEC, path.join(dir, "a"), { fetchImpl: f(), archive: fakeArchive([]) }), /empty archive/);
			await assert.rejects(installZipRelease({ ...SPEC, expect: ["tModLoader.dll"] }, path.join(dir, "b"), { fetchImpl: f(), archive: fakeArchive(["readme.txt"]) }), /did not contain tModLoader\.dll/);
		} finally {
			cleanup(dir);
		}
	});
});

/** A zip with the entry names exactly as given (a library would tidy a "../" away), every file stored uncompressed. */
function rawZip(entries) {
	const locals = [];
	const central = [];
	let offset = 0;
	for (const [name, content] of entries) {
		const nameBuf = Buffer.from(name);
		const data = Buffer.from(content);
		const crc = zlib.crc32(data);
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nameBuf.length, 26);
		const head = Buffer.alloc(46);
		head.writeUInt32LE(0x02014b50, 0);
		head.writeUInt16LE(20, 4);
		head.writeUInt16LE(20, 6);
		head.writeUInt32LE(crc, 16);
		head.writeUInt32LE(data.length, 20);
		head.writeUInt32LE(data.length, 24);
		head.writeUInt16LE(nameBuf.length, 28);
		head.writeUInt32LE(offset, 42);
		locals.push(local, nameBuf, data);
		central.push(head, nameBuf);
		offset += local.length + nameBuf.length + data.length;
	}
	const centralBuf = Buffer.concat(central);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(centralBuf.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, centralBuf, end]);
}

describe("unpacking with the Windows tar", { skip: !onWindows }, () => {
	function zipOf(entries) {
		const zip = new AdmZip();
		for (const [name, content] of entries) zip.addFile(name, Buffer.from(content));
		return zip.toBuffer();
	}
	const realArchive = { list: listZip, extract: extractZip };

	it("unpacks a normal archive into the folder, with its sub-folders", async () => {
		const dir = tmp();
		const install = path.join(dir, "srv");
		try {
			const zip = zipOf([["tModLoader.dll", "dll"], ["LaunchUtils/run.sh", "sh"], ["serverconfig.txt", "cfg"]]);
			const f = fakeFetch({ release: releaseFor(zip), body: zip });
			await installZipRelease({ ...SPEC, expect: ["tModLoader.dll", "LaunchUtils\\run.sh"] }, install, { fetchImpl: f.fetchImpl, archive: realArchive });
			assert.equal(fs.readFileSync(path.join(install, "LaunchUtils", "run.sh"), "utf8"), "sh");
			assert.deepEqual(fs.readdirSync(install).sort(), ["LaunchUtils", "serverconfig.txt", "tModLoader.dll"]);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a real zip that has a '..' entry, and writes nothing outside the folder", async () => {
		const dir = tmp();
		const install = path.join(dir, "srv");
		try {
			const zip = rawZip([["fine.txt", "ok"], ["../escaped.txt", "bad"]]);
			const probe = path.join(dir, "probe.zip");
			fs.writeFileSync(probe, zip);
			const names = await listZip(probe);
			assert.ok(names.some((n) => n.includes("..")), `the test archive really has the entry: ${names.join(", ")}`);
			const f = fakeFetch({ release: releaseFor(zip), body: zip });
			await assert.rejects(installZipRelease(SPEC, install, { fetchImpl: f.fetchImpl, archive: realArchive }), /outside its own folder/);
			assert.ok(!fs.existsSync(path.join(dir, "escaped.txt")));
			assert.deepEqual(fs.readdirSync(install), []);
		} finally {
			cleanup(dir);
		}
	});
});

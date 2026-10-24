import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	isAllowedWebUrl,
	checkWebSpec,
	resolveWebDownload,
	installWebDownload,
	describeWebExtras,
	webDeps,
	WebInstallRefused,
} from "../../src/server/services/webInstall.js";
import { mojangServerJar, terrariaServerZip } from "../../src/server/services/webResolvers.js";

// A game installed from its maker's own website (a template's `webInstall`): which addresses are allowed, what is refused (a host not
// on the template's list, a file over the cap, a checksum that doesn't match), and what lands in the server's folder. The network and
// the unpacker are replaced, so no test touches the internet.

const HOSTS = ["files.example.com"];
const GOOD_URL = "https://files.example.com/server.jar";
const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "gp-webinstall-"));
const cleanup = (...dirs) => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));

const body = Buffer.from("pretend this is a server jar");
const spec = (extra = {}, found = {}) => ({
	label: "Example server",
	hosts: HOSTS,
	kind: "file",
	fileName: "server.jar",
	resolve: async () => ({ url: GOOD_URL, bytes: body.length, sha1: sha1(body), version: "1.2.3", ...found }),
	...extra,
});

function fakeFetch(payload = body, finalUrl = null) {
	const calls = [];
	const fetchImpl = async (url) => {
		calls.push(String(url));
		const res = new Response(payload, { status: 200 });
		Object.defineProperty(res, "url", { value: finalUrl ?? String(url) });
		return res;
	};
	return { fetchImpl, calls };
}

describe("which addresses a download may come from", () => {
	it("allows https on exactly the template's hosts", () => {
		assert.equal(isAllowedWebUrl(GOOD_URL, HOSTS), true);
		assert.equal(isAllowedWebUrl("https://FILES.example.com/x", HOSTS), true);
		for (const url of [
			"http://files.example.com/x",
			"https://files.example.com.evil.example/x",
			"https://sub.files.example.com/x",
			"https://example.com/x",
			"https://user:pw@files.example.com/x",
			"https://files.example.com:8443/x",
			"ftp://files.example.com/x",
			"files.example.com/x",
			"",
			null,
		]) {
			assert.equal(isAllowedWebUrl(url, HOSTS), false, String(url));
		}
		assert.equal(isAllowedWebUrl(GOOD_URL, []), false, "no hosts means nothing is allowed");
	});
});

describe("the template's own spec", () => {
	it("fills in the defaults and refuses a malformed one", () => {
		const ok = checkWebSpec(spec());
		assert.equal(ok.maxBytes, 1024 ** 3);
		assert.deepEqual(ok.expect, []);
		assert.equal(ok.kind, "file");
		for (const bad of [
			null,
			spec({ hosts: [] }),
			spec({ hosts: ["a/b"] }),
			spec({ hosts: "files.example.com" }),
			spec({ kind: "tar" }),
			spec({ kind: "file", fileName: "../x.jar" }),
			spec({ kind: "file", fileName: "" }),
			spec({ resolve: null }),
		]) {
			assert.throws(() => checkWebSpec(bad), undefined, JSON.stringify(bad));
		}
	});
});

describe("what is looked up before anything is downloaded", () => {
	const look = (s) => resolveWebDownload(s, { fetchImpl: fakeFetch().fetchImpl });

	it("describes the file, its size, its version and the checksum the maker publishes", async () => {
		const found = await look(spec());
		assert.deepEqual(
			{ url: found.url, size: found.size, version: found.version, sha1: found.sha1, sha256: found.sha256 },
			{ url: GOOD_URL, size: body.length, version: "1.2.3", sha1: sha1(body), sha256: null },
		);
		assert.equal(found.host, "files.example.com");
	});

	it("refuses an address that is not on the list, a size over the cap and a bad checksum value", async () => {
		await assert.rejects(look(spec({}, { url: "https://evil.example/server.jar" })), WebInstallRefused);
		await assert.rejects(look(spec({ maxBytes: 10 })), WebInstallRefused);
		await assert.rejects(look(spec({}, { bytes: 0 })), WebInstallRefused);
		await assert.rejects(look(spec({}, { sha1: "not-hex" })), WebInstallRefused);
	});

	it("lets a download with no published checksum through, and says so", async () => {
		const found = await look(spec({}, { sha1: null, sha256: null }));
		assert.equal(found.sha1, null);
		assert.equal(found.sha256, null);
	});
});

describe("installing a single file", () => {
	it("downloads it into the server folder under the template's file name when the checksum matches", async () => {
		const dir = tmp();
		try {
			const { fetchImpl, calls } = fakeFetch();
			const done = await installWebDownload(spec(), dir, { fetchImpl });
			assert.deepEqual(calls, [GOOD_URL]);
			assert.equal(fs.readFileSync(path.join(dir, "server.jar"), "utf8"), body.toString());
			assert.equal(done.version, "1.2.3");
			assert.equal(done.sha256, sha256(body), "the computed SHA-256 is reported");
			assert.equal(done.checksumPublished, true);
			assert.equal(fs.existsSync(path.join(dir, ".godlypanel-download")), false, "the scratch folder is removed");
		} finally {
			cleanup(dir);
		}
	});

	it("deletes the download and installs nothing when the checksum does not match", async () => {
		const dir = tmp();
		try {
			const { fetchImpl } = fakeFetch(Buffer.from("tampered with, same length!"));
			await assert.rejects(installWebDownload(spec({}, { bytes: 27 }), dir, { fetchImpl }), /checksum/);
			assert.equal(fs.existsSync(path.join(dir, "server.jar")), false);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a redirect that leaves the allowed hosts", async () => {
		const dir = tmp();
		try {
			const { fetchImpl } = fakeFetch(body, "https://evil.example/server.jar");
			await assert.rejects(installWebDownload(spec(), dir, { fetchImpl }), /redirected/);
			assert.equal(fs.existsSync(path.join(dir, "server.jar")), false);
		} finally {
			cleanup(dir);
		}
	});

	it("installs a download with no published checksum and reports that it could not be checked", async () => {
		const dir = tmp();
		try {
			const done = await installWebDownload(spec({}, { sha1: null }), dir, { fetchImpl: fakeFetch().fetchImpl });
			assert.equal(done.checksumPublished, false);
			assert.equal(done.sha256, sha256(body));
			assert.equal(fs.existsSync(path.join(dir, "server.jar")), true);
		} finally {
			cleanup(dir);
		}
	});

	it("reports each stage in order and logs what it does", async () => {
		const dir = tmp();
		try {
			const stages = [];
			const lines = [];
			await installWebDownload(spec(), dir, { fetchImpl: fakeFetch().fetchImpl, onStage: (s) => stages.push(s), log: (l) => lines.push(l) });
			assert.deepEqual(stages, ["downloading", "installing"]);
			assert.ok(lines.some((l) => l.includes("files.example.com")));
		} finally {
			cleanup(dir);
		}
	});
});

describe("installing a zip", () => {
	const zipSpec = (extra = {}) => spec({ kind: "zip", fileName: undefined, expect: ["TerrariaServer.exe"], ...extra });
	const archive = (names, files = names.filter((n) => !n.endsWith("/"))) => ({
		list: async () => names,
		extract: async (_zip, dir) => {
			for (const f of files) {
				fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
				fs.writeFileSync(path.join(dir, f), "x");
			}
		},
	});

	it("unpacks into the server folder and checks the files the template expects", async () => {
		const dir = tmp();
		try {
			const done = await installWebDownload(zipSpec(), dir, { fetchImpl: fakeFetch().fetchImpl, archive: archive(["TerrariaServer.exe"]) });
			assert.equal(fs.existsSync(path.join(dir, "TerrariaServer.exe")), true);
			assert.equal(done.version, "1.2.3");
		} finally {
			cleanup(dir);
		}
	});

	it("unpacks nothing when a name in the archive reaches outside the folder", async () => {
		const dir = tmp();
		try {
			await assert.rejects(
				installWebDownload(zipSpec(), dir, { fetchImpl: fakeFetch().fetchImpl, archive: archive(["../evil.exe", "TerrariaServer.exe"]) }),
				WebInstallRefused,
			);
			assert.equal(fs.existsSync(path.join(dir, "TerrariaServer.exe")), false);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses an archive that lacks a file the template expects", async () => {
		const dir = tmp();
		try {
			await assert.rejects(installWebDownload(zipSpec(), dir, { fetchImpl: fakeFetch().fetchImpl, archive: archive(["readme.txt"]) }), /did not contain TerrariaServer\.exe/);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses an empty archive", async () => {
		const dir = tmp();
		try {
			await assert.rejects(installWebDownload(zipSpec(), dir, { fetchImpl: fakeFetch().fetchImpl, archive: archive([]) }), /empty/);
		} finally {
			cleanup(dir);
		}
	});
});

describe("extra files a server needs that its own download lacks", () => {
	// Terraria's Windows server needs Microsoft's XNA Framework DLLs. The extra's address, size and SHA-256 are written in the template,
	// the file must carry a valid Microsoft signature, and an .msi is only unpacked (never installed); only the named files are copied.
	const msiBody = Buffer.from("pretend this is an msi");
	const EXTRA_URL = "https://files.example.com/xna.msi";
	const SIGNER = "Microsoft Corporation";
	const extra = (over = {}) => ({
		label: "XNA Framework 4.0",
		why: "the server will not start without it",
		hosts: HOSTS,
		url: EXTRA_URL,
		kind: "msi",
		bytes: msiBody.length,
		sha256: sha256(msiBody),
		signer: SIGNER,
		pick: /^(Microsoft\.Xna\.Framework.*\.dll|XnaNative\.dll)$/i,
		expect: ["Microsoft.Xna.Framework.dll", "XnaNative.dll"],
		into: "1458\\Windows",
		...over,
	});
	const zipSpec = (extras = [extra()]) => spec({ kind: "zip", fileName: undefined, expect: ["1458\\Windows\\TerrariaServer.exe"], extras });
	const zipArchive = {
		list: async () => ["1458/Windows/TerrariaServer.exe"],
		extract: async (_zip, dir) => {
			fs.mkdirSync(path.join(dir, "1458", "Windows"), { recursive: true });
			fs.writeFileSync(path.join(dir, "1458", "Windows", "TerrariaServer.exe"), "x");
		},
	};
	// The content of an administrative image: the wanted DLLs among files the server does not need.
	const image = ["Program Files/Microsoft XNA/XNA Game Studio/v4.0/References/Windows/x86/Microsoft.Xna.Framework.dll", "Program Files/Microsoft Shared/XNA/Framework/v4.0/XnaNative.dll", "Program Files/Microsoft XNA/other.dll", "Win/System/msvcr100.dll"];
	const msi = (over = {}) => {
		const ran = { signature: [], unpack: [] };
		return {
			ran,
			signature: async (file) => (ran.signature.push(file), { status: "Valid", subject: "CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US" }),
			unpack: async (file, dir) => {
				ran.unpack.push([file, dir]);
				for (const f of image) {
					fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
					fs.writeFileSync(path.join(dir, f), `contents of ${path.basename(f)}`);
				}
			},
			...over,
		};
	};
	const fetchBoth = () => {
		const calls = [];
		const fetchImpl = async (url) => {
			calls.push(String(url));
			const res = new Response(String(url) === EXTRA_URL ? msiBody : body, { status: 200 });
			Object.defineProperty(res, "url", { value: String(url) });
			return res;
		};
		return { fetchImpl, calls };
	};
	const run = (dir, s, opts) => installWebDownload(s, dir, { archive: zipArchive, ...opts });
	const server = (dir) => path.join(dir, "1458", "Windows");

	it("describes what a person is asked to agree to without touching the network", () => {
		const [e] = describeWebExtras(zipSpec());
		assert.deepEqual(e, { label: "XNA Framework 4.0", why: "the server will not start without it", host: "files.example.com", size: msiBody.length, sizeText: "1 KB", signer: SIGNER });
		assert.deepEqual(describeWebExtras(spec()), []);
	});

	it("copies only the files the template picks, beside the server, and leaves the rest of the unpacked image behind", async () => {
		const dir = tmp();
		const stand = msi();
		try {
			const { fetchImpl, calls } = fetchBoth();
			await run(dir, zipSpec(), { fetchImpl, msi: stand });
			assert.ok(calls.includes(EXTRA_URL));
			assert.deepEqual(fs.readdirSync(server(dir)).sort(), ["Microsoft.Xna.Framework.dll", "TerrariaServer.exe", "XnaNative.dll"]);
			assert.equal(fs.readFileSync(path.join(server(dir), "XnaNative.dll"), "utf8"), "contents of XnaNative.dll");
			assert.equal(stand.ran.signature.length, 1);
			assert.equal(stand.ran.unpack.length, 1);
			assert.equal(fs.existsSync(path.join(dir, ".godlypanel-download")), false, "the scratch folder, with the unpacked image, is removed");
		} finally {
			cleanup(dir);
		}
	});

	it("unpacks into a folder of its own, never into the server's folder", async () => {
		const dir = tmp();
		const stand = msi();
		try {
			await run(dir, zipSpec(), { fetchImpl: fetchBoth().fetchImpl, msi: stand });
			const target = path.resolve(stand.ran.unpack[0][1]);
			assert.ok(!target.startsWith(path.resolve(dir) + path.sep) || target.includes(".godlypanel-download"));
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a download whose SHA-256 is not the one fixed in the template, and copies nothing", async () => {
		const dir = tmp();
		const stand = msi();
		try {
			const tampered = Buffer.from("pretend this is an MSI");
			assert.equal(tampered.length, msiBody.length);
			const fetchImpl = async (url) => new Response(String(url) === EXTRA_URL ? tampered : body, { status: 200 });
			await assert.rejects(run(dir, zipSpec(), { fetchImpl, msi: stand }), /checksum/);
			assert.equal(stand.ran.unpack.length, 0, "an unchecked file is never opened");
			assert.equal(fs.existsSync(path.join(server(dir), "XnaNative.dll")), false);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a file that is not the pinned size", async () => {
		const dir = tmp();
		try {
			await assert.rejects(run(dir, zipSpec([extra({ bytes: msiBody.length + 5 })]), { fetchImpl: fetchBoth().fetchImpl, msi: msi() }), /bytes/);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a file Windows does not call validly signed, or signed by someone else", async () => {
		for (const sig of [
			{ status: "NotSigned", subject: "" },
			{ status: "HashMismatch", subject: "O=Microsoft Corporation" },
			{ status: "Valid", subject: "CN=Evil, O=Microsoft Corporation Fan Club" },
			{ status: "Valid", subject: "CN=Someone Else, O=Someone Else" },
		]) {
			const dir = tmp();
			const stand = msi({ signature: async () => sig });
			try {
				await assert.rejects(run(dir, zipSpec(), { fetchImpl: fetchBoth().fetchImpl, msi: stand }), (err) => err instanceof WebInstallRefused && /signature/.test(err.message), JSON.stringify(sig));
				assert.equal(stand.ran?.unpack?.length ?? 0, 0);
				assert.equal(fs.existsSync(path.join(server(dir), "XnaNative.dll")), false);
			} finally {
				cleanup(dir);
			}
		}
	});

	it("refuses an image that lacks a file the template expects, and removes nothing it did not write", async () => {
		const dir = tmp();
		try {
			const stand = msi({ unpack: async (_f, d) => (fs.mkdirSync(d, { recursive: true }), fs.writeFileSync(path.join(d, "Microsoft.Xna.Framework.dll"), "x")) });
			await assert.rejects(run(dir, zipSpec(), { fetchImpl: fetchBoth().fetchImpl, msi: stand }), /XnaNative\.dll/);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses an image that holds a link", async () => {
		const dir = tmp();
		try {
			const stand = msi({
				unpack: async (_f, d) => {
					fs.mkdirSync(d, { recursive: true });
					try {
						fs.symlinkSync(os.tmpdir(), path.join(d, "link"), "junction");
					} catch {
						throw new WebInstallRefused("The installer file contained a link, so it was not used.");
					}
				},
			});
			await assert.rejects(run(dir, zipSpec(), { fetchImpl: fetchBoth().fetchImpl, msi: stand }), WebInstallRefused);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses an extra whose address is off its hosts, and a redirect that leaves them", async () => {
		const dir = tmp();
		try {
			assert.throws(() => checkWebSpec(zipSpec([extra({ url: "https://evil.example/xna.msi" })])), /url/);
			const fetchImpl = async (url) => {
				const res = new Response(String(url) === EXTRA_URL ? msiBody : body, { status: 200 });
				Object.defineProperty(res, "url", { value: String(url) === EXTRA_URL ? "https://evil.example/xna.msi" : String(url) });
				return res;
			};
			await assert.rejects(run(dir, zipSpec(), { fetchImpl, msi: msi() }), /redirected/);
		} finally {
			cleanup(dir);
		}
	});

	it("refuses a malformed extra: no pinned checksum or size, a folder that leaves the server's, or an unknown kind", () => {
		for (const bad of [
			extra({ sha256: undefined }),
			extra({ sha256: "ABC" }),
			extra({ bytes: 0 }),
			extra({ bytes: 500 * 1024 * 1024 }),
			extra({ signer: "" }),
			extra({ into: "..\\evil" }),
			extra({ into: "C:\\Windows" }),
			extra({ kind: "exe" }),
			extra({ pick: "*.dll" }),
			extra({ hosts: [] }),
		]) {
			assert.throws(() => checkWebSpec(zipSpec([bad])), undefined, JSON.stringify(bad));
		}
	});

	it("installs nothing from the extras when the main download is refused first", async () => {
		const dir = tmp();
		const stand = msi();
		try {
			const { fetchImpl, calls } = fetchBoth();
			await assert.rejects(run(dir, zipSpec(), { fetchImpl, msi: stand, archive: { list: async () => ["../evil.exe"], extract: async () => {} } }), WebInstallRefused);
			assert.equal(calls.includes(EXTRA_URL), false);
		} finally {
			cleanup(dir);
		}
	});

	it("logs each step in plain words, including that nothing is installed on the PC", async () => {
		const dir = tmp();
		try {
			const lines = [];
			await run(dir, zipSpec(), { fetchImpl: fetchBoth().fetchImpl, msi: msi(), log: (l) => lines.push(l) });
			const text = lines.join("\n");
			assert.match(text, /XNA Framework 4\.0/);
			assert.match(text, /signature is valid/i);
			assert.match(text, /Nothing was installed on this PC/);
		} finally {
			cleanup(dir);
		}
	});
});

describe("test stand-ins", () => {
	it("a spec's own fetch can be replaced for every install through webDeps", async () => {
		const dir = tmp();
		try {
			const { fetchImpl, calls } = fakeFetch();
			webDeps.fetchImpl = fetchImpl;
			await installWebDownload(spec(), dir);
			assert.equal(calls.length, 1);
		} finally {
			delete webDeps.fetchImpl;
			cleanup(dir);
		}
	});
});

describe("the Mojang server jar", () => {
	const manifest = {
		latest: { release: "26.3" },
		versions: [
			{ id: "26.3", type: "release", url: "https://piston-meta.mojang.com/v1/packages/aaa/26.3.json" },
			{ id: "1.21.11", type: "release", url: "https://piston-meta.mojang.com/v1/packages/bbb/1.21.11.json" },
			{ id: "1.99", type: "snapshot", url: "https://piston-meta.mojang.com/v1/packages/ccc/s.json" },
		],
	};
	const detail = { javaVersion: { majorVersion: 21 }, downloads: { server: { url: "https://piston-data.mojang.com/v1/objects/ddd/server.jar", sha1: "d".repeat(40), size: 1234 } } };
	const fetchJson = async (url) => {
		if (url.endsWith("version_manifest_v2.json")) return new Response(JSON.stringify(manifest));
		if (url.endsWith("/1.21.11.json")) return new Response(JSON.stringify(detail));
		return new Response("nope", { status: 404 });
	};

	it("looks up the pinned version and hands back the jar's address, size and SHA-1", async () => {
		const found = await mojangServerJar("1.21.11")({ fetchImpl: fetchJson });
		assert.deepEqual(found, { url: detail.downloads.server.url, bytes: 1234, sha1: "d".repeat(40), version: "1.21.11", javaMajor: 21 });
	});

	it("refuses a version that is not a release in the manifest", async () => {
		await assert.rejects(mojangServerJar("1.99")({ fetchImpl: fetchJson }), /release/);
		await assert.rejects(mojangServerJar("0.0.0")({ fetchImpl: fetchJson }), /release/);
	});

	it("refuses a version number that could be an address or a path", async () => {
		assert.throws(() => mojangServerJar("../../x"), /version/);
	});

	it("is only allowed to reach Mojang's hosts", () => {
		assert.deepEqual(mojangServerJar.hosts, ["piston-meta.mojang.com", "piston-data.mojang.com", "launchermeta.mojang.com"]);
	});
});

describe("the Terraria server zip", () => {
	it("builds the address from the version and publishes no checksum", async () => {
		const found = await terrariaServerZip("1.4.5.8")({
			fetchImpl: async (url, init) => {
				assert.equal(init.method, "HEAD");
				assert.equal(url, "https://terraria.org/api/download/pc-dedicated-server/terraria-server-1458.zip");
				return new Response(null, { status: 200, headers: { "Content-Length": "46415317", "Content-Type": "application/zip" } });
			},
		});
		assert.deepEqual(found, { url: "https://terraria.org/api/download/pc-dedicated-server/terraria-server-1458.zip", bytes: 46415317, sha1: null, sha256: null, version: "1.4.5.8" });
	});

	it("refuses a version that is not four numbers", () => {
		for (const bad of ["1.4.5", "1.4.5.8.1", "a.b.c.d", "../1", ""]) assert.throws(() => terrariaServerZip(bad), /version/, bad);
	});

	it("refuses an answer with no size", async () => {
		await assert.rejects(terrariaServerZip("1.4.5.8")({ fetchImpl: async () => new Response(null, { status: 200 }) }), /size/);
	});
});

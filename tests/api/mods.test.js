import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import AdmZip from "adm-zip";
import { startInstance, freePort, sleep, serverEntry } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";
import { createZip } from "../../src/server/util/tarZip.js";
import { parseThunderstoreRef } from "../../src/server/services/modService.js";

// Mods: dropping them into the folders games read, turning them off, removing them,
// Steam Workshop and Thunderstore for the games that use them, mod numbers in ARK's
// start script. Nothing untrusted gets to write outside the mods folder.

async function until(check, { timeoutMs = 60_000, everyMs = 400 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

const tmp = (label) => fs.mkdtempSync(path.join(os.tmpdir(), `gp-modtest-${label}-`));

/** A zip whose files are given as { "path/inside": "text" }. */
async function makeZip(files) {
	const stage = tmp("stage");
	for (const [name, text] of Object.entries(files)) {
		fs.mkdirSync(path.dirname(path.join(stage, name)), { recursive: true });
		fs.writeFileSync(path.join(stage, name), text);
	}
	const out = path.join(tmp("zip"), "made.zip");
	await createZip(out, fs.readdirSync(stage).map((name) => ({ dir: stage, name })));
	return fs.readFileSync(out);
}

/**
 * A zip with exactly the entry names given, unchecked: real archive tools refuse to
 * write a name like "../x", which is what makes one worth testing against.
 */
function rawZip(entries) {
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const [name, text] of Object.entries(entries)) {
		const data = Buffer.from(text);
		const nameBytes = Buffer.from(name);
		const crc = zlib.crc32(data);
		const local = Buffer.alloc(30 + nameBytes.length);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nameBytes.length, 26);
		nameBytes.copy(local, 30);
		const central = Buffer.alloc(46 + nameBytes.length);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt32LE(crc, 16);
		central.writeUInt32LE(data.length, 20);
		central.writeUInt32LE(data.length, 24);
		central.writeUInt16LE(nameBytes.length, 28);
		central.writeUInt32LE(offset, 42);
		nameBytes.copy(central, 46);
		locals.push(local, data);
		centrals.push(central);
		offset += local.length + data.length;
	}
	const directory = Buffer.concat(centrals);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(centrals.length, 8);
	end.writeUInt16LE(centrals.length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, directory, end]);
}

describe("reading a Thunderstore package name", () => {
	it("takes names, versions and page addresses, and refuses the rest", () => {
		assert.deepEqual(parseThunderstoreRef("Smoothbrain-Jewelcrafting"), { owner: "Smoothbrain", name: "Jewelcrafting", version: null });
		assert.deepEqual(parseThunderstoreRef("Smoothbrain-Jewelcrafting-1.2.3"), { owner: "Smoothbrain", name: "Jewelcrafting", version: "1.2.3" });
		assert.deepEqual(parseThunderstoreRef("https://thunderstore.io/c/valheim/p/RandyKnapp/EpicLoot/"), { owner: "RandyKnapp", name: "EpicLoot", version: null });
		for (const bad of ["", "nohyphen", "../../etc-passwd", "a-b-c-d", "http://evil.test/x"]) assert.throws(() => parseThunderstoreRef(bad), /Owner-Name/, bad);
	});
});

describe("mods", () => {
	let panel;
	let api;
	let dirs;
	let store;
	let storeRequests;
	let zips;
	// A mod a stand-in GitHub release ships. Its digest is in the release listing, so the install is checked and not unverified.
	const lockBytes = Buffer.from("a mod the panel fetches from a GitHub release");
	const lockSha256 = crypto.createHash("sha256").update(lockBytes).digest("hex");
	// The stand-in's release can be changed between calls, so an update has a newer version to find. `download` false makes its file 404.
	const release = { tag: "v1.0.0", bytes: lockBytes, sha: lockSha256, download: true };
	// Two mods that both need one shared library, answered by the stand-in as Modrinth projects.
	const sharedBytes = Buffer.from("a library two mods need");
	const modABytes = Buffer.from("mod a");
	const modBBytes = Buffer.from("mod b");
	const MODRINTH = {
		"shared-lib": { title: "Shared Lib", bytes: sharedBytes, file: "SharedLib.jar", deps: [] },
		"mod-a": { title: "Mod A", bytes: modABytes, file: "ModA.jar", deps: [{ dependency_type: "required", project_id: "shared-lib" }] },
		"mod-b": { title: "Mod B", bytes: modBBytes, file: "ModB.jar", deps: [{ dependency_type: "required", project_id: "shared-lib" }] },
	};
	/** Modrinth's project and version answers for the mods above, with the stand-in's own download addresses. Null for any other path. */
	function modrinthAnswer(p, base) {
		const m = /^\/v2\/project\/([a-z-]+)(\/version)?$/.exec(p);
		const mod = m && MODRINTH[m[1]];
		if (!mod) return null;
		if (!m[2]) return { title: mod.title, client_side: "required", server_side: "required" };
		const sha512 = crypto.createHash("sha512").update(mod.bytes).digest("hex");
		return [{ version_number: "1.0.0", version_type: "release", date_published: "2026-01-01T00:00:00Z", files: [{ url: `${base}/dl/${mod.file}`, filename: mod.file, size: mod.bytes.length, primary: true, hashes: { sha512 } }], dependencies: mod.deps }];
	}

	const enc = encodeURIComponent;
	const upload = (name, fileName, bytes) => api.upload(`/api/server/${enc(name)}/mods/upload`, "mod", fileName, bytes);
	const list = async (name) => (await api.get(`/api/server/${enc(name)}/mods`)).json;
	const post = (name, sub, body) => api.post(`/api/server/${enc(name)}/mods/${sub}`, body);

	before(async () => {
		zips = {
			framework: await makeZip({ "BepInExPack_Valheim/winhttp.dll": "doorstop", "BepInExPack_Valheim/BepInEx/core/BepInEx.dll": "core", "BepInExPack_Valheim/manifest.json": "{}" }),
			dep: await makeZip({ "Dep.dll": "dependency dll", "manifest.json": "{}" }),
			mod: await makeZip({ "Mod.dll": "mod dll", "manifest.json": "{}" }),
		};
		const port = await freePort();
		storeRequests = [];
		store = http.createServer((req, res) => {
			storeRequests.push(req.url);
			const url = `http://127.0.0.1:${port}`;
			const pkg = (owner, name, dependencies = []) => ({ latest: { version_number: "1.0.0", download_url: `${url}/zip/${owner}-${name}.zip`, dependencies }, versions: [{ version_number: "1.0.0", download_url: `${url}/zip/${owner}-${name}.zip`, dependencies }] });
			const routes = {
				"/api/experimental/package/denikson/BepInExPack_Valheim/": pkg("denikson", "BepInExPack_Valheim"),
				"/api/experimental/package/Someone/Dep/": pkg("Someone", "Dep"),
				"/api/experimental/package/Someone/Mod/": pkg("Someone", "Mod", ["Someone-Dep-1.0.0", "denikson-BepInExPack_Valheim-5.4.2202"]),
			};
			if (routes[req.url]) {
				res.setHeader("Content-Type", "application/json");
				return res.end(JSON.stringify(routes[req.url]));
			}
			// The GitHub API and the release's download, on the same stand-in (GHP_GITHUB_API points here).
			if (req.url === "/repos/acme/lockmod/releases/latest") {
				res.setHeader("Content-Type", "application/json");
				return res.end(JSON.stringify({ tag_name: release.tag, draft: false, prerelease: false, assets: [{ name: "lock-mod.jar", browser_download_url: `${url}/dl/lock-mod.jar`, size: release.bytes.length, digest: `sha256:${release.sha}` }] }));
			}
			if (req.url === "/dl/lock-mod.jar") {
				if (!release.download) {
					res.statusCode = 404;
					return res.end();
				}
				return res.end(release.bytes);
			}
			const modrinth = modrinthAnswer(req.url.split("?")[0], url);
			if (modrinth) {
				res.setHeader("Content-Type", "application/json");
				return res.end(JSON.stringify(modrinth));
			}
			const map = { "/zip/denikson-BepInExPack_Valheim.zip": zips.framework, "/zip/Someone-Dep.zip": zips.dep, "/zip/Someone-Mod.zip": zips.mod, "/dl/SharedLib.jar": sharedBytes, "/dl/ModA.jar": modABytes, "/dl/ModB.jar": modBBytes };
			if (map[req.url]) return res.end(map[req.url]);
			res.statusCode = 404;
			res.end();
		});
		await new Promise((r) => store.listen(port, "127.0.0.1", r));

		dirs = {};
		const free = await freePort();
		panel = await startInstance({
			// The loopback hook lets the stand-in on this machine answer for GitHub and Thunderstore; every other check still applies.
			env: { GHP_THUNDERSTORE_API: `http://127.0.0.1:${port}`, GHP_GITHUB_API: `http://127.0.0.1:${port}`, GHP_MODRINTH_API: `http://127.0.0.1:${port}/v2`, GHP_MODSOURCE_ALLOW_LOOPBACK: "1" },
			servers: (dir) => {
				const at = (key) => (dirs[key] = path.join(dir, key));
				const arkScript = path.join(at("ark-ase"), "Start_Map.bat");
				fs.mkdirSync(dirs["ark-ase"], { recursive: true });
				fs.writeFileSync(arkScript, '@echo off\r\nstart /MIN "Map" ShooterGameServer.exe TheIsland?listen?SessionName=x?MaxPlayers=10 -RCONPort=1 -Port=2 -QueryPort=3 -server -log\r\n');
				const asaScript = path.join(at("ark-asa"), "Start_Map.bat");
				fs.mkdirSync(dirs["ark-asa"], { recursive: true });
				fs.writeFileSync(asaScript, '@echo off\r\nstart /MIN "Map" ArkAscendedServer.exe TheIsland_WP?SessionName=x?MaxPlayers=10 -RCONPort=1 -Port=2 -QueryPort=3 -server -log\r\n');
				return [
					serverEntry(dir, { name: "Minecraft", type: "minecraft", installDir: at("mc"), workingDir: dirs.mc, processName: "java-none.exe" }),
					serverEntry(dir, { name: "Seven", type: "7days", installDir: at("7d"), workingDir: dirs["7d"], processName: "seven-none.exe" }),
					serverEntry(dir, { name: "Valheim", type: "valheim", installDir: at("valheim"), workingDir: dirs.valheim, processName: "valheim-none.exe" }),
					serverEntry(dir, { name: "Ark Evolved", type: "ark", updateAppId: "376030", installDir: dirs["ark-ase"], workingDir: dirs["ark-ase"], startScriptPath: arkScript, processName: "ase-none.exe" }),
					serverEntry(dir, { name: "Ark Ascended", type: "ark", updateAppId: "2430930", installDir: dirs["ark-asa"], workingDir: dirs["ark-asa"], startScriptPath: asaScript, processName: "asa-none.exe" }),
					serverEntry(dir, { name: "Shooter", type: "enshrouded", installDir: at("ens"), workingDir: dirs.ens, processName: "ens-none.exe" }),
					{ ...makeFakeGame(at("conan"), { name: "Conan Mods", rconPort: free, exe: "gp-fake-mods.exe" }) },
				];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(dirs.conan);
		await panel.stop();
		await new Promise((r) => store.close(r));
	});

	// Waits until the game is really off, so the next test's start is not mistaken for the old process still going down.
	const stopConan = async () => {
		await api.post("/api/control/Conan%20Mods/stop");
		assert.equal(await until(async () => (await api.get("/api/status")).json["Conan Mods"]?.online !== true), true);
	};

	it("says which games have mod support, and what kind", async () => {
		assert.equal((await list("Minecraft")).adapter, "folder");
		assert.equal((await list("Conan Mods")).adapter, "workshop");
		assert.equal((await list("Valheim")).adapter, "thunderstore");
		assert.equal((await list("Ark Evolved")).adapter, "script-ids");
		const none = await list("Shooter");
		assert.equal(none.supported, false);
		assert.deepEqual(none.mods, []);
	});

	describe("a folder of mods (Minecraft, 7 Days to Die)", () => {
		it("adds a jar, lists it, turns it off and on, and removes it", async () => {
			const r = await upload("Minecraft", "cool-mod-1.0.jar", Buffer.from("jar bytes"));
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.ok(fs.existsSync(path.join(dirs.mc, "mods", "cool-mod-1.0.jar")));
			let l = await list("Minecraft");
			assert.equal(l.mods.length, 1);
			assert.equal(l.mods[0].enabled, true);
			assert.equal(l.mods[0].sizeBytes, 9);

			assert.equal((await api.put("/api/server/Minecraft/mods/enabled", { id: "cool-mod-1.0.jar", enabled: false })).status, 200);
			assert.ok(fs.existsSync(path.join(dirs.mc, "mods", "cool-mod-1.0.jar.disabled")));
			l = await list("Minecraft");
			assert.equal(l.mods[0].enabled, false);
			assert.equal(l.mods[0].name, "cool-mod-1.0.jar");
			assert.equal((await api.put("/api/server/Minecraft/mods/enabled", { id: l.mods[0].id, enabled: true })).status, 200);
			assert.ok(fs.existsSync(path.join(dirs.mc, "mods", "cool-mod-1.0.jar")));

			assert.equal((await post("Minecraft", "remove", { id: "cool-mod-1.0.jar" })).status, 200);
			assert.equal((await list("Minecraft")).mods.length, 0);
			assert.equal((await post("Minecraft", "remove", { id: "cool-mod-1.0.jar" })).status, 404);
		});

		it("only takes the kinds of file the game uses, with sensible names", async () => {
			const wrong = await upload("Minecraft", "notes.txt", Buffer.from("x"));
			assert.equal(wrong.status, 400);
			assert.equal(wrong.json.code, "wrong_type");
			assert.equal((await upload("Minecraft", "..jar", Buffer.from("x"))).status, 400);
			assert.equal((await upload("Minecraft", "bad name!.jar", Buffer.from("x"))).status, 400);
			assert.equal((await api.upload("/api/server/Minecraft/mods/upload", "wrongfield", "a.jar", Buffer.from("x"))).status, 400);
			assert.equal((await post("Minecraft", "remove", { id: "..\\..\\x" })).status, 400);
			assert.equal((await post("Minecraft", "remove", { id: "..%2Fx" })).status, 400);
		});

		it("unpacks a mod archive into its own folder, whichever way it is packed", async () => {
			const wrapped = await makeZip({ "CoolMod/ModInfo.xml": "<xml/>", "CoolMod/Config/a.xml": "<a/>" });
			assert.equal((await upload("Seven", "CoolMod.zip", wrapped)).status, 200);
			assert.ok(fs.existsSync(path.join(dirs["7d"], "Mods", "CoolMod", "ModInfo.xml")));
			assert.ok(fs.existsSync(path.join(dirs["7d"], "Mods", "CoolMod", "Config", "a.xml")));

			const loose = await makeZip({ "ModInfo.xml": "<xml/>", "readme.txt": "hi" });
			assert.equal((await upload("Seven", "Loose Mod.zip", loose)).status, 200);
			assert.ok(fs.existsSync(path.join(dirs["7d"], "Mods", "Loose Mod", "ModInfo.xml")));

			const again = await upload("Seven", "CoolMod.zip", wrapped);
			assert.equal(again.status, 409);
			assert.equal(again.json.code, "already_installed");
			const l = await list("Seven");
			assert.deepEqual(l.mods.map((m) => m.name), ["CoolMod", "Loose Mod"]);
			assert.equal(l.mods[0].type, "folder");
			assert.ok(l.mods[0].sizeBytes > 0);
		});

		it("refuses an archive that tries to write outside the mods folder", async () => {
			const r = await upload("Seven", "Evil.zip", rawZip({ "../escaped.txt": "gotcha", "fine.txt": "ok" }));
			assert.equal(r.status, 400, JSON.stringify(r.json));
			assert.equal(r.json.code, "unsafe_archive");
			assert.equal((await upload("Seven", "Evil2.zip", rawZip({ "C:/Windows/evil.txt": "x" }))).status, 400);
			assert.equal((await upload("Seven", "Fine.zip", rawZip({ "Fine/ModInfo.xml": "<x/>" }))).status, 200, "and the helper itself makes good zips");
			assert.equal(fs.existsSync(path.join(dirs["7d"], "escaped.txt")), false);
			assert.equal(fs.existsSync(path.join(dirs["7d"], "Mods", "escaped.txt")), false);
			assert.equal((await upload("Seven", "NotAZip.zip", Buffer.from("this is not a zip"))).status, 400);
		});
	});

	describe("Conan Exiles", () => {
		const mods = () => path.join(dirs.conan, "ConanSandbox", "Mods");
		const modlist = () => fs.readFileSync(path.join(mods(), "modlist.txt"), "utf8").split(/\r?\n/).filter(Boolean);

		it("adds a pak and keeps modlist.txt for you", async () => {
			assert.equal((await upload("Conan Mods", "Cool.pak", Buffer.from("pak"))).status, 200);
			assert.equal((await upload("Conan Mods", "Other.pak", Buffer.from("pak2"))).status, 200);
			assert.deepEqual(modlist(), ["*Cool.pak", "*Other.pak"]);
			const l = await list("Conan Mods");
			assert.deepEqual(l.mods.map((m) => [m.name, m.enabled]), [["Cool.pak", true], ["Other.pak", true]]);
		});

		it("turns one off by taking it out of the list, and keeps the file", async () => {
			await api.put("/api/server/Conan%20Mods/mods/enabled", { id: "Cool.pak", enabled: false });
			assert.deepEqual(modlist(), ["*Other.pak"]);
			assert.ok(fs.existsSync(path.join(mods(), "Cool.pak")));
			assert.equal((await list("Conan Mods")).mods.find((m) => m.name === "Cool.pak").enabled, false);
			await api.put("/api/server/Conan%20Mods/mods/enabled", { id: "Cool.pak", enabled: true });
			assert.deepEqual(modlist().sort(), ["*Cool.pak", "*Other.pak"]);
		});

		it("shows a listed mod whose file is missing, and removes cleanly", async () => {
			fs.appendFileSync(path.join(mods(), "modlist.txt"), "Ghost.pak\r\n");
			const l = await list("Conan Mods");
			assert.equal(l.mods.find((m) => m.name === "Ghost.pak").missing, true);
			await post("Conan Mods", "remove", { id: "Ghost.pak" });
			await post("Conan Mods", "remove", { id: "Cool.pak" });
			assert.deepEqual(modlist(), ["*Other.pak"]);
			assert.equal(fs.existsSync(path.join(mods(), "Cool.pak")), false);
		});

		it("checks a Workshop number before trying, and says so when SteamCMD isn't there", async () => {
			assert.equal((await post("Conan Mods", "workshop", { id: "abc" })).json.code, "bad_id");
			const r = await post("Conan Mods", "workshop", { id: "1234567890" });
			assert.equal(r.status, 400);
			assert.equal(r.json.code, "no_steamcmd");
			assert.equal((await post("Minecraft", "workshop", { id: "1234567890" })).json.code, "unsupported");
		});

		it("won't change mods while the server is running", async () => {
			await api.post("/api/control/Conan%20Mods/start");
			assert.equal(await until(async () => (await api.get("/api/status")).json["Conan Mods"]?.online === true), true);
			await until(async () => !(await api.get("/api/operations")).json["Conan Mods"]);
			for (const r of [await upload("Conan Mods", "New.pak", Buffer.from("x")), await post("Conan Mods", "remove", { id: "Other.pak" })]) {
				assert.equal(r.status, 409);
				assert.equal(r.json.code, "server_running");
			}
			assert.equal((await list("Conan Mods")).mods.length, 1, "it can still be looked at");
			await stopConan();
		});
	});

	describe("Valheim and Thunderstore", () => {
		it("installs BepInEx if it is missing, then the mod, with what it depends on", async () => {
			assert.equal((await list("Valheim")).frameworkInstalled, false);
			const r = await post("Valheim", "thunderstore", { package: "Someone-Mod" });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.deepEqual(r.json.installed, ["denikson-BepInExPack_Valheim 1.0.0", "Someone-Dep 1.0.0", "Someone-Mod 1.0.0"]);
			assert.ok(fs.existsSync(path.join(dirs.valheim, "winhttp.dll")), "BepInEx's contents sit next to the server");
			assert.ok(fs.existsSync(path.join(dirs.valheim, "BepInEx", "core", "BepInEx.dll")));
			assert.equal(fs.existsSync(path.join(dirs.valheim, "manifest.json")), false, "but not the pack's own paperwork");
			assert.ok(fs.existsSync(path.join(dirs.valheim, "BepInEx", "plugins", "Someone-Mod", "Mod.dll")));
			assert.ok(fs.existsSync(path.join(dirs.valheim, "BepInEx", "plugins", "Someone-Dep", "Dep.dll")));
			const l = await list("Valheim");
			assert.equal(l.frameworkInstalled, true);
			assert.deepEqual(l.mods.map((m) => m.name), ["Someone-Dep", "Someone-Mod"]);
		});

		it("doesn't fetch BepInEx again, and can reinstall a mod in place", async () => {
			storeRequests.length = 0;
			assert.equal((await post("Valheim", "thunderstore", { package: "Someone-Mod" })).status, 200);
			assert.equal(storeRequests.some((u) => u.includes("BepInExPack")), false);
			assert.equal((await list("Valheim")).mods.length, 2);
		});

		it("says so when a package doesn't exist or isn't a package", async () => {
			assert.equal((await post("Valheim", "thunderstore", { package: "Nobody-Nothing" })).status, 404);
			assert.equal((await post("Valheim", "thunderstore", { package: "nope" })).status, 400);
			assert.equal((await post("Minecraft", "thunderstore", { package: "Someone-Mod" })).json.code, "unsupported");
		});

		it("lets a plugin be turned off and removed", async () => {
			await api.put("/api/server/Valheim/mods/enabled", { id: "Someone-Dep", enabled: false });
			assert.ok(fs.existsSync(path.join(dirs.valheim, "BepInEx", "plugins", "Someone-Dep.disabled", "Dep.dll")));
			await post("Valheim", "remove", { id: "Someone-Dep.disabled" });
			assert.equal(fs.existsSync(path.join(dirs.valheim, "BepInEx", "plugins", "Someone-Dep.disabled")), false);
		});
	});

	describe("ARK's mod numbers", () => {
		const script = (key) => fs.readFileSync(path.join(dirs[key], "Start_Map.bat"), "utf8");

		it("Survival Evolved: adds and removes ids in GameModIds, with -automanagedmods", async () => {
			assert.deepEqual((await list("Ark Evolved")).mods, []);
			assert.equal((await post("Ark Evolved", "script-id", { id: "731604991" })).status, 200);
			assert.equal((await post("Ark Evolved", "script-id", { id: "889745138" })).status, 200);
			assert.equal((await post("Ark Evolved", "script-id", { id: "731604991" })).status, 200, "adding twice changes nothing");
			let s = script("ark-ase");
			assert.match(s, /TheIsland\?listen\?GameModIds=731604991,889745138\?SessionName=x\?MaxPlayers=10/);
			assert.match(s, /ShooterGameServer\.exe TheIsland\S* -automanagedmods /);
			assert.match(s, /-RCONPort=1 -Port=2 -QueryPort=3 -server -log/, "the rest of the line is untouched");
			assert.deepEqual((await list("Ark Evolved")).mods.map((m) => m.id), ["731604991", "889745138"]);

			await post("Ark Evolved", "remove", { id: "731604991" });
			assert.match(script("ark-ase"), /GameModIds=889745138\?/);
			await post("Ark Evolved", "remove", { id: "889745138" });
			s = script("ark-ase");
			assert.doesNotMatch(s, /GameModIds|automanagedmods/);
			assert.ok(fs.existsSync(path.join(dirs["ark-ase"], "Start_Map.bat.bak")), "with a backup of the script");
		});

		it("Survival Ascended: the -mods flag", async () => {
			await post("Ark Ascended", "script-id", { id: "930404" });
			await post("Ark Ascended", "script-id", { id: "931999" });
			assert.match(script("ark-asa"), /-log -mods=930404,931999\r?\n/);
			await post("Ark Ascended", "remove", { id: "930404" });
			assert.match(script("ark-asa"), / -mods=931999\r?\n/);
			await post("Ark Ascended", "remove", { id: "931999" });
			assert.doesNotMatch(script("ark-asa"), /-mods=/);
		});

		it("refuses anything that isn't a mod number", async () => {
			assert.equal((await post("Ark Evolved", "script-id", { id: "1; calc" })).status, 400);
			assert.equal((await post("Ark Evolved", "script-id", { id: "12" })).status, 400);
		});
	});

	describe("the one-box install and the mod lock", () => {
		const install = (name, input, extra = {}) => post(name, "install", { input, ...extra });
		const lockOf = async (name) => (await api.get(`/api/server/${enc(name)}/mods/lock`)).json;
		// No error body may show where the panel keeps its files.
		const noPanelPaths = (body) => {
			const text = JSON.stringify(body);
			assert.equal(text.includes(JSON.stringify(panel.dir).slice(1, -1)), false, text);
			assert.doesNotMatch(text, /[A-Za-z]:\\\\|\/home\//, text);
		};

		it("refuses what it can't read, and says which sources the game takes", async () => {
			const r = await install("Minecraft", "not a link at all!");
			assert.equal(r.status, 400);
			assert.equal(r.json.code, "unrecognised");
			assert.equal(r.json.error, "I don't recognise that link.");
			assert.ok(Array.isArray(r.json.accepted));
			assert.ok(r.json.accepted.includes("GitHub releases"), JSON.stringify(r.json.accepted));
			noPanelPaths(r.json);
		});

		it("refuses an empty or over-long input before it looks at it", async () => {
			assert.equal((await install("Minecraft", "   ")).json.code, "bad_input");
			assert.equal((await install("Minecraft", "x".repeat(2001))).json.code, "bad_input");
			assert.equal((await post("Minecraft", "install", { input: 42 })).json.code, "bad_input");
		});

		it("refuses a source the game doesn't take, and names the ones it does", async () => {
			const r = await install("Minecraft", "1234567890");
			assert.equal(r.status, 400);
			assert.equal(r.json.code, "source_not_supported");
			assert.ok(Array.isArray(r.json.accepted));
			noPanelPaths(r.json);
		});

		it("installs from a GitHub release, and records what it put in the folder", async () => {
			const r = await install("Minecraft", "https://github.com/acme/lockmod");
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.deepEqual(r.json, { success: true, installed: ["lock-mod.jar"], unverified: [], skipped: [] });
			assert.ok(fs.existsSync(path.join(dirs.mc, "mods", "lock-mod.jar")));

			const l = await lockOf("Minecraft");
			assert.equal(l.entries.length, 1);
			assert.equal(l.entries[0].id, "github:acme/lockmod");
			assert.deepEqual(l.entries[0].names, ["lock-mod.jar"]);
			assert.deepEqual(l.entries[0].files, [{ path: "lock-mod.jar", sha256: lockSha256 }]);
			assert.equal(l.entries[0].version, "v1.0.0");
			assert.deepEqual(l.drift, { changed: [], missing: [], untracked: [] });
			assert.deepEqual(l.orphans, []);
		});

		it("shows a file changed by hand, and one that is gone, as drift", async () => {
			const jar = path.join(dirs.mc, "mods", "lock-mod.jar");
			fs.writeFileSync(jar, "edited by hand");
			assert.deepEqual((await lockOf("Minecraft")).drift.changed, [{ id: "github:acme/lockmod", path: "lock-mod.jar" }]);
			fs.writeFileSync(path.join(dirs.mc, "mods", "stray.jar"), "not from the panel");
			assert.deepEqual((await lockOf("Minecraft")).drift.untracked, ["stray.jar"]);
			fs.rmSync(path.join(dirs.mc, "mods", "stray.jar"));
			fs.writeFileSync(jar, lockBytes);
			assert.deepEqual((await lockOf("Minecraft")).drift, { changed: [], missing: [], untracked: [] });
			fs.rmSync(jar);
			assert.deepEqual((await lockOf("Minecraft")).drift.missing, [{ id: "github:acme/lockmod", path: "lock-mod.jar" }]);
			fs.writeFileSync(jar, lockBytes);
		});

		it("won't install while the server is running", async () => {
			await api.post("/api/control/Conan%20Mods/start");
			assert.equal(await until(async () => (await api.get("/api/status")).json["Conan Mods"]?.online === true), true);
			await until(async () => !(await api.get("/api/operations")).json["Conan Mods"]);
			const r = await install("Conan Mods", "https://example.com/a.jar");
			assert.equal(r.status, 409);
			assert.equal(r.json.code, "server_running");
			await stopConan();
		});

		it("removing a mod takes its record out of the lock", async () => {
			assert.equal((await post("Minecraft", "remove", { id: "lock-mod.jar" })).status, 200);
			assert.equal(fs.existsSync(path.join(dirs.mc, "mods", "lock-mod.jar")), false);
			assert.deepEqual((await lockOf("Minecraft")).entries, []);
		});

		it("takes the files back out when the record can't be written", async () => {
			// A folder where the lock file should be makes every write to it fail.
			const key = crypto.createHash("sha256").update("Minecraft").digest("hex").slice(0, 24);
			const blocker = path.join(panel.dir, "modlocks", `${key}.json`);
			fs.rmSync(blocker, { force: true, recursive: true });
			fs.mkdirSync(blocker, { recursive: true });
			try {
				const r = await install("Minecraft", "https://github.com/acme/lockmod");
				assert.equal(r.status, 500, JSON.stringify(r.json));
				assert.equal(r.json.code, "install_failed");
				noPanelPaths(r.json);
				assert.equal(fs.existsSync(path.join(dirs.mc, "mods", "lock-mod.jar")), false);
			} finally {
				fs.rmSync(blocker, { force: true, recursive: true });
			}
		});
	});

	describe("updating a mod from its GitHub release", () => {
		const v2Bytes = Buffer.from("the same mod, version two, from the same release");
		const v2Sha = crypto.createHash("sha256").update(v2Bytes).digest("hex");
		const installGh = (name) => post(name, "install", { input: "https://github.com/acme/lockmod" });
		const lockOf = async (name) => (await api.get(`/api/server/${enc(name)}/mods/lock`)).json;
		const updatesOf = async (name) => (await api.get(`/api/server/${enc(name)}/mods/updates`)).json;
		const jar = () => path.join(dirs.mc, "mods", "lock-mod.jar");
		const noPanelPaths = (body) => {
			const text = JSON.stringify(body);
			assert.equal(text.includes(JSON.stringify(panel.dir).slice(1, -1)), false, text);
			assert.doesNotMatch(text, /[A-Za-z]:\\\\|\/home\//, text);
		};

		it("installs v1, then finds v2 once the release has it, and changes nothing while it looks", async () => {
			const r = await installGh("Minecraft");
			assert.equal(r.status, 200, JSON.stringify(r.json));
			release.tag = "v2.0.0";
			release.bytes = v2Bytes;
			release.sha = v2Sha;
			const { updates } = await updatesOf("Minecraft");
			assert.deepEqual(updates, [{ id: "github:acme/lockmod", name: "lock-mod.jar", source: "github", ref: "acme/lockmod", current: "v1.0.0", latest: "v2.0.0", status: "update", dependency: false }]);
			assert.deepEqual(fs.readFileSync(jar()), lockBytes);
		});

		it("a download that fails leaves the v1 file and the lock as they were, and shows no panel path", async () => {
			release.download = false;
			try {
				const r = await post("Minecraft", "update", { id: "github:acme/lockmod" });
				assert.ok(r.status >= 400, JSON.stringify(r.json));
				noPanelPaths(r.json);
			} finally {
				release.download = true;
			}
			assert.deepEqual(fs.readFileSync(jar()), lockBytes);
			const l = await lockOf("Minecraft");
			assert.equal(l.entries[0].version, "v1.0.0");
			assert.deepEqual(l.entries[0].files, [{ path: "lock-mod.jar", sha256: lockSha256 }]);
			assert.deepEqual(l.drift, { changed: [], missing: [], untracked: [] });
		});

		it("won't update while the game runs, but the check still works", async () => {
			await api.post("/api/control/Conan%20Mods/start");
			assert.equal(await until(async () => (await api.get("/api/status")).json["Conan Mods"]?.online === true), true);
			await until(async () => !(await api.get("/api/operations")).json["Conan Mods"]);
			const r = await post("Conan Mods", "update", { id: "github:acme/lockmod" });
			assert.equal(r.status, 409);
			assert.equal(r.json.code, "server_running");
			assert.equal((await api.get("/api/server/Conan%20Mods/mods/updates")).status, 200);
			await stopConan();
		});

		it("updates to v2: the file and the lock change, and the check then says current", async () => {
			const r = await post("Minecraft", "update", { id: "github:acme/lockmod" });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.deepEqual(r.json.updated, { id: "github:acme/lockmod", from: "v1.0.0", to: "v2.0.0" });
			assert.deepEqual(r.json.installed, ["lock-mod.jar"]);
			assert.deepEqual(fs.readFileSync(jar()), v2Bytes);
			const l = await lockOf("Minecraft");
			assert.equal(l.entries.length, 1);
			assert.equal(l.entries[0].version, "v2.0.0");
			assert.deepEqual(l.entries[0].files, [{ path: "lock-mod.jar", sha256: v2Sha }]);
			assert.equal((await updatesOf("Minecraft")).updates[0].status, "current");
		});

		it("says a mod already on its newest version is up to date, and refuses ids it can't use", async () => {
			const again = await post("Minecraft", "update", { id: "github:acme/lockmod" });
			assert.equal(again.status, 409);
			assert.equal(again.json.code, "up_to_date");
			const unknown = await post("Minecraft", "update", { id: "github:nobody/nothing" });
			assert.equal(unknown.status, 404);
			assert.equal(unknown.json.code, "not_found");
			assert.equal((await post("Minecraft", "update", {})).json.code, "bad_input");
			assert.equal((await post("Minecraft", "update", { id: "x".repeat(601) })).json.code, "bad_input");
		});

		it("is for admins only", async () => {
			await api.post("/api/users", { username: "modupd", password: "TestUpd!2345", role: "moderator" });
			const mod = await api.cookieFor({ username: "modupd", password: "TestUpd!2345" });
			assert.equal((await api.get("/api/server/Minecraft/mods/updates", { cookie: mod })).status, 403);
			assert.equal((await api.post("/api/server/Minecraft/mods/update", { id: "github:acme/lockmod" }, { cookie: mod })).status, 403);
		});
	});

	describe("two mods that need one shared library", () => {
		it("both install, and the library keeps both mods as its parents in the lock", async () => {
			const a = await post("Minecraft", "install", { input: "https://modrinth.com/mod/mod-a" });
			assert.equal(a.status, 200, JSON.stringify(a.json));
			assert.deepEqual(a.json.installed, ["SharedLib.jar", "ModA.jar"]);
			const b = await post("Minecraft", "install", { input: "https://modrinth.com/mod/mod-b" });
			assert.equal(b.status, 200, JSON.stringify(b.json));
			assert.ok(fs.existsSync(path.join(dirs.mc, "mods", "ModB.jar")));
			// The library is already there, so it is passed over and reported rather than overwritten.
			assert.deepEqual(b.json.installed, ["ModB.jar"]);
			assert.deepEqual(b.json.skipped, [{ source: "modrinth", ref: "shared-lib", reason: "already_installed", dependencyOf: "modrinth:mod-b" }]);
			const { entries } = await api.get(`/api/server/Minecraft/mods/lock`).then((r) => r.json);
			const shared = entries.find((e) => e.id === "modrinth:shared-lib");
			assert.deepEqual([...shared.dependencyOf].sort(), ["modrinth:mod-a", "modrinth:mod-b"]);
		});
	});

	it("is for admins only", async () => {
		await api.post("/api/users", { username: "modm", password: "TestMod!2345", role: "moderator" });
		const mod = await api.cookieFor({ username: "modm", password: "TestMod!2345" });
		assert.equal((await api.get("/api/server/Minecraft/mods", { cookie: mod })).status, 403);
		assert.equal((await api.post("/api/server/Minecraft/mods/remove", { id: "x" }, { cookie: mod })).status, 403);
	});

	describe("the mod pack for a player", () => {
		const noPanelPaths = (body) => {
			const text = JSON.stringify(body);
			assert.equal(text.includes(JSON.stringify(panel.dir).slice(1, -1)), false, text);
			assert.doesNotMatch(text, /[A-Za-z]:\\\\|\/home\//, text);
		};
		// The pack route answers with a file, not JSON, so it is fetched directly with the admin's cookie.
		const packGet = (query) => fetch(`${api.base}/api/server/Minecraft/mods/client-pack${query}`, { headers: { Cookie: api.cookie } });

		it("the manifest lists the recorded mods but not a file the panel never recorded, and is for admins only", async () => {
			const r = await api.get("/api/server/Minecraft/mods/manifest");
			assert.equal(r.status, 200, JSON.stringify(r.json));
			const names = r.json.mods.map((m) => m.name);
			assert.ok(names.includes("lock-mod.jar"), JSON.stringify(names));
			assert.equal(names.includes("cool-mod-1.0.jar"), false);
			noPanelPaths(r.json);
			await api.post("/api/users", { username: "packmod", password: "TestPack!2345", role: "moderator" });
			const mod = await api.cookieFor({ username: "packmod", password: "TestPack!2345" });
			assert.equal((await api.get("/api/server/Minecraft/mods/manifest", { cookie: mod })).status, 403);
			assert.equal((await api.get("/api/server/Minecraft/mods/client-pack?format=zip", { cookie: mod })).status, 403);
		});

		it("the zip pack holds the manifest, the README and the recorded mods, with the hash the manifest gives", async () => {
			const res = await packGet("?format=zip");
			assert.equal(res.status, 200);
			assert.match(res.headers.get("content-type"), /zip/);
			assert.equal(res.headers.get("content-disposition"), 'attachment; filename="mod-pack.zip"');
			const zip = new AdmZip(Buffer.from(await res.arrayBuffer()));
			const names = zip.getEntries().map((e) => e.entryName);
			assert.ok(names.includes("manifest.json") && names.includes("README.txt") && names.includes("mods/lock-mod.jar"), JSON.stringify(names));
			assert.equal(names.includes("mods/cool-mod-1.0.jar"), false);
			const manifest = JSON.parse(zip.getEntry("manifest.json").getData().toString("utf8"));
			const bytes = zip.getEntry("mods/lock-mod.jar").getData();
			assert.equal(manifest.mods.find((m) => m.name === "lock-mod.jar").files[0].sha256, crypto.createHash("sha256").update(bytes).digest("hex"));
		});

		it("the list pack is plain text, one line per mod", async () => {
			const res = await packGet("?format=list");
			assert.equal(res.status, 200);
			assert.equal(res.headers.get("content-disposition"), 'attachment; filename="mod-list.txt"');
			assert.ok((await res.text()).includes("lock-mod.jar  (github:acme/lockmod  v2.0.0)"));
		});

		describe("as a Modrinth pack", () => {
				// A modpack's game version and loader come from its variables.txt, which the Modrinth pack needs.
				before(() => fs.writeFileSync(path.join(dirs.mc, "variables.txt"), "MINECRAFT_VERSION=1.21.1\nMODLOADER=fabric\n"));
				after(() => fs.rmSync(path.join(dirs.mc, "variables.txt"), { force: true }));

				it("is a zip with the index, the game version named, and the recorded mod in the overrides", async () => {
					const res = await packGet("?format=mrpack");
					assert.equal(res.status, 200, await res.clone().text());
					assert.equal(res.headers.get("content-disposition"), 'attachment; filename="mod-pack.mrpack"');
					const zip = new AdmZip(Buffer.from(await res.arrayBuffer()));
					const names = zip.getEntries().map((e) => e.entryName);
					assert.ok(names.includes("modrinth.index.json") && names.includes("overrides/mods/lock-mod.jar"), JSON.stringify(names));
					assert.equal(names.includes("overrides/mods/cool-mod-1.0.jar"), false);
					const index = JSON.parse(zip.getEntry("modrinth.index.json").getData().toString("utf8"));
					assert.equal(index.game, "minecraft");
					assert.deepEqual(index.dependencies, { minecraft: "1.21.1" });
					noPanelPaths(index);
				});

				it("refuses a game that isn't Minecraft as unsupported, and a repeated format as bad_format with the new text", async () => {
					const ark = await api.get("/api/server/Ark%20Evolved/mods/client-pack?format=mrpack");
					assert.equal(ark.status, 400);
					assert.equal(ark.json.code, "unsupported");
					const repeated = await fetch(`${api.base}/api/server/Minecraft/mods/client-pack?format=zip&format=list`, { headers: { Cookie: api.cookie } });
					assert.equal(repeated.status, 400);
					assert.deepEqual(await repeated.json(), { error: "format must be zip, list or mrpack.", code: "bad_format" });
				});
			});

			it("refuses an unknown format, and a game with no mods folder", async () => {
			const bad = await api.get("/api/server/Minecraft/mods/client-pack?format=nope");
			assert.equal(bad.status, 400);
			assert.equal(bad.json.code, "bad_format");
			const none = await api.get("/api/server/Ark%20Evolved/mods/client-pack");
			assert.equal(none.status, 400);
			assert.equal(none.json.code, "unsupported");
			noPanelPaths(none.json);
		});
	});
});

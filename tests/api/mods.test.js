import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
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
			const map = { "/zip/denikson-BepInExPack_Valheim.zip": zips.framework, "/zip/Someone-Dep.zip": zips.dep, "/zip/Someone-Mod.zip": zips.mod };
			if (map[req.url]) return res.end(map[req.url]);
			res.statusCode = 404;
			res.end();
		});
		await new Promise((r) => store.listen(port, "127.0.0.1", r));

		dirs = {};
		const free = await freePort();
		panel = await startInstance({
			env: { GHP_THUNDERSTORE_API: `http://127.0.0.1:${port}` },
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
			assert.deepEqual(modlist(), ["Cool.pak", "Other.pak"]);
			const l = await list("Conan Mods");
			assert.deepEqual(l.mods.map((m) => [m.name, m.enabled]), [["Cool.pak", true], ["Other.pak", true]]);
		});

		it("turns one off by taking it out of the list, and keeps the file", async () => {
			await api.put("/api/server/Conan%20Mods/mods/enabled", { id: "Cool.pak", enabled: false });
			assert.deepEqual(modlist(), ["Other.pak"]);
			assert.ok(fs.existsSync(path.join(mods(), "Cool.pak")));
			assert.equal((await list("Conan Mods")).mods.find((m) => m.name === "Cool.pak").enabled, false);
			await api.put("/api/server/Conan%20Mods/mods/enabled", { id: "Cool.pak", enabled: true });
			assert.deepEqual(modlist().sort(), ["Cool.pak", "Other.pak"]);
		});

		it("shows a listed mod whose file is missing, and removes cleanly", async () => {
			fs.appendFileSync(path.join(mods(), "modlist.txt"), "Ghost.pak\r\n");
			const l = await list("Conan Mods");
			assert.equal(l.mods.find((m) => m.name === "Ghost.pak").missing, true);
			await post("Conan Mods", "remove", { id: "Ghost.pak" });
			await post("Conan Mods", "remove", { id: "Cool.pak" });
			assert.deepEqual(modlist(), ["Other.pak"]);
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
			await api.post("/api/control/Conan%20Mods/stop");
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

	it("is for admins only", async () => {
		await api.post("/api/users", { username: "modm", password: "TestMod!2345", role: "moderator" });
		const mod = await api.cookieFor({ username: "modm", password: "TestMod!2345" });
		assert.equal((await api.get("/api/server/Minecraft/mods", { cookie: mod })).status, 403);
		assert.equal((await api.post("/api/server/Minecraft/mods/remove", { id: "x" }, { cookie: mod })).status, 403);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { configText, worldNameOf } from "../../src/server/data/games/terraria-vanilla.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";
import { describeWebExtras } from "../../src/server/services/webInstall.js";

// Terraria (vanilla), from the research dossier (nothing was run on a real install): TerrariaServer.exe from the terraria.org zip,
// -config serverconfig.txt, port and player limit on the launch line, world and password in the config file, no login and no mods.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Terraria Server",
	sessionName: "Friends World",
	serverPassword: "secret1",
	port: 7790,
	installDir: "C:\\Servers\\terraria",
	instanceSlug: "my-terraria-server",
	startScriptFilename: "Start_Terraria.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));
const PLATFORM = "1458\\Windows";

describe("Terraria (vanilla) module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.deepEqual(logs, []);
		assert.equal(template.id, "terraria-vanilla");
		assert.equal(template.type, "terraria-vanilla");
		assert.equal(template.displayName, "Terraria (vanilla)");
		assert.equal(template.method, "process");
	});

	it("is not a SteamCMD install: it has no updateAppId and is installed from terraria.org", () => {
		assert.equal(template.updateAppId, undefined);
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, PLATFORM);
		assert.equal(template.zipInstall, undefined);
		assert.equal(template.webInstall.kind, "zip");
		assert.equal(template.webInstall.label, "Terraria dedicated server 1.4.5.8");
		assert.deepEqual(template.webInstall.hosts, ["terraria.org"]);
		assert.deepEqual(template.webInstall.expect, [`${PLATFORM}\\TerrariaServer.exe`]);
		assert.equal(typeof template.webInstall.resolve, "function");
	});

	it("resolves the 1.4.5.8 zip address from terraria.org, with the size from a HEAD request", async () => {
		const seen = [];
		const fetchImpl = async (url, init) => {
			seen.push([url, init?.method]);
			return { ok: true, headers: { get: (k) => (k.toLowerCase() === "content-length" ? "61000000" : null) } };
		};
		const found = await template.webInstall.resolve({ fetchImpl });
		assert.equal(found.url, "https://terraria.org/api/download/pc-dedicated-server/terraria-server-1458.zip");
		assert.equal(found.bytes, 61000000);
		assert.equal(found.sha1, null);
		assert.equal(found.sha256, null);
		assert.equal(found.version, "1.4.5.8");
		assert.deepEqual(seen, [[found.url, "HEAD"]]);
	});

	it("asks for a world name and a password only", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
	});

	it("has one game port, 7790, that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 7790);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "terraria-vanilla");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});

	it("uses a type no other template uses, and does not reuse the tModLoader server's id", () => {
		const types = GAME_TEMPLATES.filter((t) => t.id !== "terraria-vanilla").map((t) => t.type);
		assert.ok(!types.includes("terraria-vanilla"));
		assert.ok(GAME_TEMPLATES.some((t) => t.id === "terraria" && t.type === "terraria"), "the tModLoader server is still type terraria");
	});
});

describe("Terraria (vanilla) start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder, then starts TerrariaServer.exe with the config file", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(
			launchLine(script),
			'start /MIN "My Terraria Server" TerrariaServer.exe -config serverconfig.txt -port 7790 -maxplayers 16',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 7790 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 7900, maxPlayers: 24 }));
		assert.match(custom, / -port 7900 /);
		assert.match(custom, / -maxplayers 24$/m);
	});

	it("keeps the player limit to a whole number from 1 to 255, 16 when it is left out", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / -maxplayers 16$/m);
		assert.match(template.buildStartScript(params({ maxPlayers: 0 })), / -maxplayers 16$/m);
		assert.match(template.buildStartScript(params({ maxPlayers: 256 })), / -maxplayers 16$/m);
		assert.match(template.buildStartScript(params({ maxPlayers: 1 })), / -maxplayers 1$/m);
		assert.match(template.buildStartScript(params({ maxPlayers: 255 })), / -maxplayers 255$/m);
	});

	it("keeps the password and the world name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends World"));
	});

	it("never lets a character cmd acts on into the script, whatever is typed in the name", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" TerrariaServer\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Terraria (vanilla) serverconfig.txt", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the file the launch line names, in the platform folder", () => {
		assert.equal(relPath, "serverconfig.txt");
	});

	it("names the world as a full path under the platform folder's Worlds folder, medium size, and the world's name", () => {
		assert.ok(lines.includes("world=C:\\Servers\\terraria\\1458\\Windows\\Worlds\\Friends World.wld"));
		assert.ok(lines.includes("autocreate=2"));
		assert.ok(lines.includes("worldname=Friends World"));
	});

	it("writes the password as a plain key=value line", () => {
		assert.ok(lines.includes("password=secret1"));
	});

	it("leaves the password line out when there is none", () => {
		const { content: none } = template.buildConfigFile(params({ serverPassword: "" }));
		assert.ok(!/^password=/m.test(none));
	});

	it("keeps the port and the player limit out of the file (they are on the launch line)", () => {
		assert.ok(!/^port=/m.test(content));
		assert.ok(!/^maxplayers=/m.test(content));
	});

	it("uses # comments only and ends with a line break", () => {
		for (const line of lines.filter((l) => l.length > 0)) {
			assert.ok(line.startsWith("#") || /^[a-z]+=/.test(line), line);
		}
		assert.ok(content.endsWith("\r\n"));
	});
});

describe("Terraria (vanilla) inputs", () => {
	it("refuses a world name the file or the game could not hold cleanly, and says what is allowed", () => {
		for (const bad of ['a"b', "a;b", "a/b", "a\\b", "x".repeat(28), "-leading", "two\tlines"]) {
			assert.throws(() => worldNameOf(bad), /cannot be a world name/, JSON.stringify(bad));
		}
		assert.equal(worldNameOf("  My World 2.0 "), "My World 2.0");
		assert.equal(worldNameOf(""), "World");
		assert.equal(worldNameOf("x".repeat(27)), "x".repeat(27));
	});

	it("refuses a password with a line break, and keeps every other character", () => {
		assert.throws(() => configText("a\nb", "The password"), /control character/);
		assert.equal(configText("  p@ss w0rd#1  ", "The password"), "p@ss w0rd#1");
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw" });
		await assert.rejects(template.resolveParams({ name: "x", sessionName: 'bad"name' }), /cannot be a world name/);
		await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: "a\nb" }), /control character/);
	});
});

describe("Terraria (vanilla) files, entry and warnings", () => {
	it("makes a Worlds folder with a note in it, under the platform folder", () => {
		const files = template.buildExtraFiles(params());
		assert.equal(files.length, 1);
		assert.equal(files[0].relPath, `${PLATFORM}\\Worlds\\Put a world here.txt`);
		assert.match(files[0].content, /world=/);
	});

	it("builds a process entry that finds TerrariaServer.exe and keeps its console reachable", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.type, "terraria-vanilla");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "TerrariaServer.exe");
		assert.equal(entry.windowMode, "minimized");
		assert.equal(entry.workingDir, `C:\\Servers\\terraria\\${PLATFORM}`);
		assert.equal(entry.startScriptPath, `C:\\Servers\\terraria\\${PLATFORM}\\Start_Terraria.bat`);
		assert.equal(entry.configPath, `C:\\Servers\\terraria\\${PLATFORM}\\serverconfig.txt`);
		assert.deepEqual(Object.keys(entry.configPaths), ["serverconfig.txt"]);
		assert.equal(entry.updateAppId, undefined);
		assert.equal(entry.autoUpdate, false);
	});

	it("fetches the XNA Framework itself: a pinned, Microsoft-signed MSI unpacked beside the exe", async () => {
		const out = await template.postWrite(params());
		assert.ok(out.warnings.some((w) => /XNA Framework 4.0/.test(w) && /nothing was installed/.test(w)));
		assert.match(template.description, /XNA Framework 4\.0/);
		const [xna, ...rest] = template.webInstall.extras;
		assert.equal(rest.length, 0);
		assert.equal(xna.kind, "msi");
		assert.equal(xna.signer, "Microsoft Corporation");
		assert.deepEqual(xna.hosts, ["download.microsoft.com"]);
		assert.match(xna.url, /^https:\/\/download\.microsoft\.com\/.+xnafx40_redist\.msi$/);
		assert.match(xna.sha256, /^[0-9a-f]{64}$/);
		assert.equal(xna.into, PLATFORM, "the DLLs go in the folder TerrariaServer.exe is in");
		for (const dll of ["Microsoft.Xna.Framework.dll", "Microsoft.Xna.Framework.Game.dll", "Microsoft.Xna.Framework.Graphics.dll", "XnaNative.dll"]) {
			assert.ok(xna.pick.test(dll), `${dll} is picked`);
			assert.ok(xna.expect.includes(dll), `${dll} must be present`);
		}
		assert.equal(xna.pick.test("msvcr100.dll"), false, "the C runtime is not taken");
		assert.deepEqual(describeWebExtras(template.webInstall).map((x) => x.signer), ["Microsoft Corporation"], "the spec passes the panel's own check");
	});

	it("warns, before any save, that Stop does not save the world and that exit is the way", async () => {
		const out = await template.postWrite(params());
		const stop = out.warnings.find((w) => /exit/.test(w));
		assert.ok(stop, "a warning names exit");
		assert.match(stop, /Stop/);
		assert.match(stop, /cannot save and stop/);
	});

	it("backs up the settings, the worlds and the ban list from the platform folder", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.deepEqual(rels, ["serverconfig.txt", "Worlds", "banlist.txt"]);
		for (const p of backup.paths) assert.equal(p.base, "working");
	});
});

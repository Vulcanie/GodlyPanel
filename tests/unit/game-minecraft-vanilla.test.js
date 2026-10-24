import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/minecraft-vanilla.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";
import { mojangServerJar } from "../../src/server/services/webResolvers.js";

// Minecraft Java Edition (vanilla server.jar), from the research dossier (research/minecraft-vanilla/01..03; nothing was run on a real
// install). Not a SteamCMD game: the jar comes from Mojang's version manifest (webInstall), 1.21.11 needs Java 21, the EULA must be accepted,
// the game reads server.properties from its working folder, and the game port is TCP.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Minecraft Server",
	sessionName: "Friends Camp",
	port: 25585,
	maxMemoryGB: 4,
	eulaAccepted: true,
	installDir: "C:\\Servers\\mc",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-minecraft-server",
	startScriptFilename: "Start_Minecraft.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Minecraft (vanilla) module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "minecraft-vanilla");
		assert.equal(template.type, "minecraft-vanilla");
		assert.equal(template.displayName, "Minecraft (Java, vanilla)");
		assert.equal(template.method, "process");
	});

	it("is not a SteamCMD game: no app id, and the jar comes from Mojang's own site", () => {
		assert.equal(template.updateAppId, undefined);
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		const web = template.webInstall;
		assert.equal(web.kind, "file");
		assert.equal(web.fileName, "server.jar");
		assert.equal(web.label, "Minecraft Java server 1.21.11");
		assert.deepEqual(web.hosts, ["piston-meta.mojang.com", "piston-data.mojang.com", "launchermeta.mojang.com"]);
		assert.equal(typeof web.resolve, "function");
	});

	it("pins 1.21.11 and says in the description that Java 21 or newer is needed", () => {
		assert.match(template.description, /Java 21 or newer/);
		assert.match(template.description, /1\.21\.11/);
		assert.equal(typeof mojangServerJar("1.21.11"), "function");
	});

	it("needs the EULA to be accepted, and asks for the server message, memory and the EULA box", () => {
		assert.equal(template.requiresEula, true);
		assert.deepEqual(template.fields, ["sessionName", "maxMemoryGB", "eulaAccepted"]);
		assert.equal(template.fieldMeta.eulaAccepted.type, "checkbox");
	});

	it("has one TCP game port that no other template uses, nor the port next to one", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "minecraft-vanilla");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.notEqual(template.ports[0].default, 25565, "25565 is the modpack template's default");
	});

	it("keeps the world, the server settings and the op and whitelist lists in the backup", () => {
		const props = backup.paths.filter((p) => p.base === "property");
		assert.equal(props.length, 1);
		assert.equal(props[0].file, "server.properties");
		assert.equal(props[0].key, "level-name");
		assert.equal(props[0].default, "world");
		const rels = backup.paths.filter((p) => p.base === "working").map((p) => p.rel);
		assert.deepEqual(rels.sort(), ["ops.json", "server.properties", "whitelist.json"].sort());
	});

	it("has no log entry, because the dossier does not name where the game writes its log", () => {
		assert.deepEqual(logs, []);
	});
});

describe("Minecraft start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts java with server.jar in the no-window mode", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launchLine(script), 'start /MIN "My Minecraft Server" java -Xmx4G -jar "%~dp0server.jar" --nogui');
	});

	it("puts the memory limit from the form in -Xmx, in whole gigabytes", () => {
		assert.match(template.buildStartScript(params({ maxMemoryGB: 8 })), / -Xmx8G -jar "%~dp0server\.jar" --nogui/);
		assert.match(template.buildStartScript(params({ maxMemoryGB: "6" })), / -Xmx6G /);
	});

	it("falls back to 4 GB when the memory field is left out or is not a whole number", () => {
		assert.match(template.buildStartScript(params({ maxMemoryGB: undefined })), / -Xmx4G /);
		assert.match(template.buildStartScript(params({ maxMemoryGB: "lots" })), / -Xmx4G /);
		assert.match(template.buildStartScript(params({ maxMemoryGB: 0 })), / -Xmx4G /);
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', maxMemoryGB: "4 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" java /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "").replace('"%~dp0server.jar"', "")));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("does not put the port or the message on the launch line (they live in server.properties)", () => {
		assert.ok(!/--port|server-port|motd/.test(script));
	});
});

describe("Minecraft inputs", () => {
	it("hands on the cleaned memory and message from resolveParams, and a default memory", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", maxMemoryGB: "6", eulaAccepted: true });
		assert.deepEqual(out, { sessionName: "Friends", maxMemoryGB: 6 });
		const dflt = await template.resolveParams({ name: "x", sessionName: "", maxMemoryGB: "" });
		assert.equal(dflt.maxMemoryGB, 4);
	});

	it("refuses a message or memory value that would change what the file or script does", async () => {
		await assert.rejects(template.resolveParams({ name: "x", sessionName: "a\\b" }), /backslash/);
		await assert.rejects(template.resolveParams({ name: "x", sessionName: "a\nb" }), /line break/);
		await assert.rejects(template.resolveParams({ name: "x", maxMemoryGB: "4 & calc" }), /whole number/);
		await assert.rejects(template.resolveParams({ name: "x", maxMemoryGB: "0" }), /whole number/);
	});

	it("warns that the only way the panel stops the server is closing its window", async () => {
		const out = await template.postWrite(params());
		assert.equal(out.warnings.length, 1);
		assert.match(out.warnings[0], /stop/);
	});
});

describe("Minecraft server.properties", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is written in the working folder", () => {
		assert.equal(relPath, "server.properties");
	});

	it("writes the message and the port the panel allocated, and nothing the game sets itself", () => {
		assert.equal(lines[0], "motd=Friends Camp");
		assert.equal(lines[1], "server-port=25585");
		assert.equal(lines.length, 3);
	});

	it("leaves out the message when none was given, so the game's default stays", () => {
		const { content: plain } = template.buildConfigFile(params({ sessionName: "" }));
		assert.equal(plain, "server-port=25585\r\n");
	});

	it("writes the port the entry uses", () => {
		const entry = template.buildServerEntry(params({ port: 25590 }));
		assert.match(template.buildConfigFile(params({ port: 25590 })).content, /^server-port=25590\r\n/m);
		assert.equal(entry.port, 25590);
	});
});

describe("Minecraft eula.txt", () => {
	it("is written with eula=true when the EULA box was ticked", () => {
		const files = template.buildExtraFiles(params());
		const eula = files.find((f) => f.relPath === "eula.txt");
		assert.ok(eula);
		assert.match(eula.content, /^eula=true\r\n$/m);
		assert.match(eula.content, /aka\.ms\/MinecraftEULA/);
	});

	it("is not written when the EULA box was not ticked", () => {
		assert.deepEqual(template.buildExtraFiles(params({ eulaAccepted: false })), []);
		assert.deepEqual(template.buildExtraFiles(params({ eulaAccepted: undefined })), []);
	});
});

describe("Minecraft server entry", () => {
	const entry = template.buildServerEntry(params());

	it("is a process-method entry on the game port, with the install's paths", () => {
		assert.equal(entry.type, "minecraft-vanilla");
		assert.equal(entry.method, "process");
		assert.equal(entry.port, 25585);
		assert.equal(entry.host, "127.0.0.1");
		assert.equal(entry.configPath, "C:\\Servers\\mc\\server.properties");
		assert.deepEqual(Object.keys(entry.configPaths), ["server.properties"]);
		assert.equal(entry.startScriptPath, "C:\\Servers\\mc\\Start_Minecraft.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\mc");
		assert.equal(entry.processName, "java.exe");
		assert.equal(entry.updateAppId, undefined);
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Minecraft backup", () => {
	it("has no fixed world folder that a level-name change would leave behind", () => {
		assert.ok(!backup.paths.some((p) => p.rel === "world"));
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Facts about what real game installs accept, found by running them, pinned here so a
// template change can't quietly undo them.

const template = (id) => GAME_TEMPLATES.find((t) => t.id === id);

describe("Enshrouded config", () => {
	const build = (p) => JSON.parse(template("enshrouded").buildConfigFile({ sessionName: "S", port: 15637, ...p }).content);
	const passwords = (config) => config.userGroups.map((g) => g.password);

	it("gives the two groups different passwords, which the game insists on", () => {
		for (const p of [{ serverPassword: "join" }, { serverPassword: "join", adminPassword: "join" }, { serverPassword: "join", adminPassword: "" }, { serverPassword: "" }, {}]) {
			const [admin, friend] = passwords(build(p));
			assert.notEqual(admin, friend, JSON.stringify(p));
			assert.ok(admin.length >= 6, "the admin password isn't blank");
		}
	});

	it("uses the admin password it was given, and the server password for players", () => {
		const config = build({ serverPassword: "join", adminPassword: "boss-pass" });
		assert.deepEqual(passwords(config), ["boss-pass", "join"]);
		assert.equal(config.userGroups[0].canKickBan, true);
		assert.equal(config.userGroups[1].canKickBan, false);
	});

	it("asks for the admin password when creating", () => {
		assert.ok(template("enshrouded").fields.includes("adminPassword"));
	});
});

describe("start scripts that launch another script", () => {
	// The panel starts a server's script without a folder of its own for some games, so a script that runs a
	// sibling batch file has to change to its own folder first. Subsistence's generated script didn't, and every
	// server made from it failed with "Start_Server.bat" not found (found on a real install).
	const params = { name: "Test Server", sessionName: "S", serverPassword: "pw", rconPassword: "rc", port: 8900, queryPort: 8902, rconPort: 8905, instanceSlug: "test", installDir: "C:\Servers\test" };

	it("Subsistence's script goes to its own folder before it starts the launcher beside it", () => {
		const script = template("subsistence").buildStartScript(params);
		const lines = script.split(/\r?\n/);
		const cd = lines.findIndex((l) => /^cd\s+\/d\s+"%~dp0"/i.test(l));
		const start = lines.findIndex((l) => /Start_Server\.bat/.test(l));
		assert.ok(cd >= 0, "has a cd /d \"%~dp0\"");
		assert.ok(start > cd, "and does it before launching Start_Server.bat");
		assert.match(template("subsistence").buildInnerStartScript(params), /Subsistence\.exe server/);
	});

	it("no template launches a batch file from the current folder without first going to its own", () => {
		for (const t of GAME_TEMPLATES) {
			if (typeof t.buildStartScript !== "function") continue;
			let script;
			try {
				script = t.buildStartScript(params);
			} catch {
				continue; // A template that needs parameters this check doesn't have.
			}
			if (typeof script !== "string") continue;
			const lines = script.split(/\r?\n/);
			lines.forEach((line, i) => {
				// `start ... "Something.bat"` or `call Something.bat` with no path in front of the file name.
				const relative = /(?:^|\s)(?:start\b[^"\r\n]*"[^"\r\n]*"\s+|call\s+)"?([A-Za-z0-9_.-]+\.bat)"?/i.exec(line);
				if (!relative) return;
				const before = lines.slice(0, i).some((l) => /^(cd|pushd)\s+(\/d\s+)?"?%~dp0/i.test(l.trim()));
				assert.ok(before, `${t.id}: runs ${relative[1]} from the current folder without a cd /d "%~dp0" first`);
			});
		}
	});
});

describe("Subsistence's ports", () => {
	// A fresh install ships UDKEngine.ini with the game's own defaults. The command line doesn't set these, so a
	// server made from the template ran on 7777 and 27015 whatever the form said (found on a real install).
	const shipped = [
		"[URL]",
		"Protocol=unreal",
		"Port=7777",
		"",
		"[Engine.GameInfo]",
		"PreserveKey=URL:Port",
		"PreserveKey=OnlineSubsystemSteamworks.OnlineSubsystemSteamworks:QueryPort",
		"",
		"[OnlineSubsystemSteamworks.OnlineSubsystemSteamworks]",
		"QueryPort=27015",
		"GameServerQueryPort=27015",
		"",
	].join("\r\n");
	const apply = (p) => template("subsistence").patchInstalledConfig.apply(shipped, p);

	it("writes the chosen port and query port where the game reads them", () => {
		const out = apply({ port: 8900, queryPort: 8902 });
		assert.match(out, /^Port=8900\r?$/m);
		assert.match(out, /^QueryPort=8902\r?$/m);
		assert.doesNotMatch(out, /7777|27015\r?\nGameServer/, "the defaults are gone");
	});

	it("changes nothing else, including lines that merely mention a port", () => {
		const out = apply({ port: 8900, queryPort: 8902 });
		assert.match(out, /PreserveKey=URL:Port\r?$/m);
		assert.match(out, /PreserveKey=OnlineSubsystemSteamworks\.OnlineSubsystemSteamworks:QueryPort\r?$/m);
		assert.match(out, /GameServerQueryPort=27015/, "a different setting with a similar name is left alone");
		assert.equal(out.split(/\r?\n/).length, shipped.split(/\r?\n/).length);
	});

	it("records both ports for the server, so the ports editor and the firewall check know them", () => {
		const entry = template("subsistence").buildServerEntry({ name: "S", port: 8900, queryPort: 8902, installDir: "C:\S", installLayoutRoot: "Binaries\Win64", startScriptFilename: "UpdateandRun.bat" });
		assert.equal(entry.port, 8900);
		assert.equal(entry.queryPort, 8902);
		assert.deepEqual(template("subsistence").ports.map((x) => x.key), ["port", "queryPort"]);
	});
});

describe("Subsistence logs", () => {
	it("finds Launch.log for a server the panel made and for one set up by hand", async () => {
		const { LOG_TEMPLATES } = await import("../../src/server/data/logTemplates.js");
		const rels = LOG_TEMPLATES.subsistence.map((s) => s.rel);
		assert.ok(rels.includes("UDKGame/Logs"));
		assert.ok(rels.includes("steamapps/common/Subsistence Dedicated Server/UDKGame/Logs"));
	});
});

describe("Subsistence's ports on a fresh install", () => {
	it("makes a file holding just the two ports when the game hasn't built its own yet", () => {
		// UDKEngine.ini is not in the download; the game writes it on first run and keeps these two keys (PreserveKey).
		const text = template("subsistence").patchInstalledConfig.create({ port: 8900, queryPort: 8902 });
		assert.match(text, /^\[URL\]\r\nPort=8900\r\n/);
		assert.match(text, /\[OnlineSubsystemSteamworks\.OnlineSubsystemSteamworks\]\r\nQueryPort=8902\r\n/);
		assert.equal(text.split(/\r?\n/).filter((l) => /^\w+=/.test(l)).length, 2, "nothing else is set");
	});
});

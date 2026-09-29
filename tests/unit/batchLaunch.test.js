import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import { tempDir, removeDir } from "../helpers/instance.js";

// The reader has to reproduce what a start script launches without running it,
// so it's tested against scripts shaped like the ones real servers use, and
// against the constructs it must refuse rather than guess at. The programs are
// empty stand-in files: only their existence is checked.

const onWindows = process.platform === "win32";

describe("launch reader", { skip: !onWindows && "Windows batch files" }, () => {
	let dir;

	const write = (rel, content = "") => {
		const full = path.join(dir, rel);
		fs.mkdirSync(path.dirname(full), { recursive: true });
		fs.writeFileSync(full, content);
		return full;
	};
	const derive = (rel, workingDir = dir) => deriveLaunch(path.join(dir, rel), { workingDir });

	before(() => {
		dir = tempDir("batch");
		for (const exe of [
			"game/Server.exe",
			"ark/Binaries/Win64/ArkServer.exe",
			"win/R5/Binaries/Win64/Shipping.exe",
			"pal/PalServer.exe",
			"pal/steamcmd.exe",
			"drag/RS/Binaries/Win64/RSServer-Win64-Shipping.exe",
			"valheim/valheim_server.exe",
			"valheim/steamcmd.exe",
		]) {
			write(exe);
		}
	});

	after(() => removeDir(dir));

	it("reads set, cd /d and a start line, expanding %VAR% (ARK-style)", () => {
		write(
			"ark.bat",
			[
				"@echo off",
				"title ARK Launcher",
				'SET "BasePath=' + path.join(dir, "ark") + '"',
				'SET "ClusterPath=%BasePath%\\Cluster"',
				'cd /d "%BasePath%\\Binaries\\Win64"',
				"echo Launching...",
				'start /MIN "Map" ArkServer.exe TheIsland_WP?SessionName=Test -RCONPort=27025 -ClusterDirOverride="%ClusterPath%"',
				"exit",
			].join("\r\n"),
		);
		const r = derive("ark.bat");
		assert.equal(r.ok, true, r.reason);
		assert.equal(r.launch.exe, path.join(dir, "ark", "Binaries", "Win64", "ArkServer.exe"));
		assert.equal(r.launch.cwd, path.join(dir, "ark", "Binaries", "Win64"));
		assert.match(r.launch.args, /^TheIsland_WP\?SessionName=Test -RCONPort=27025 -ClusterDirOverride="[^"]*Cluster"$/);
		assert.equal(r.launch.env.BasePath, path.join(dir, "ark"));
	});

	it("reads pushd %~dp0, start flags and priority, then popd (Windrose-style)", () => {
		write("win/Start.bat", ["@echo off", "pushd %~dp0%", 'start /MIN /abovenormal "Windrose" R5\\Binaries\\Win64\\Shipping.exe -log', "popd"].join("\r\n"));
		const r = derive("win/Start.bat", path.join(dir, "win"));
		assert.equal(r.ok, true, r.reason);
		assert.equal(r.launch.exe, path.join(dir, "win", "R5", "Binaries", "Win64", "Shipping.exe"));
		assert.equal(r.launch.args, "-log");
		assert.equal(r.launch.priority, "aboveNormal");
	});

	it("follows a script that starts another script, and reports the skipped update check", () => {
		write("game/Inner.bat", ["@echo off", 'cd /d "%~dp0"', 'start /MIN "Inner" Server.exe server map1?opt -log -Password=x'].join("\r\n"));
		write(
			"game/Outer.bat",
			["@echo off", '"' + path.join(dir, "valheim", "steamcmd.exe") + '" +login anonymous +app_update 1 validate +quit', 'start /MIN "Game" "Inner.bat"', "exit"].join("\r\n"),
		);
		const r = derive("game/Outer.bat", path.join(dir, "game"));
		assert.equal(r.ok, true, r.reason);
		assert.equal(r.launch.exe, path.join(dir, "game", "Server.exe"));
		assert.equal(r.launch.args, "server map1?opt -log -Password=x");
		assert.deepEqual(r.skipped, ["the SteamCMD update check"]);
	});

	it("joins ^ continuation lines, skips an if-block, and survives a cd into a missing folder (Palworld-style)", () => {
		write(
			"pal/Start.bat",
			[
				"@echo off",
				"setlocal",
				"set STEAMCMD_PATH=" + path.join(dir, "pal", "steamcmd.exe"),
				"set INSTALL_PATH=" + path.join(dir, "pal"),
				'"%STEAMCMD_PATH%" +force_install_dir "%INSTALL_PATH%" +login anonymous +app_update 2 validate +quit',
				"if errorlevel 1 (",
				"    echo update failed",
				"    pause",
				"    exit /b",
				")",
				'cd /d "%INSTALL_PATH%\\steamapps\\common\\PalServer"',
				'start /MIN "Pal" PalServer.exe ^',
				'    -ServerName="My Server" ^',
				"    -port=8920 ^",
				"    -log",
				"exit /b",
			].join("\r\n"),
		);
		const r = derive("pal/Start.bat", path.join(dir, "pal"));
		assert.equal(r.ok, true, r.reason);
		assert.equal(r.launch.exe, path.join(dir, "pal", "PalServer.exe"), "the cd fails in cmd, so it stays where it was");
		assert.match(r.launch.args.replace(/\s+/g, " "), /^-ServerName="My Server" -port=8920 -log$/);
		assert.deepEqual(r.skipped, ["the SteamCMD update check"]);
	});

	it("reads a PowerShell Start-Process wrapper (Dragonwilds-style)", () => {
		write(
			"drag/Start.bat",
			["@echo off", `powershell -NoProfile -Command "Start-Process -FilePath '%~dp0RS\\Binaries\\Win64\\RSServer-Win64-Shipping.exe' -ArgumentList 'RS -log -port=8888' -WorkingDirectory '%~dp0RS\\Binaries\\Win64' -WindowStyle Hidden"`].join("\r\n"),
		);
		const r = derive("drag/Start.bat", path.join(dir, "drag"));
		assert.equal(r.ok, true, r.reason);
		assert.equal(r.launch.exe, path.join(dir, "drag", "RS", "Binaries", "Win64", "RSServer-Win64-Shipping.exe"));
		assert.equal(r.launch.args, "RS -log -port=8888");
		assert.equal(r.launch.cwd, path.join(dir, "drag", "RS", "Binaries", "Win64"));
	});

	it("keeps environment variables the script sets for the game (Valheim's SteamAppId)", () => {
		write("valheim/Start.bat", ["@echo off", "set SteamAppId=892970", 'start /MIN valheim_server -nographics -batchmode -name "My Server" -port 2456'].join("\r\n"));
		const r = derive("valheim/Start.bat", path.join(dir, "valheim"));
		assert.equal(r.ok, true, r.reason);
		assert.equal(r.launch.exe, path.join(dir, "valheim", "valheim_server.exe"), "finds it without the extension");
		assert.equal(r.launch.env.SteamAppId, "892970");
		assert.equal(r.launch.args, '-nographics -batchmode -name "My Server" -port 2456');
	});

	it("uses start /D as the working folder", () => {
		write("game/D.bat", ["@echo off", `start /MIN /D "${path.join(dir, "ark")}" "Title" "${path.join(dir, "game", "Server.exe")}" -x`].join("\r\n"));
		const r = derive("game/D.bat", path.join(dir, "game"));
		assert.equal(r.ok, true, r.reason);
		assert.equal(r.launch.cwd, path.join(dir, "ark"));
	});

	describe("refuses what it can't safely reproduce", () => {
		const refuses = (name, lines, pattern) =>
			it(name, () => {
				write(`refuse/${name.replace(/\W+/g, "_")}.bat`, ["@echo off", ...lines].join("\r\n"));
				const r = derive(`refuse/${name.replace(/\W+/g, "_")}.bat`, path.join(dir, "game"));
				assert.equal(r.ok, false, "should not have produced a launch");
				assert.match(r.reason, pattern);
			});

		refuses("for loops", ["for %%i in (1 2) do echo %%i", "start Server.exe"], /"for"/);
		refuses("goto and labels", [":again", "start Server.exe", "goto again"], /goto|labels/);
		refuses("set /p", ["set /p NAME=Name: ", "start Server.exe"], /set \/a or set \/p/);
		refuses("two programs", ["start /MIN Server.exe", "start /MIN Server.exe"], /more than one/);
		refuses("a missing program", ["start /MIN NoSuchThing.exe"], /can't find/);
		refuses("an unset variable", ["start /MIN %NOT_SET_ANYWHERE%.exe"], /isn't set/);
		refuses("output redirection", ["start /MIN Server.exe > out.txt"], /redirects or chains/);
		refuses("chained commands", ["start /MIN Server.exe & echo done"], /redirects or chains/);
		refuses("start /wait", ["start /wait Server.exe"], /wait/);
		refuses("PowerShell doing more than Start-Process", [`powershell -NoProfile -Command "Get-Date; Start-Process -FilePath 'x.exe'"`], /single Start-Process/);
		refuses("an unknown command", ["robocopy a b", "start Server.exe"], /robocopy/);
	});

	it("reports a missing script and a script with no launch", () => {
		assert.equal(deriveLaunch(path.join(dir, "nope.bat")).ok, false);
		write("game/Nothing.bat", "@echo off\r\necho hello\r\n");
		const r = derive("game/Nothing.bat", path.join(dir, "game"));
		assert.equal(r.ok, false);
		assert.match(r.reason, /doesn't appear to start a program/);
	});
});

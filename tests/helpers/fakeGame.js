import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// A stand-in game server for tests that need something the panel can really start,
// query, ask to stop, back up and watch die. It is a renamed copy of node.exe (so
// its image name is its own, and the panel's process checks see it) running a small
// script that:
//
//   - answers Source RCON on a port, with Conan Exiles' habit of replying with the
//     request id minus one, so the panel's Conan client works against it
//   - "saves" the world when told to, and exits on Shutdown/stop/DoExit (a real
//     server saves as it exits; this writes a marker so a test can tell)
//   - keeps a world file and a log in its folder, for backups and log reading
//   - lists whoever is named in players.txt when asked for ListPlayers
//   - crashes on the "crash" command, so crash recovery can be tested without
//     killing anything from outside
//
// It never touches anything outside the folder it is given.

const SCRIPT = String.raw`
const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const arg = (name, fallback) => { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1] : fallback; };
const rconPort = Number(arg("rcon")); const password = arg("password", "pw"); const home = arg("home", process.cwd());
const saved = path.join(home, "ConanSandbox", "Saved"); const logs = path.join(saved, "Logs");
fs.mkdirSync(logs, { recursive: true });
const log = (line) => fs.appendFileSync(path.join(logs, "game.log"), new Date().toISOString() + " " + line + "\n");
if (!fs.existsSync(path.join(saved, "world.sav"))) fs.writeFileSync(path.join(saved, "world.sav"), "world v1\n");
log("server starting on rcon " + rconPort);
const packet = (id, type, body) => { const t = Buffer.from(body, "utf8"); const b = Buffer.alloc(14 + t.length); b.writeInt32LE(10 + t.length, 0); b.writeInt32LE(id, 4); b.writeInt32LE(type, 8); t.copy(b, 12); return b; };
const players = () => { try { return fs.readFileSync(path.join(home, "players.txt"), "utf8").split(/\r?\n/).filter(Boolean); } catch { return []; } };
const finish = (code) => { log("server stopping"); fs.appendFileSync(path.join(saved, "world.sav"), "saved on exit\n"); setTimeout(() => process.exit(code), 150); };
net.createServer((socket) => {
  let pending = Buffer.alloc(0);
  socket.on("error", () => {});
  socket.on("data", (chunk) => {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= 4) {
      const length = pending.readInt32LE(0);
      if (pending.length < 4 + length) break;
      const id = pending.readInt32LE(4), type = pending.readInt32LE(8);
      const body = pending.subarray(12, 4 + length - 2).toString("utf8");
      pending = pending.subarray(4 + length);
      if (type === 3) { socket.write(body === password ? packet(0, 2, "") : packet(-1, 2, "")); continue; }
      log("rcon: " + body);
      if (/^(Shutdown|stop|DoExit)$/i.test(body)) { socket.end(); finish(0); return; }
      if (body === "crash") { log("crashing"); process.exit(1); }
      if (/^(saveworld|save-all flush|Save)$/i.test(body)) fs.appendFileSync(path.join(saved, "world.sav"), "saved on command\n");
      let reply = "ok";
      if (/^listplayers$/i.test(body)) reply = players().map((p, i) => i + ". " + p + ", " + (1000 + i)).join("\n");
      socket.write(packet(id - 1, 2, reply));
    }
  });
}).listen(rconPort, "127.0.0.1", () => log("rcon listening"));
setInterval(() => {}, 1000);
`;

/**
 * Lay a fake game out in `folder` and return a server entry for it.
 * @param {string} folder
 * @param {object} options
 * @param {string} options.name       panel name for the server
 * @param {number} options.rconPort
 * @param {string} [options.exe]      image name; give each fake its own so they are told apart
 */
export function makeFakeGame(folder, { name, rconPort, exe = "fakegame.exe", password = "pw" }) {
	fs.mkdirSync(folder, { recursive: true });
	fs.copyFileSync(process.execPath, path.join(folder, exe));
	fs.writeFileSync(path.join(folder, "fakegame.cjs"), SCRIPT);
	const saved = path.join(folder, "ConanSandbox", "Saved");
	fs.mkdirSync(path.join(saved, "Logs"), { recursive: true });
	fs.mkdirSync(path.join(saved, "Config"), { recursive: true });
	fs.writeFileSync(path.join(saved, "world.sav"), "world v1\n");
	fs.writeFileSync(path.join(saved, "Config", "settings.ini"), "[Server]\nName=fake\n");
	const script = path.join(folder, "Start_Fake.bat");
	fs.writeFileSync(
		script,
		`@echo off\r\ncd /d "%~dp0"\r\nstart /MIN "${name}" ${exe} fakegame.cjs --rcon ${rconPort} --password ${password} --home "%~dp0."\r\n`,
	);
	return {
		name,
		type: "conan",
		method: "rcon",
		host: "127.0.0.1",
		rconPort,
		rconPassword: password,
		processName: exe,
		installDir: `${folder}\\`,
		workingDir: folder,
		startScriptPath: script,
		source: "created",
	};
}

/** Kill any fake game running from `folder`, whatever the test did. */
export function killFakeGames(folder) {
	try {
		execFileSync(
			"powershell",
			[
				"-NoProfile",
				"-Command",
				`Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '${folder.replaceAll("'", "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
			],
			{ stdio: "ignore" },
		);
	} catch {
		// Nothing running.
	}
}

/** Text of the game's own log. */
export const gameLog = (folder) => {
	try {
		return fs.readFileSync(path.join(folder, "ConanSandbox", "Saved", "Logs", "game.log"), "utf8");
	} catch {
		return "";
	}
};

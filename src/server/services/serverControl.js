import { execFile, spawn } from "child_process";
import net from "net";
import { withRcon } from "./rconClient.js";
import { sleep } from "../util/async.js";
import { checkProcess } from "./processCheck.js";
import { resolveResource } from "../../shared/resources.js";
import { effectiveWindowMode, hideWindows, markHidingStarted } from "./serverWindows.js";
import { launchWindowless, getRecordedPid, forgetPid } from "./windowlessLauncher.js";

const LAUNCH_HIDDEN_SCRIPT = resolveResource("scripts/launch-hidden.ps1");

// 7 Days to Die has no RCON, but its built-in Telnet interface (already
// enabled in serverconfig.xml, loopback-only, no password) accepts the same
// plain-text console commands as the in-game admin console — "saveworld" is
// a real, documented one. This is a much simpler protocol than Source RCON
// (no auth handshake needed for a local, passwordless connection), so a raw
// TCP socket is enough — no need for the rcon-client package here.
function sendTelnetSave(server, timeoutMs = 8000) {
	return new Promise((resolve) => {
		const socket = net.createConnection(
			{ host: server.host, port: server.telnetPort },
			() => {
				socket.write("saveworld\n");
				// No reliable "save finished" signal over telnet — same grace
				// window used for the RCON save commands below.
				setTimeout(() => {
					socket.destroy();
					resolve();
				}, 5000);
			},
		);

		socket.setTimeout(timeoutMs, () => {
			socket.destroy();
			resolve();
		});

		socket.on("error", (e) => {
			console.warn(`Telnet save failed for ${server.name}:`, e.message);
			resolve();
		});
	});
}

// RCON command that forces a world save, sent before every stop (and so
// before every update too, since updateService.js stops a server before
// running SteamCMD) — the stop/DoExit command that follows isn't guaranteed
// to save on its own for every game, and an update always kills the
// process outright once SteamCMD needs the files. Only games with a real,
// documented save command are covered here; anything else (no RCON, or
// RCON without a known save command) is silently skipped, same as
// getBroadcastCommand() in autoUpdateService.js.
function getSaveCommand(server) {
	switch (server.type) {
		case "ark":
			return "saveworld";
		case "minecraft":
			return "save-all flush";
		case "conan":
			return "saveworld";
		case "Palword":
			return "Save";
		default:
			return null;
	}
}

// Runs a server's start script. Shared by the "start" control action and
// the update-and-reboot flow (which starts servers back up once SteamCMD
// finishes).
export async function startServer(server) {
	// "No window" mode skips the start script entirely and runs the program
	// itself; every other mode goes through the script below.
	const windowMode = effectiveWindowMode(server);
	if (windowMode === "windowless") {
		await launchWindowless(server);
		return { success: true, message: `${server.name} is starting (no window)...` };
	}

	if (!server.startScriptPath) {
		throw new Error("Start script path is not configured.");
	}

	// Launched via PowerShell's Start-Process rather than the shell's own
	// `start` command. Both create a genuinely independent process — this
	// matters because some launchers (ARK, Conan, ...) already `start` the
	// actual game exe themselves partway through their own .bat (detachment
	// happens one layer in), while others (MCC5's ServerPackCreator-generated
	// start.bat) run java in the foreground the whole way: cmd -> powershell
	// -> java, no detaching anywhere in the chain. For those, a signal sent
	// to this Node process's console/process group — exactly what PM2 sends
	// on any restart, including an automatic one from max_memory_restart —
	// used to reach all the way down and kill java too, even though the
	// restart had nothing to do with that server.
	//
	// The reason it's Start-Process and not `start`: `start /MIN` still
	// visibly flashes to the foreground for an instant before minimizing —
	// confirmed directly (GetForegroundWindow() before/after showed a real
	// change even with PowerShell's own -WindowStyle Minimized). `-WindowStyle
	// Hidden` doesn't create a visible window at all, so there's nothing to
	// flash. cmd's `start` has no hidden option, only minimized — hence the
	// switch to Start-Process, which does.
	//
	// windowsHide on this spawn() call only suppresses the powershell.exe
	// process Node directly launches — it doesn't reach the actual server
	// process Start-Process creates below, which is a separate window Windows
	// creates outside this call entirely; scripts/launch-hidden.ps1's own
	// -WindowStyle Hidden is what covers that one.
	//
	// launch-hidden.ps1 runs the target via `cmd /c` rather than handing it
	// to Start-Process directly — running a .bat file with implicit /K (keep
	// the window open) semantics would leave the shell sitting there
	// indefinitely once the script finishes, even for launchers that
	// immediately detach the real game process on their own. `cmd /c` makes
	// that shell close itself the moment whatever it's running exits —
	// near-instant for scripts that self-detach, and for a foreground
	// launcher like MCC5's, closing automatically the moment the server
	// actually stops instead of leaving an empty shell behind indefinitely.
	// -ExecutionPolicy Bypass is required, not optional: Windows 11 Home
	// defaults LocalMachine to Restricted, and even at RemoteSigned a .ps1
	// extracted from a downloaded zip carries the mark-of-the-web and is
	// refused. Without this, every server start fails on a machine we don't
	// control. -NonInteractive stops a prompt from hanging a headless launch.
	const psArgs = [
		"-NoProfile",
		"-NonInteractive",
		"-ExecutionPolicy",
		"Bypass",
		"-File",
		LAUNCH_HIDDEN_SCRIPT,
		"-ScriptPath",
		server.startScriptPath,
	];
	// Subsistence's launcher refuses to run with a forced working directory.
	// This used to be decided by looking for "subsistence" in the server's
	// NAME, which meant the behaviour depended on what someone happened to
	// call their server — and any other game needing the same treatment would
	// have required a code change. It's a property of the server now.
	const skipWorkingDir =
		server.skipWorkingDir ?? server.type === "subsistence";
	if (!skipWorkingDir && server.workingDir) {
		psArgs.push("-WorkingDir", server.workingDir);
	}

	// Deliberately NOT detached: true here. Confirmed directly (isolated
	// spawn() repro, same args, only this option flipped) that adding it
	// makes the game process fail to appear at all — powershell.exe itself
	// still exits with code 0, but its own internal Start-Process call never
	// actually produces a running child. This doesn't cost us the
	// restart-survival property that detached was for elsewhere in this
	// file: Start-Process (inside launch-hidden.ps1) already creates the
	// actual game process as a genuinely independent process on its own,
	// regardless of how the short-lived powershell.exe that called it was
	// itself spawned — confirmed by restarting the API mid-run and checking
	// the game process's PID was unchanged afterward.
	return new Promise((resolve, reject) => {
		const child = spawn("powershell.exe", psArgs, {
			windowsHide: true,
		});
		child.unref();

		let output = "";
		child.stdout?.on("data", (d) => (output += d));
		child.stderr?.on("data", (d) => (output += d));

		let settled = false;
		const succeed = () => {
			if (settled) return;
			settled = true;
			// Hidden mode: the script's own window is hidden as it appears, and kept
			// hidden for a while since some games open a log window late.
			if (windowMode === "hidden") {
				markHidingStarted(server);
				hideWindows([server], 90);
			}
			resolve({ success: true, message: `${server.name} is starting...` });
		};
		const fail = (message) => {
			if (settled) return;
			settled = true;
			reject(new Error(`Failed to execute start script: ${message}`));
		};

		child.on("error", (error) => fail(error.message));

		child.on("exit", (code) => {
			// Scripts that launch the game via `start` (detaching it into its
			// own window) exit almost immediately on their own — a non-zero
			// code here means the script itself failed (bad path, etc.).
			if (code !== 0) {
				fail(output.trim() || `script exited with code ${code}`);
				return;
			}
			succeed();
		});

		// Some launchers (e.g. ones that run the server process in the
		// foreground rather than detaching it with `start`) never exit on
		// their own — that's expected, not a hang. After a grace window with
		// no error, assume the launch succeeded and leave it running.
		setTimeout(succeed, 5000);
	});
}

// Stops a server: RCON if configured, otherwise a close request by process name.
// Shared by the "stop" control action and the update flow (which stops
// servers before running SteamCMD).
export async function stopServer(server) {
	if (server.rconPort && server.rconPassword) {
		try {
			await withRcon(
				server,
				async (_rcon, send) => {
					const saveCommand = getSaveCommand(server);
					if (saveCommand) {
						try {
							await send(saveCommand);
							// The response acknowledges the command, not that the
							// write to disk has finished — give it a few seconds
							// before the stop/update that follows tears the
							// process down.
							await sleep(5000);
						} catch (e) {
							console.warn(`Save command failed for ${server.name} before stop:`, e.message);
						}
					}
					await send(
						server.type === "minecraft" || server.type === "conan" ? "stop" : "DoExit",
					);
				},
				// Generous: a busy world can take a while to acknowledge a stop.
				{ timeoutMs: 30000 },
			);
			forgetPid(server.name).catch(() => {});
			return { success: true, message: `${server.name} stop command sent via RCON.` };
		} catch {
			throw new Error("RCON command failed. Is the server online?");
		}
	}

	if (server.processName) {
		// 7 Days to Die is the one non-RCON game with a real remote save
		// command available (Telnet, already enabled in serverconfig.xml) —
		// everything else here has no such channel at all.
		if (server.telnetPort) await sendTelnetSave(server);
		const result = await gracefulThenForceKill(server);
		forgetPid(server.name).catch(() => {});
		return result;
	}

	// A server the panel launched itself has a known process id, which is
	// enough to stop it when nothing else identifies it.
	const pid = await getRecordedPid(server);
	if (pid) {
		const result = await stopByPid(server, pid);
		forgetPid(server.name).catch(() => {});
		return result;
	}

	throw new Error(`No stop method is configured for ${server.name}.`);
}

// No shell involved: the image name comes from a config file, and building a
// command string around it would let a hostile or mistyped entry inject one.
function taskkill(imageName, { force = false } = {}) {
	return new Promise((resolve) => {
		execFile(
			"taskkill",
			["/IM", imageName, ...(force ? ["/F"] : [])],
			{ windowsHide: true },
			(error, stdout, stderr) => resolve({ error, stdout, stderr }),
		);
	});
}

// For games with no RCON/Telnet (Valheim, Enshrouded, Dragonwilds, Windrose,
// Subsistence), taskkill without /F sends a close request the process's own
// shutdown handler can react to — several engines, Unreal included, run
// save-on-exit logic there — instead of an unconditional kill with zero
// warning. This isn't a guarantee the way an RCON/Telnet save command is (not
// every game honors a close request), just a real chance instead of none.
// Escalates to a forced kill only if the process is still running after the
// grace window.
async function gracefulThenForceKill(server, graceMs = 15000, pollMs = 2000) {
	await taskkill(server.processName);

	const deadline = Date.now() + graceMs;
	while (Date.now() < deadline) {
		await sleep(pollMs);
		if (!(await checkProcess(server.processName))) {
			return { success: true, message: `${server.name} closed gracefully.` };
		}
	}

	const { error, stderr } = await taskkill(server.processName, { force: true });
	if (error && !stderr.includes("not found")) {
		throw new Error(`Failed to stop server: ${error.message}`);
	}

	return {
		success: true,
		message: `${server.name} didn't close on its own within ${Math.round(graceMs / 1000)}s — force-stopped.`,
	};
}

// Close request first, then a forced kill of the whole tree if it's still
// running after the grace window. By process id, so it can only ever affect the
// program the panel started.
async function stopByPid(server, pid, graceMs = 15000, pollMs = 2000) {
	const kill = (force) =>
		new Promise((resolve) => {
			execFile("taskkill", ["/PID", String(pid), ...(force ? ["/T", "/F"] : [])], { windowsHide: true }, () => resolve());
		});

	await kill(false);
	const deadline = Date.now() + graceMs;
	while (Date.now() < deadline) {
		await sleep(pollMs);
		if (!(await getRecordedPid(server))) {
			return { success: true, message: `${server.name} closed gracefully.` };
		}
	}
	await kill(true);
	return {
		success: true,
		message: `${server.name} didn't close on its own within ${Math.round(graceMs / 1000)}s — force-stopped.`,
	};
}

// Sends an arbitrary RCON command and returns the raw response text.
// Some games (ARK in particular) only accept one RCON session at a time, and
// the background polling loop connects periodically too — so a command sent
// at the wrong moment can sit waiting for that session to free up. The
// timeout keeps that a clear error instead of a hung request.
export async function sendRconCommand(server, command, timeoutMs = 8000) {
	if (!server.rconPort || !server.rconPassword) {
		throw new Error(`RCON is not configured for ${server.name}.`);
	}
	try {
		return await withRcon(server, (_rcon, send) => send(command), { timeoutMs });
	} catch (e) {
		throw new Error(
			`RCON command failed: ${e.message}. The server may be busy (only one RCON session at a time) — try again in a few seconds.`,
		);
	}
}

import { exec, spawn } from "child_process";
import net from "net";
import { Rcon } from "rcon-client";
import { checkProcess } from "./processCheck.js";
import { resolveResource } from "../../shared/resources.js";

const LAUNCH_HIDDEN_SCRIPT = resolveResource("scripts/launch-hidden.ps1");

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// Sends the appropriate stop command for a server: RCON if it's configured,
// otherwise taskkill by process name. Shared by the "stop" control action
// and the update flow (which stops servers before running SteamCMD).
export async function stopServer(server) {
	if (server.rconPort && server.rconPassword) {
		let rcon;
		try {
			rcon = new Rcon({
				host: server.host,
				port: server.rconPort,
				password: server.rconPassword,
			});

			// Without a listener, an 'error' event on this EventEmitter is
			// fatal to the whole process (same reason pollingService.js's RCON
			// polling attaches one) — a flaky socket here would otherwise take
			// down every server, not just this request.
			rcon.on("error", (err) => {
				console.warn(`RCON error on ${server.name}:`, err.message);
			});

			await rcon.connect();

			const saveCommand = getSaveCommand(server);
			if (saveCommand) {
				try {
					await rcon.send(saveCommand);
					// The RCON response for saveworld/Save acknowledges the
					// command, not that the write to disk has finished — give it
					// a few seconds before the stop/update that follows actually
					// tears the process down.
					await sleep(5000);
				} catch (e) {
					console.warn(
						`Save command failed for ${server.name} before stop:`,
						e.message,
					);
				}
			}

			const command =
				server.type === "minecraft" || server.type === "conan"
					? "stop"
					: "DoExit";

			await rcon.send(command);

			return {
				success: true,
				message: `${server.name} stop command sent via RCON.`,
			};
		} catch (e) {
			throw new Error("RCON command failed. Is the server online?");
		} finally {
			// rcon.end() waits for the game process to actually exit and close
			// the socket — for ARK that can take well past a typical client
			// timeout even though the stop command was already delivered. Same
			// fix as sendRconCommand() below: destroy the socket directly
			// instead of waiting on it.
			try {
				rcon?.socket?.destroy();
			} catch (e) {
				// already closed/never opened — nothing to do
			}
		}
	}

	if (server.processName) {
		// 7 Days to Die is the one non-RCON game with a real remote save
		// command available (Telnet, already enabled in serverconfig.xml) —
		// everything else here has no such channel at all.
		if (server.telnetPort) {
			await sendTelnetSave(server);
		}

		return gracefulThenForceKill(server);
	}

	throw new Error(`No stop method is configured for ${server.name}.`);
}

function execAsync(cmd) {
	return new Promise((resolve) => {
		exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
			resolve({ error, stdout, stderr });
		});
	});
}

// For games with no RCON/Telnet (Valheim, Enshrouded, Dragonwilds, Windrose,
// Subsistence), taskkill without /F sends a close request the process's own
// shutdown handler can react to — several engines, Unreal included, run
// save-on-exit logic there — instead of an unconditional kill with zero
// warning, which is all a straight `/F` ever gave them. This isn't a
// guarantee the way an RCON/Telnet save command is (not every game honors a
// close request, and some will simply fail to close this way at all), just
// a real chance instead of none. Escalates to a forced kill only if the
// process is still running after the grace window.
async function gracefulThenForceKill(server, graceMs = 15000, pollMs = 2000) {
	await execAsync(`taskkill /IM "${server.processName}"`);

	const deadline = Date.now() + graceMs;
	while (Date.now() < deadline) {
		await sleep(pollMs);
		if (!(await checkProcess(server.processName))) {
			return { success: true, message: `${server.name} closed gracefully.` };
		}
	}

	const { error, stderr } = await execAsync(
		`taskkill /IM "${server.processName}" /F`,
	);
	if (error && !stderr.includes("not found")) {
		throw new Error(`Failed to stop server: ${error.message}`);
	}

	return {
		success: true,
		message: `${server.name} didn't close on its own within ${Math.round(graceMs / 1000)}s — force-stopped.`,
	};
}

// Sends an arbitrary RCON command and returns the raw response text.
// Some games (ARK in particular) only accept one RCON session at a time, and
// the background polling loop is also connecting every ~7.5s — so a command
// sent at the wrong moment can sit waiting for that session to free up. A
// timeout keeps that as a clear error instead of the request hanging.
export async function sendRconCommand(server, command, timeoutMs = 8000) {
	if (!server.rconPort || !server.rconPassword) {
		throw new Error(`RCON is not configured for ${server.name}.`);
	}

	let rcon;
	try {
		rcon = new Rcon({
			host: server.host,
			port: server.rconPort,
			password: server.rconPassword,
		});

		// Same reason as stopServer() above — an unhandled 'error' event here
		// crashes the whole process, not just this command.
		rcon.on("error", (err) => {
			console.warn(`RCON error on ${server.name}:`, err.message);
		});

		const withTimeout = (promise, label) =>
			Promise.race([
				promise,
				new Promise((_, reject) =>
					setTimeout(
						() => reject(new Error(`${label} timed out`)),
						timeoutMs,
					),
				),
			]);

		await withTimeout(rcon.connect(), "RCON connect");
		return await withTimeout(rcon.send(command), "RCON send");
	} catch (e) {
		throw new Error(
			`RCON command failed: ${e.message}. The server may be busy (only one RCON session at a time) — try again in a few seconds.`,
		);
	} finally {
		// rcon.end() waits for a graceful close ack that some games (ARK in
		// particular) never send for non-terminal commands — it only resolves
		// reliably for "stop", where the process exit forces the socket shut.
		// Destroying the socket directly (same as pollingService.js's RCON
		// polling) avoids hanging the whole request on that.
		try {
			rcon?.socket?.destroy();
		} catch (e) {
			// already closed/never opened — nothing to do
		}
	}
}

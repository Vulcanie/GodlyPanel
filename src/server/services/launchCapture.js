import { execFile } from "node:child_process";
import path from "node:path";
import { findMatches } from "./serverResourceStats.js";

// Some servers can't have their launch read out of a start script — Minecraft's
// goes through a PowerShell installer chain, 7 Days to Die's is full of loops
// and WMIC calls. But when one is running, Windows knows exactly how it was
// started, and that is what "no window" mode needs. So: find the server's
// process (by the same matching the CPU/RAM stats use) and read its command
// line.

const QUERY =
	"Get-CimInstance Win32_Process | Select-Object ProcessId, Name, ExecutablePath, CommandLine | ConvertTo-Json -Compress";

function listProcesses() {
	return new Promise((resolve, reject) => {
		execFile(
			"powershell.exe",
			["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", QUERY],
			{ windowsHide: true, timeout: 20_000, maxBuffer: 32 * 1024 * 1024 },
			(error, stdout) => {
				if (error) return reject(error);
				try {
					const parsed = JSON.parse(stdout);
					resolve(Array.isArray(parsed) ? parsed : [parsed]);
				} catch {
					reject(new Error("Couldn't read the list of running programs."));
				}
			},
		);
	});
}

/**
 * The ids of programs listening (TCP) on these ports. A server's own ports are a sure way to tell which of
 * several Java programs is its own, where the command line has nothing that says so.
 */
function ownersOfPorts(ports) {
	const wanted = [...new Set(ports)].filter((p) => Number.isInteger(p) && p > 0 && p < 65536);
	if (wanted.length === 0) return Promise.resolve([]);
	return new Promise((resolve) => {
		execFile(
			"powershell.exe",
			["-NoProfile", "-NonInteractive", "-Command", `(Get-NetTCPConnection -State Listen -LocalPort ${wanted.join(",")} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -join ','`],
			{ windowsHide: true, timeout: 15_000 },
			(error, stdout) => resolve(error ? [] : String(stdout).trim().split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0)),
		);
	});
}

/** Everything after the program name on a Windows command line. */
export function argumentsOf(commandLine, exe) {
	const line = String(commandLine ?? "").trim();
	if (line.startsWith('"')) {
		const close = line.indexOf('"', 1);
		return close === -1 ? "" : line.slice(close + 1).trim();
	}
	// Unquoted: the full path (which may contain spaces) or, failing that, a bare name.
	if (exe && line.toLowerCase().startsWith(exe.toLowerCase())) return line.slice(exe.length).trim();
	const space = line.search(/\s/);
	return space === -1 ? "" : line.slice(space).trim();
}

/**
 * @returns {Promise<{ ok: true, launch: object, notes: string[] } | { ok: false, reason: string }>}
 */
export async function captureLaunch(server) {
	let processes;
	try {
		processes = await listProcesses();
	} catch (err) {
		return { ok: false, reason: err.message };
	}

	// The stats matcher compares names without ".exe" (that's how the
	// performance counters report them; this list comes from a different class).
	const adapted = processes
		.filter((p) => p.Name)
		.map((p) => ({ ...p, Name: p.Name.replace(/\.exe$/i, ""), ProcessId: p.ProcessId }));
	let matches = findMatches(server, adapted).filter((p) => p.ExecutablePath && p.CommandLine);
	// Not recognised by name or command line (a Minecraft server the panel made, for one): the program that
	// is listening on this server's own ports is it.
	if (matches.length === 0) {
		const owners = new Set(await ownersOfPorts([server.rconPort, server.port, server.queryPort]));
		matches = adapted.filter((p) => owners.has(Number(p.ProcessId)) && p.ExecutablePath && p.CommandLine);
	}

	if (matches.length === 0) {
		return {
			ok: false,
			reason:
				"That server isn't running (or couldn't be recognised), so there's nothing to copy. Start it the way you normally do, then try again.",
		};
	}

	const process_ = matches[0];
	const exe = process_.ExecutablePath;
	const args = argumentsOf(process_.CommandLine, exe);
	const notes = [];

	if (matches.length > 1) {
		notes.push(`${matches.length} processes matched; the first was used.`);
	}
	// ServerPackCreator's start.ps1 rewrites this file from variables.txt on every
	// start. Launching directly reads whatever is in it now.
	if (/@user_jvm_args\.txt/i.test(args)) {
		notes.push(
			"This uses user_jvm_args.txt as it is now. Your start script rewrites that file from variables.txt each time it runs, so in No window mode a change to the memory settings in variables.txt won't apply until you edit user_jvm_args.txt too.",
		);
	}
	notes.push("Environment variables your start script sets aren't visible from outside, so they aren't copied.");

	return {
		ok: true,
		launch: { exe, args, cwd: server.workingDir || path.dirname(exe) },
		notes,
	};
}

import { spawn, execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";

// "No window" mode: the panel starts the game program itself instead of going
// through the server's start script. That script's `start /MIN game.exe` is
// what opens a console on the taskbar; here there is no shell, no `start`, and
// the process gets CREATE_NO_WINDOW, so there is nothing to show.
//
// A side benefit: with no window to read, the program's output goes to a log
// file the panel can show, and the panel knows the process id exactly.

const PID_FILE = path.join(paths.dataDir, "state", "server-pids.json");
// Windows' own command interpreter, by full path (a PATH that lists Git's Unix tools first must not change it).
const COMSPEC = process.env.ComSpec || path.join(process.env.SystemRoot || "C:/Windows", "System32", "cmd.exe");
const enqueue = createWriteQueue();
const MAX_LOG_BYTES = 5 * 1024 * 1024;
const EARLY_EXIT_WINDOW_MS = 3000;

const PRIORITIES = {
	low: os.constants.priority.PRIORITY_LOW,
	belowNormal: os.constants.priority.PRIORITY_BELOW_NORMAL,
	normal: os.constants.priority.PRIORITY_NORMAL,
	aboveNormal: os.constants.priority.PRIORITY_ABOVE_NORMAL,
	high: os.constants.priority.PRIORITY_HIGH,
	realtime: os.constants.priority.PRIORITY_HIGHEST,
};

const safeName = (name) => String(name).replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80) || "server";

export function serverLogPath(server) {
	return path.join(paths.serverLogsDir, `${safeName(server.name)}.log`);
}

// ---- process id registry -------------------------------------------------

async function readPids() {
	return (await readJson(PID_FILE, {})) ?? {};
}

function recordPid(name, pid, exe) {
	return enqueue(async () => {
		const all = await readPids();
		all[name] = { pid, exe: path.basename(exe), at: Date.now() };
		await writeJsonAtomic(PID_FILE, all);
	});
}

export function forgetPid(name) {
	return enqueue(async () => {
		const all = await readPids();
		if (!(name in all)) return;
		delete all[name];
		await writeJsonAtomic(PID_FILE, all);
	});
}

/** Does this process id still belong to the program we started? (Ids get reused.) */
function pidIsStill(pid, imageName) {
	return new Promise((resolve) => {
		execFile(
			"tasklist",
			["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"],
			{ windowsHide: true, timeout: 5000 },
			(error, stdout) => {
				if (error) return resolve(false);
				const match = stdout.match(/^"([^"]*)"/);
				resolve(Boolean(match) && match[1].toLowerCase() === imageName.toLowerCase().slice(0, 25));
			},
		);
	});
}

/** The live process id of a server the panel launched itself, or null. */
export async function getRecordedPid(server) {
	const entry = (await readPids())[server.name];
	if (!entry) return null;
	return (await pidIsStill(entry.pid, entry.exe)) ? entry.pid : null;
}

// ---- launching -----------------------------------------------------------

function rotateIfLarge(file) {
	try {
		if (fs.statSync(file).size > MAX_LOG_BYTES) fs.renameSync(file, `${file}.1`);
	} catch {
		// No log yet.
	}
}

function tailOf(file, bytes = 1500) {
	try {
		const size = fs.statSync(file).size;
		const fd = fs.openSync(file, "r");
		const buf = Buffer.alloc(Math.min(bytes, size));
		fs.readSync(fd, buf, 0, buf.length, Math.max(0, size - buf.length));
		fs.closeSync(fd);
		return buf.toString("utf8").trim();
	} catch {
		return "";
	}
}

export function launchProblem(launch) {
	if (!launch || typeof launch.exe !== "string") return "No program has been set for this server.";
	if (!fs.existsSync(launch.exe)) return `The program "${launch.exe}" doesn't exist.`;
	if (launch.cwd && !fs.existsSync(launch.cwd)) return `The folder "${launch.cwd}" doesn't exist.`;
	return null;
}

/**
 * Start `server.launch` with no window. Resolves once it's running (or has
 * clearly failed); the process is left running on its own after this returns.
 */
export async function launchWindowless(server) {
	const launch = server.launch;
	const problem = launchProblem(launch);
	if (problem) throw new Error(problem);

	writeScriptFiles(launch);

	fs.mkdirSync(paths.serverLogsDir, { recursive: true });
	const logFile = serverLogPath(server);
	rotateIfLarge(logFile);
	let fd = fs.openSync(logFile, "a");
	fs.writeSync(fd, `\n--- started ${new Date().toISOString()} ---\n`);

	// Through a hidden `cmd`, so a console program (most dedicated servers are) gets a console with no window.
	// Started directly with its output going to a file, Windows is never asked for a hidden console, so a
	// console program makes its own, and on Windows 11 that opens as a visible Windows Terminal window.
	// With nothing inherited (stdio "ignore") Node does ask for no window, and `cmd` writes the log itself.
	// Arguments cmd would read differently from the game (see cmdSafe) are launched directly, as before.
	const viaCmd = cmdSafe(launch.args ?? "") && !/["%]/.test(launch.exe) && !/["%]/.test(logFile);
	const cwd = launch.cwd || path.dirname(launch.exe);
	const env = { ...process.env, ...(launch.env ?? {}) };

	let child;
	try {
		if (viaCmd) {
			fs.closeSync(fd); // cmd opens the log itself, below.
			fd = -1;
			// With /s, cmd drops the first and last quote of the line and runs the rest exactly as written.
			const line = `""${launch.exe}"${launch.args ? ` ${launch.args}` : ""} >> "${logFile}" 2>&1"`;
			child = spawn(COMSPEC, ["/d", "/s", "/c", line], { cwd, env, windowsHide: true, windowsVerbatimArguments: true, stdio: "ignore" });
		} else {
			child = spawn(launch.exe, launch.args ? [launch.args] : [], {
				cwd,
				env,
				detached: true, // Its own process group: outlives the panel, as servers should.
				windowsHide: true,
				// The tail of the start line, exactly as the script had it. Node would
				// otherwise re-quote each piece, which changes what the game sees for
				// things like -Key="a b"; and in this mode it also stops quoting the
				// program path, so that's supplied quoted, or a game in a folder with a
				// space in its name receives a corrupted command line.
				windowsVerbatimArguments: true,
				argv0: `"${launch.exe}"`,
				stdio: ["ignore", fd, fd],
			});
		}
	} finally {
		// The child has its own copy of the handle.
		if (fd >= 0) fs.closeSync(fd);
	}

	await new Promise((resolve, reject) => {
		child.once("error", reject);
		child.once("spawn", resolve);
	});
	child.unref();

	// The program itself is a child of the cmd that was started; find it once it's up.
	const found = viaCmd ? findChildPid(child.pid, path.basename(launch.exe)) : Promise.resolve(child.pid);

	// A program that dies straight away has almost always been given bad
	// arguments or is missing a file — say so rather than reporting a launch.
	let exitCode = null;
	child.once("exit", (code) => {
		exitCode = code ?? -1;
	});
	await new Promise((resolve) => setTimeout(resolve, EARLY_EXIT_WINDOW_MS));
	if (exitCode !== null && exitCode !== 0) {
		const output = tailOf(logFile);
		throw new Error(
			`${path.basename(launch.exe)} exited straight away (code ${exitCode}).${output ? ` Its output:\n${output}` : ""}`,
		);
	}

	// The program's own id when it can be found; otherwise the cmd around it, which lasts exactly as long.
	const gamePid = await found;
	const pid = gamePid ?? child.pid;
	const exe = gamePid ? launch.exe : COMSPEC;

	const priority = PRIORITIES[launch.priority];
	if (priority !== undefined) {
		try {
			os.setPriority(pid, priority);
		} catch {
			// Not fatal; the server just runs at normal priority.
		}
	}

	await recordPid(server.name, pid, exe);
	return { pid };
}

/**
 * Would cmd pass this command-line text to the program exactly as written? Inside quotes, & | < > ^ mean nothing
 * to cmd, so quoted arguments such as -ServerName="My Server" are fine; outside quotes they are cmd's own
 * operators. A percent sign is expanded as a variable wherever it is, and an odd number of quotes leaves the
 * rest of the line quoted.
 */
export function cmdSafe(text) {
	const s = String(text);
	if (s.includes("%") || /[\r\n]/.test(s)) return false;
	if ((s.match(/"/g) ?? []).length % 2 !== 0) return false;
	return !/[&|<>^]/.test(s.replace(/"[^"]*"/g, ""));
}

/**
 * Files the start script writes before it launches the program (Steam's steam_appid.txt, say), which a direct
 * launch would otherwise skip. Only inside the program's own folder, and only when they differ from what is there.
 */
function writeScriptFiles(launch) {
	const folder = path.resolve(launch.cwd || path.dirname(launch.exe)).toLowerCase() + path.sep;
	for (const file of Array.isArray(launch.files) ? launch.files : []) {
		if (typeof file?.path !== "string" || typeof file?.text !== "string") continue;
		const target = path.resolve(file.path);
		if (!target.toLowerCase().startsWith(folder)) continue;
		try {
			if (fs.existsSync(target) && fs.readFileSync(target, "utf8") === file.text) continue;
			fs.writeFileSync(target, file.text, "utf8");
		} catch {
			// The program may still start; if it can't, its own log will say why.
		}
	}
}

/** The process id of a child of `parentPid` with this program name, waiting a while for it to appear. Null if it doesn't. */
function findChildPid(parentPid, imageName) {
	return new Promise((resolve) => {
		// Only an ordinary program name is put into the command.
		if (!Number.isInteger(parentPid) || !/^[A-Za-z0-9 ._()+-]+$/.test(imageName)) return resolve(null);
		const script = `$end=(Get-Date).AddSeconds(25); do { $c = Get-CimInstance Win32_Process -Filter "ParentProcessId=${parentPid}" | Where-Object { $_.Name -ieq '${imageName}' } | Select-Object -First 1; if ($c) { $c.ProcessId; exit 0 }; Start-Sleep -Milliseconds 300 } while ((Get-Date) -lt $end); exit 1`;
		execFile("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 40_000 }, (error, stdout) => {
			const id = Number(String(stdout).trim().split(/\s+/)[0]);
			resolve(!error && Number.isInteger(id) && id > 0 ? id : null);
		});
	});
}

// ---- reading the log -----------------------------------------------------

const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

/**
 * Read new output since `offset` (or the tail, on first ask). Returns `next`
 * to pass back. If the file shrank — rotation — it starts over from the tail.
 */
export function readServerLog(server, offset) {
	const file = serverLogPath(server);
	let size;
	try {
		size = fs.statSync(file).size;
	} catch {
		return { exists: false, size: 0, next: 0, text: "" };
	}

	const TAIL = 64 * 1024;
	const MAX = 256 * 1024;
	let start = Number.isInteger(offset) && offset >= 0 && offset <= size ? offset : Math.max(0, size - TAIL);
	const length = Math.min(size - start, MAX);
	const buf = Buffer.alloc(length);
	const fd = fs.openSync(file, "r");
	try {
		fs.readSync(fd, buf, 0, length, start);
	} finally {
		fs.closeSync(fd);
	}
	return {
		exists: true,
		size,
		next: start + length,
		reset: offset === undefined || offset > size,
		text: buf.toString("utf8").replace(ANSI, ""),
	};
}

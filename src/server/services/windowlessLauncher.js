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

	fs.mkdirSync(paths.serverLogsDir, { recursive: true });
	const logFile = serverLogPath(server);
	rotateIfLarge(logFile);
	const fd = fs.openSync(logFile, "a");
	fs.writeSync(fd, `\n--- started ${new Date().toISOString()} ---\n`);

	let child;
	try {
		child = spawn(launch.exe, launch.args ? [launch.args] : [], {
			cwd: launch.cwd || path.dirname(launch.exe),
			env: { ...process.env, ...(launch.env ?? {}) },
			detached: true, // Its own process group: outlives the panel, as servers should.
			windowsHide: true, // CREATE_NO_WINDOW.
			// The tail of the start line, exactly as the script had it. Node would
			// otherwise re-quote each piece, which changes what the game sees for
			// things like -Key="a b"; and in this mode it also stops quoting the
			// program path, so that's supplied quoted, or a game in a folder with a
			// space in its name receives a corrupted command line.
			windowsVerbatimArguments: true,
			argv0: `"${launch.exe}"`,
			stdio: ["ignore", fd, fd],
		});
	} finally {
		// The child has its own copy of the handle.
		fs.closeSync(fd);
	}

	await new Promise((resolve, reject) => {
		child.once("error", reject);
		child.once("spawn", resolve);
	});
	child.unref();

	const priority = PRIORITIES[launch.priority];
	if (priority !== undefined) {
		try {
			os.setPriority(child.pid, priority);
		} catch {
			// Not fatal; the server just runs at normal priority.
		}
	}

	// A program that dies straight away has almost always been given bad
	// arguments or is missing a file — say so rather than reporting a launch.
	const exited = await new Promise((resolve) => {
		const timer = setTimeout(() => resolve(null), EARLY_EXIT_WINDOW_MS);
		child.once("exit", (code) => {
			clearTimeout(timer);
			resolve(code);
		});
	});
	if (exited !== null && exited !== 0) {
		const output = tailOf(logFile);
		throw new Error(
			`${path.basename(launch.exe)} exited straight away (code ${exited}).${output ? ` Its output:\n${output}` : ""}`,
		);
	}

	await recordPid(server.name, child.pid, launch.exe);
	return { pid: child.pid };
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

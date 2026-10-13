#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { listProcesses, treeOf } from "./procs.mjs";

// Linux stand-ins for the handful of Windows programs the panel runs: tasklist,
// taskkill, powershell, cmd and tar.exe. They let the API tests run on a Linux
// machine (and so on cheap CI runners) against stand-in games, with the panel's own
// code running unchanged. Each one answers only the exact requests the panel makes
// today; anything else fails loudly, so a new call into Windows shows up as a clear
// error here instead of a silent wrong answer. The real tools are exercised by the
// Windows job in CI, which runs the same tests without this folder on the PATH.
//
// Usage (from the wrappers in ./bin): node winshim.mjs <tool> <arguments...>

const [rawTool, ...args] = process.argv.slice(2);
const tool = rawTool.replace(/\.exe$/i, "");

const die = (message, code = 1) => {
	process.stderr.write(`winshim: ${message}\n`);
	process.exit(code);
};

const csv = (...cells) => cells.map((c) => `"${c}"`).join(",");

// ---- tasklist -----------------------------------------------------------------------------------

function tasklist() {
	// The forms the panel and the tests use: /FO CSV /NH, optionally /FI "PID eq N" or /FI "IMAGENAME eq name".
	const filter = args.indexOf("/FI") >= 0 ? args[args.indexOf("/FI") + 1] : "";
	const wantedPid = /^PID eq (\d+)$/i.exec(filter)?.[1];
	const wantedName = /^IMAGENAME eq (.+)$/i.exec(filter)?.[1];
	if (filter && wantedPid === undefined && wantedName === undefined) die(`tasklist filter not supported: ${filter}`);
	const rows = listProcesses().filter((p) => (wantedPid === undefined || p.pid === Number(wantedPid)) && (wantedName === undefined || p.name.toLowerCase() === wantedName.toLowerCase()));
	if (rows.length === 0) {
		process.stdout.write("INFO: No tasks are running which match the specified criteria.\r\n");
		return;
	}
	for (const p of rows) process.stdout.write(csv(p.name, p.pid, "Console", "1", `${Math.round(p.ramBytes / 1024).toLocaleString("en-US")} K`) + "\r\n");
}

// ---- taskkill -----------------------------------------------------------------------------------

function taskkill() {
	const at = args.findIndex((a) => a.toUpperCase() === "/PID");
	const pid = Number(args[at + 1]);
	if (at < 0 || !Number.isInteger(pid)) die("taskkill: only /PID <id> [/T] [/F] is supported");
	const force = args.some((a) => a.toUpperCase() === "/F");
	const tree = args.some((a) => a.toUpperCase() === "/T");
	if (!listProcesses().some((p) => p.pid === pid)) {
		process.stderr.write(`ERROR: The process "${pid}" not found.\r\n`);
		process.exit(128);
	}
	// Without /F Windows asks the program to close, which a console program can honour; SIGTERM is the same request.
	const signal = force ? "SIGKILL" : "SIGTERM";
	for (const target of tree ? treeOf(pid) : [pid]) {
		try {
			process.kill(target, signal);
		} catch {
			// Gone already.
		}
	}
	process.stdout.write(`SUCCESS: Sent termination signal to the process with PID ${pid}.\r\n`);
}

// ---- cmd ----------------------------------------------------------------------------------------

// The panel starts "no window" servers as `cmd /d /s /c ""exe" args >> "log" 2>&1"`. With /s cmd drops the first and
// last quote and runs the rest, and that rest is valid shell too, so a shell stands in for cmd.
function cmd() {
	const at = args.findIndex((a) => a.toLowerCase() === "/c");
	if (at < 0) die("cmd: only /c <line> is supported");
	let line = args.slice(at + 1).join(" ");
	if (args.some((a) => a.toLowerCase() === "/s") && line.startsWith('"') && line.endsWith('"')) line = line.slice(1, -1);
	const child = spawn("sh", ["-c", line], { stdio: "inherit" });
	child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
	for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
}

// ---- starting a start script (launch-hidden.ps1) -----------------------------------------------

const splitWords = (text) => [...text.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => ({ text: m[1] ?? m[2], quoted: m[1] !== undefined }));

/**
 * Run a Windows start script the way Start-Process + cmd /c would, for the few lines the tests' scripts use:
 * `cd /d`, and `start` or a bare program name that is a file next to the script. Everything else (echo, rem, set...) is ignored.
 */
function runStartScript(script, workingDir) {
	const scriptDir = path.dirname(path.resolve(script));
	let cwd = workingDir || scriptDir;
	if (!/\.(bat|cmd)$/i.test(script)) {
		// Not a batch file: a shell script that stands in for one.
		spawn("sh", [script], { cwd, detached: true, stdio: "ignore" }).unref();
		return;
	}
	const text = fs.readFileSync(script, "utf8").replaceAll("%~dp0", scriptDir + "/");
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.replace(/^@/, "").trim();
		if (!line || /^(rem\b|::|echo\b|set\b|timeout\b|title\b)/i.test(line)) continue;
		let words = splitWords(line);
		if (/^cd$/i.test(words[0].text)) {
			cwd = path.resolve(cwd, words.filter((w, i) => i > 0 && !/^\/d$/i.test(w.text)).map((w) => w.text).join(" "));
			continue;
		}
		if (/^start$/i.test(words[0].text)) {
			words = words.slice(1);
			while (words[0]?.text.startsWith("/")) words.shift(); // /MIN and friends
			// A quoted first word is the window's title, as long as a program follows it.
			if (words.length > 1 && words[0].quoted) words.shift();
		}
		words = words.map((w) => w.text);
		const exe = path.resolve(cwd, words[0] ?? "");
		if (!words[0] || !fs.existsSync(exe) || !fs.statSync(exe).isFile()) continue;
		// argv[0] is the full path, which is how the process list tells where a program runs from.
		spawn(exe, words.slice(1), { cwd, argv0: exe, detached: true, stdio: "ignore" }).unref();
	}
}

// ---- powershell ---------------------------------------------------------------------------------

const param = (name) => {
	const at = args.findIndex((a) => a.toLowerCase() === `-${name.toLowerCase()}`);
	return at >= 0 ? args[at + 1] : undefined;
};

/** What ConvertTo-Json prints: one object for one result, an array for several, nothing for none. */
const asJson = (rows) => (rows.length === 0 ? "" : JSON.stringify(rows.length === 1 ? rows[0] : rows));

function powershellFile(file) {
	const name = path.basename(file).toLowerCase();
	if (name === "launch-hidden.ps1") return runStartScript(param("ScriptPath"), param("WorkingDir"));
	if (name === "firewall-rules.ps1") return process.stdout.write("[]");
	if (name === "window-control.ps1") return process.stdout.write('{"changed":0}');
	if (name === "process-resource-sample.ps1") {
		// The performance-counter class names programs without ".exe".
		const rows = listProcesses().map((p) => ({ ProcessId: p.pid, Name: p.name.replace(/\.exe$/i, ""), CpuPercent: 0, RamMB: Math.round(p.ramBytes / 1048576 * 10) / 10, CommandLine: p.commandLine }));
		return process.stdout.write(JSON.stringify(rows));
	}
	die(`powershell script not supported: ${name}`);
}

function powershellCommand(script) {
	let m;
	if (/Get-NetTCPConnection/.test(script)) return; // nobody is listening, as far as this stand-in can tell
	if (/Start-Process powershell -Verb RunAs/.test(script)) return;
	if ((m = /ParentProcessId=(\d+).*-ieq '([^']+)'/.exec(script))) {
		// Wait a while for the program to appear below the process, as the real script does. A descendant, not just a
		// child: the shell that stands in for cmd may sit in between.
		const deadline = Date.now() + 25_000;
		do {
			const all = listProcesses();
			const found = treeOf(Number(m[1]), all).find((pid) => pid !== Number(m[1]) && all.find((p) => p.pid === pid)?.name.toLowerCase() === m[2].toLowerCase());
			if (found) return process.stdout.write(`${found}\r\n`);
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
		} while (Date.now() < deadline);
		process.exit(1);
	}
	if ((m = /Win32_Process -Filter "Name='([^']+)'" \| Where-Object \{ \$_\.ExecutablePath -like '(.*)\*' \} \| Measure-Object\)\.Count/.exec(script))) {
		// A test counting one program's copies under a folder.
		const prefix = m[2].replaceAll("''", "'");
		const count = listProcesses().filter((p) => p.name.toLowerCase() === m[1].toLowerCase() && p.exe?.startsWith(prefix)).length;
		return process.stdout.write(`${count}\r\n`);
	}
	if ((m = /Win32_Process -Filter "Name='([^']+)'" \| ForEach-Object/.exec(script))) {
		for (const p of listProcesses().filter((x) => x.name.toLowerCase() === m[1].replace(/''/g, "'").toLowerCase())) process.stdout.write(`${p.pid}|${p.exe ?? ""}\r\n`);
		return;
	}
	if ((m = /Win32_Process -Filter "Name='([^']+)'" \| Select-Object ProcessId, CommandLine/.exec(script))) {
		const rows = listProcesses().filter((x) => x.name.toLowerCase() === m[1].toLowerCase()).map((p) => ({ ProcessId: p.pid, CommandLine: p.commandLine }));
		return process.stdout.write(asJson(rows));
	}
	if ((m = /\(Get-CimInstance Win32_Process -Filter "ProcessId=(\d+)"\)\.ExecutablePath/.exec(script))) {
		return process.stdout.write(`${listProcesses().find((p) => p.pid === Number(m[1]))?.exe ?? ""}\r\n`);
	}
	if (/^Get-CimInstance Win32_Process \| Select-Object ProcessId, Name, ExecutablePath, CommandLine \| ConvertTo-Json -Compress$/.test(script.trim())) {
		return process.stdout.write(asJson(listProcesses().map((p) => ({ ProcessId: p.pid, Name: p.name, ExecutablePath: p.exe, CommandLine: p.commandLine }))));
	}
	die(`powershell command not supported: ${script.slice(0, 200)}`);
}

function powershell() {
	const file = param("File");
	if (file) return powershellFile(file);
	const command = param("Command");
	if (command !== undefined) return powershellCommand(command);
	die("powershell: needs -File or -Command");
}

// ---- tar.exe ------------------------------------------------------------------------------------

// Windows' bsdtar writes and reads zips with -a. This does the same with the zip library the panel already depends on.
function tar() {
	const require = createRequire(import.meta.url);
	const AdmZip = require(path.resolve(import.meta.dirname, "..", "..", "..", "node_modules", "adm-zip"));
	const has = (flag) => args.includes(flag);
	const file = args[0] === "-tf" || args[0] === "-xf" ? args[1] : args[args.indexOf("-f") + 1];

	if (has("-c")) {
		const zip = new AdmZip();
		const exclude = [];
		for (let i = 0; i < args.length; i += 1) if (args[i] === "--exclude") exclude.push(args[i + 1].replaceAll("\\", "/"));
		// Like bsdtar, a pattern is a wildcard (* matches anything, slashes included) that may match from any folder level.
		const patterns = exclude.map((e) => new RegExp(`^(.*/)?${e.replace(/[.+^${}()|\\]/g, "\\$&").replaceAll("*", ".*").replaceAll("?", ".")}(/.*)?$`));
		const skipped = (name) => patterns.some((re) => re.test(name));
		const add = (full, name) => {
			if (skipped(name)) return;
			if (fs.statSync(full).isDirectory()) {
				zip.addFile(`${name}/`, Buffer.alloc(0));
				for (const child of fs.readdirSync(full)) add(path.join(full, child), `${name}/${child}`);
			} else {
				zip.addFile(name, fs.readFileSync(full));
			}
		};
		for (let i = 0; i < args.length; i += 1) if (args[i] === "-C") add(path.join(args[i + 1], args[i + 2]), args[i + 2]);
		zip.writeZip(args[args.indexOf("-f") + 1]);
		return;
	}
	let zip;
	try {
		zip = new AdmZip(file);
	} catch (error) {
		die(`This does not look like a tar archive (${error.message})`);
	}
	if (args[0] === "-tf") return process.stdout.write(zip.getEntries().map((e) => e.entryName).join("\n") + "\n");
	if (args[0] === "-xf") {
		const dest = path.resolve(args[args.indexOf("-C") + 1]);
		const names = args.slice(args.indexOf("-C") + 2);
		for (const entry of zip.getEntries()) {
			if (names.length > 0 && !names.some((n) => entry.entryName === n || entry.entryName.startsWith(`${n}/`))) continue;
			const target = path.resolve(dest, entry.entryName);
			if (!target.startsWith(dest + path.sep)) continue;
			if (entry.isDirectory) fs.mkdirSync(target, { recursive: true });
			else {
				fs.mkdirSync(path.dirname(target), { recursive: true });
				fs.writeFileSync(target, entry.getData());
			}
		}
		return;
	}
	die(`tar: not supported: ${args.join(" ")}`);
}

const tools = { tasklist, taskkill, cmd, powershell, tar };
if (!tools[tool]) die(`unknown tool ${tool}`);
tools[tool]();

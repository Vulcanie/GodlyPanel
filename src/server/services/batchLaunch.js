import fs from "node:fs";
import path from "node:path";

// Works out, from a server's start script, what program it ultimately runs —
// so the panel can launch that program itself with no window, instead of
// going through `start /MIN`, which is what puts a console on the taskbar.
//
// This is deliberately a small, conservative reader of the subset of batch
// that start scripts actually use, not an interpreter. Anything it doesn't
// understand it refuses ("uses goto") rather than guessing, because the cost
// of guessing wrong is a server that launches differently from the script the
// owner wrote. When it refuses, the owner can still fill the launch details in
// by hand.
//
// Understood: set, cd/pushd/popd, %VAR% and %~dp0, ^ line continuation, `start`
// with its flags (including starting another .bat, which is followed), and a
// bare program invocation. Skipped as irrelevant to launching: echo, rem,
// title, color, pause, exit, and SteamCMD update checks — those last are
// reported, since a direct launch will not run them.

const MAX_DEPTH = 3;

const IGNORED = new Set([
	"echo", "echo.", "rem", "title", "color", "setlocal", "endlocal", "cls", "pause",
	"exit", "timeout", "mode", "chcp", "prompt", "@echo",
]);

const PRIORITY_FLAGS = {
	"/low": "low",
	"/belownormal": "belowNormal",
	"/normal": "normal",
	"/abovenormal": "aboveNormal",
	"/high": "high",
	"/realtime": "realtime",
};

class Unsupported extends Error {}

/** Split a command line into whitespace-separated tokens, keeping quoted runs whole. */
function tokenize(text) {
	const tokens = [];
	let i = 0;
	while (i < text.length) {
		while (i < text.length && /\s/.test(text[i])) i += 1;
		if (i >= text.length) break;
		const start = i;
		let quoted = false;
		while (i < text.length && (quoted || !/\s/.test(text[i]))) {
			if (text[i] === '"') quoted = !quoted;
			i += 1;
		}
		tokens.push({ raw: text.slice(start, i), end: i });
	}
	return tokens;
}

const unquote = (s) => s.replace(/^"(.*)"$/, "$1");

/** Remove a leading `cmd` symbol like @ from a line. */
const stripAt = (line) => line.replace(/^@+/, "").trim();

function expand(text, env, scriptDir) {
	let out = text
		.replace(/%~dp0%?/gi, `${scriptDir}${path.sep}`)
		.replace(/%~f0/gi, "")
		.replace(/%%/g, "%");
	out = out.replace(/%([^%\s]+)%/g, (whole, name) => {
		const key = [...env.keys()].find((k) => k.toLowerCase() === name.toLowerCase());
		if (key) return env.get(key);
		const fromOs = process.env[name] ?? process.env[name.toUpperCase()];
		if (fromOs !== undefined) return fromOs;
		throw new Unsupported(`uses %${name}%, which isn't set in the script`);
	});
	return out;
}

function safeExpand(text, env, scriptDir) {
	try {
		return expand(text, env, scriptDir);
	} catch {
		return text;
	}
}

function resolveExecutable(name, cwd) {
	const candidate = path.isAbsolute(name) ? name : path.resolve(cwd, name);
	const options = path.extname(candidate) ? [candidate] : [`${candidate}.exe`, candidate];
	const found = options.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
	if (!found) throw new Unsupported(`can't find the program "${name}"`);
	return found;
}

function parseScript(scriptPath, startCwd, state, depth) {
	if (depth > MAX_DEPTH) throw new Unsupported("starts scripts that start other scripts too deeply");

	const scriptDir = path.dirname(scriptPath);
	// ^ at the end of a line continues it onto the next.
	const text = fs.readFileSync(scriptPath, "utf8").replace(/^﻿/, "").replace(/\^\r?\n/g, "");
	let cwd = startCwd;
	const dirStack = [];
	let blockDepth = 0;

	for (const original of text.split(/\r?\n/)) {
		const line = stripAt(original);
		if (!line) continue;

		// A parenthesised `if` / `for` body isn't run on the normal path (typically
		// "update failed, pause and quit"), so skip it whole.
		if (blockDepth > 0) {
			if (/\($/.test(line)) blockDepth += 1;
			if (/^\)/.test(line)) blockDepth -= 1;
			continue;
		}
		if (/^(rem|::)(\s|$)/i.test(line) || line.startsWith(":")) {
			if (line.startsWith(":") && !line.startsWith("::") && !/^:\s/.test(line)) {
				throw new Unsupported("uses labels/goto");
			}
			continue;
		}
		if (/^if\b/i.test(line)) {
			if (/\(\s*$/.test(line)) {
				blockDepth = 1;
				continue;
			}
			if (/\bstart\b/i.test(line)) throw new Unsupported("starts the server conditionally");
			continue; // A one-line `if` that isn't a launch, e.g. "if errorlevel 1 exit /b".
		}

		const tokens = tokenize(line);
		const command = tokens[0].raw.toLowerCase();

		if (IGNORED.has(command) || command.startsWith("echo")) continue;

		if (command === "set") {
			if (/^set\s+\/[ap]/i.test(line)) throw new Unsupported("computes or asks for a value with set /a or set /p");
			const body = line.replace(/^set\s+/i, "");
			const assign = body.match(/^"?([^=]+)=(.*?)"?$/);
			if (!assign) throw new Unsupported("has a set command I can't read");
			state.env.set(assign[1].trim(), expand(assign[2], state.env, scriptDir));
			continue;
		}

		if (command === "cd" || command === "chdir" || command === "pushd") {
			const target = line.replace(/^\S+\s+(\/d\s+)?/i, "");
			if (command === "pushd") dirStack.push(cwd);
			const next = path.resolve(cwd, unquote(expand(target.trim(), state.env, scriptDir)));
			// cmd reports an error for a missing folder and carries on from where
			// it was — which is what a script written for a different start
			// folder ends up relying on (Enshrouded's does exactly this).
			if (fs.existsSync(next)) cwd = next;
			continue;
		}
		if (command === "popd") {
			if (dirStack.length) cwd = dirStack.pop();
			continue;
		}

		// Expanded first: Palworld's script calls "%STEAMCMD_PATH%", which would
		// otherwise be mistaken for the server program.
		if (/steamcmd(\.exe)?$/i.test(unquote(safeExpand(tokens[0].raw, state.env, scriptDir)))) {
			state.skipped.add("the SteamCMD update check");
			continue;
		}

		if (command === "powershell" || command === "powershell.exe") {
			if (state.launch) throw new Unsupported("starts more than one program");
			state.launch = parsePowerShellStart(line, cwd, state, scriptDir);
			continue;
		}

		if (command === "start") {
			if (state.launch) throw new Unsupported("starts more than one program");
			state.launch = parseStart(line, tokens, cwd, state, scriptDir, scriptPath, depth);
			continue;
		}

		// A bare program name: the script runs it in the foreground.
		const bare = tryBareProgram(tokens, line, cwd, state, scriptDir);
		if (bare) {
			if (state.launch) throw new Unsupported("starts more than one program");
			state.launch = bare;
			continue;
		}

		throw new Unsupported(`uses "${tokens[0].raw}", which I can't safely reproduce`);
	}
}

// Some scripts launch through a one-line PowerShell wrapper so that the game
// can be started with a hidden window style:
//   powershell -NoProfile -Command "Start-Process -FilePath 'X.exe' -ArgumentList 'a b' -WorkingDirectory 'dir' -WindowStyle Hidden"
// That's just a program, arguments and folder in different clothes.
const START_PROCESS_PARAMS = new Set(["filepath", "argumentlist", "workingdirectory", "windowstyle"]);

function parsePowerShellStart(line, cwd, state, scriptDir) {
	const wrapped = line.match(/-Command\s+"(.*)"\s*$/i);
	if (!wrapped) throw new Unsupported("runs PowerShell in a form I can't read");
	const inner = wrapped[1];

	const outsideQuotes = inner.replace(/'[^']*'/g, "''");
	if (!/^\s*Start-Process\b/i.test(inner) || /[;|&]/.test(outsideQuotes)) {
		throw new Unsupported("runs PowerShell commands other than a single Start-Process");
	}
	for (const [, name] of outsideQuotes.matchAll(/\s-(\w+)/g)) {
		if (!START_PROCESS_PARAMS.has(name.toLowerCase())) {
			throw new Unsupported(`uses Start-Process -${name}, which I can't reproduce`);
		}
	}

	const param = (name) => {
		const found = inner.match(new RegExp(`-${name}\\s+'([^']*)'`, "i"));
		return found ? expand(found[1], state.env, scriptDir) : undefined;
	};
	const file = param("FilePath");
	if (!file) throw new Unsupported("has a Start-Process with no program");

	const launchCwd = param("WorkingDirectory") ? path.resolve(cwd, param("WorkingDirectory")) : cwd;
	const args = param("ArgumentList") ?? "";
	assertPlainCommandLine(args);
	return { exe: resolveExecutable(file, launchCwd), args, cwd: launchCwd };
}

function assertPlainCommandLine(rest) {
	// Redirection and command chaining outside quotes mean the line does more
	// than launch a program.
	let quoted = false;
	for (const ch of rest) {
		if (ch === '"') quoted = !quoted;
		else if (!quoted && "&|<>".includes(ch)) throw new Unsupported("redirects or chains commands on the launch line");
	}
}

function parseStart(line, tokens, cwd, state, scriptDir, scriptPath, depth) {
	let i = 1;
	let priority;
	let launchCwd = cwd;

	// start's own flags.
	while (i < tokens.length && tokens[i].raw.startsWith("/")) {
		const flag = tokens[i].raw.toLowerCase();
		if (flag === "/d") {
			launchCwd = path.resolve(cwd, unquote(expand(tokens[i + 1].raw, state.env, scriptDir)));
			i += 2;
			continue;
		}
		if (PRIORITY_FLAGS[flag]) priority = PRIORITY_FLAGS[flag];
		if (flag === "/wait") throw new Unsupported("waits for the server to exit (start /wait)");
		i += 1;
	}
	// The first quoted argument is the window title, when something follows it.
	if (i < tokens.length - 1 && tokens[i].raw.startsWith('"')) i += 1;
	if (i >= tokens.length) throw new Unsupported("has a start command with no program");

	const exeToken = tokens[i];
	const exeName = unquote(expand(exeToken.raw, state.env, scriptDir));
	const rest = expand(line.slice(exeToken.end).trim(), state.env, scriptDir);
	assertPlainCommandLine(rest);

	if (/\.(bat|cmd)$/i.test(exeName)) {
		// Follow a script that starts another script, e.g. UpdateandRun.bat ->
		// Start_X.bat. Its own start line is the real launch.
		const inner = path.resolve(launchCwd, exeName);
		if (!fs.existsSync(inner)) throw new Unsupported(`can't find the script "${exeName}"`);
		parseScript(inner, launchCwd, state, depth + 1);
		if (!state.launch) throw new Unsupported(`"${exeName}" doesn't start a program I can find`);
		const nested = state.launch;
		state.launch = null;
		return { ...nested, priority: priority ?? nested.priority };
	}

	return {
		exe: resolveExecutable(exeName, launchCwd),
		args: rest,
		cwd: launchCwd,
		priority,
	};
}

function tryBareProgram(tokens, line, cwd, state, scriptDir) {
	const name = unquote(expand(tokens[0].raw, state.env, scriptDir));
	if (/[\\/]/.test(name) === false && !/\.exe$/i.test(name) && !fs.existsSync(path.resolve(cwd, `${name}.exe`))) {
		return null;
	}
	let exe;
	try {
		exe = resolveExecutable(name, cwd);
	} catch {
		return null;
	}
	const rest = expand(line.slice(tokens[0].end).trim(), state.env, scriptDir);
	assertPlainCommandLine(rest);
	return { exe, args: rest, cwd };
}

/**
 * @param {string} scriptPath
 * @param {{ workingDir?: string }} [opts]  the folder the panel starts the script in
 * @returns {{ ok: true, launch: object, skipped: string[] } | { ok: false, reason: string }}
 */
export function deriveLaunch(scriptPath, { workingDir } = {}) {
	if (!scriptPath || !fs.existsSync(scriptPath)) {
		return { ok: false, reason: "The start script couldn't be found." };
	}
	const state = { env: new Map(), skipped: new Set(), launch: null };
	try {
		parseScript(scriptPath, path.resolve(workingDir || path.dirname(scriptPath)), state, 0);
		if (!state.launch) return { ok: false, reason: "The script doesn't appear to start a program." };
		const env = Object.fromEntries(state.env);
		return {
			ok: true,
			launch: { ...state.launch, ...(Object.keys(env).length ? { env } : {}) },
			skipped: [...state.skipped],
		};
	} catch (err) {
		if (err instanceof Unsupported) {
			return { ok: false, reason: `The script ${err.message}, so it can't be reproduced automatically.` };
		}
		return { ok: false, reason: `The script couldn't be read: ${err.message}` };
	}
}

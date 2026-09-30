import { execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { getConfig } from "../config/configStore.js";
import { all as allServers } from "../data/serverStore.js";
import { resolveResource } from "../../shared/resources.js";

// How a game server's window is treated. Three modes, chosen per server:
//
//   minimized   the script's own `start /MIN` window, left on the taskbar —
//               the original behaviour, and the one to use to watch a console.
//   hidden      the same launch, then the window is hidden as soon as it
//               exists and kept hidden while it's being created (games such as
//               the Unreal ones open a log window well after launch). Works
//               with any start script.
//   windowless  the panel starts the game program itself with no window at all
//               (see windowlessLauncher.js). Needs the program's details, which
//               can usually be read out of the start script.

export const WINDOW_MODES = ["minimized", "hidden", "windowless"];

const CONTROL_SCRIPT = resolveResource("scripts/window-control.ps1");
const STATE_FILE = path.join(paths.dataDir, "state", "hidden-windows.json");

/** What the owner asked for: this server's own choice, else the panel default. */
export function requestedWindowMode(server) {
	return WINDOW_MODES.includes(server.windowMode) ? server.windowMode : getConfig().servers.defaultWindowMode;
}

/**
 * What will actually happen. Windowless needs a launch definition; without one
 * it quietly becomes hidden, which works for every script.
 */
export function effectiveWindowMode(server) {
	const requested = requestedWindowMode(server);
	// Minecraft has no window to hide or minimize; the only real choice is
	// between its script and a direct launch.
	if (!usesWindows(server)) return requested === "windowless" && server.launch ? "windowless" : "hidden";
	if (requested === "windowless" && !server.launch) return "hidden";
	return requested;
}

/**
 * Minecraft servers are started through a PowerShell chain that's already fully
 * hidden — they never had a taskbar entry, so none of this applies to them.
 */
export const usesWindows = (server) => server.type !== "minecraft";

function processSpec(server) {
	if (!usesWindows(server)) return null;
	const names = new Set();
	if (server.processName) names.add(server.processName);
	if (server.launch?.exe) names.add(path.basename(server.launch.exe));

	let cmdContains = null;
	if (server.type === "ark") {
		// Every map runs the same executable; the RCON port on its command line
		// is the one thing that tells them apart.
		names.add("ArkAscendedServer.exe");
		names.add("ShooterGameServer.exe");
		if (server.rconPort) cmdContains = `-RCONPort=${server.rconPort}`;
	}
	// A program counts as this server's only if it runs from inside its folder. (Not for
	// shared programs like java.exe, whose location says nothing about which server it is.)
	const shared = [...names].some((n) => /^javaw?(\.exe)?$/i.test(n));
	const roots = shared ? [] : [server.installDir, server.workingDir].filter(Boolean).map((d) => `${path.resolve(d).replace(/[\\/]+$/, "").toLowerCase()}${path.sep}`);
	return names.size ? { key: server.name, names: [...names], cmdContains, roots: [...new Set(roots)] } : null;
}

// A watcher that's still running when someone asks for a window back would hide
// it again a second later. Watchers look for this file, and stop hiding a
// server whose flag is newer than they are.
const CANCEL_DIR = path.join(paths.dataDir, "state", "window-cancel");
const cancelFlag = (name) =>
	path.join(CANCEL_DIR, `${crypto.createHash("sha1").update(String(name)).digest("hex").slice(0, 16)}.flag`);

function cancelHiding(servers) {
	fs.mkdirSync(CANCEL_DIR, { recursive: true });
	for (const server of servers) fs.writeFileSync(cancelFlag(server.name), String(Date.now()));
}

function writeSpec(servers) {
	const specs = servers
		.map(processSpec)
		.filter(Boolean)
		.map((spec) => ({ ...spec, cancelFlag: cancelFlag(spec.key) }));
	if (specs.length === 0) return null;
	fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
	const file = path.join(path.dirname(STATE_FILE), `window-spec-${crypto.randomBytes(4).toString("hex")}.json`);
	fs.writeFileSync(file, JSON.stringify(specs));
	return file;
}

const baseArgs = (specFile, action, seconds) => [
	"-NoProfile",
	"-NonInteractive",
	"-ExecutionPolicy",
	"Bypass",
	"-File",
	CONTROL_SCRIPT,
	"-SpecFile",
	specFile,
	"-Action",
	action,
	"-Seconds",
	String(seconds),
	"-StateFile",
	STATE_FILE,
];

/**
 * Hide these servers' windows now and keep watching for `seconds`. Doesn't
 * wait — it runs alongside whatever started it.
 */
export function hideWindows(servers, seconds = 90) {
	const specFile = writeSpec(servers.filter(usesWindows));
	if (!specFile) return;
	const child = spawn("powershell.exe", baseArgs(specFile, "hide", seconds), {
		// Not detached: PowerShell needs a console of its own to run, and
		// `detached` takes it away, so the script silently never ran. It's only a
		// short-lived watcher, so it doesn't need to outlive the panel anyway.
		windowsHide: true,
		stdio: "ignore",
	});
	child.on("error", (err) => console.warn("[windows] Could not hide windows:", err.message));
	child.on("exit", (code) => {
		if (code) console.warn(`[windows] The window helper exited with code ${code}.`);
	});
	child.unref();
}

/** Bring back windows this panel hid. Resolves with how many were restored. */
export function showWindows(servers) {
	cancelHiding(servers);
	const specFile = writeSpec(servers.filter(usesWindows));
	if (!specFile) return Promise.resolve(0);
	return new Promise((resolve, reject) => {
		execFile(
			"powershell.exe",
			baseArgs(specFile, "show", 0),
			{ windowsHide: true, timeout: 20_000 },
			(error, stdout) => {
				if (error) return reject(error);
				try {
					resolve(JSON.parse(stdout).changed ?? 0);
				} catch {
					resolve(0);
				}
			},
		);
	});
}

/** A server that should be hidden — used by the start and boot paths. */
const wantsHiding = (server) => effectiveWindowMode(server) !== "minimized";

/**
 * Called once after the panel starts. Servers that were already running when
 * it did (started before the panel, or by a previous run of it) still have
 * their windows.
 */
export function sweepWindowsOnBoot() {
	hideWindows(allServers().filter(wantsHiding), 25);
}

// A server that comes online on its own — a crash-restart, or someone starting
// it by hand — opens a fresh window. Debounced, since several polls can see
// the same transition.
const lastHideAt = new Map();
export function noteServerCameOnline(server) {
	if (!server || !wantsHiding(server)) return;
	const last = lastHideAt.get(server.name) ?? 0;
	if (Date.now() - last < 30_000) return;
	lastHideAt.set(server.name, Date.now());
	hideWindows([server], 45);
}

/** Note when hiding was just requested for a server, so the poll doesn't repeat it. */
export function markHidingStarted(server) {
	lastHideAt.set(server.name, Date.now());
}

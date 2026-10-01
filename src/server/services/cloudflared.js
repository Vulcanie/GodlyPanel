import { spawn, execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { paths } from "../paths.js";

// cloudflared is Cloudflare's own tunnel program. It makes an outbound connection from this PC to
// Cloudflare and lets people reach one local web address through a public name, so nothing on
// the router is opened. This file finds or downloads it, reads an existing tunnel's settings
// from the machine, and runs it as a child of the panel (hidden, restarted if it dies, stopped
// when the panel stops).

// Pinned in code, like SteamCMD's address: it is Cloudflare's own release page, and a
// settable download address in an admin tool would be an easy way to be tricked into running
// someone else's program.
const RELEASE_API = "https://api.github.com/repos/cloudflare/cloudflared/releases/latest";
const ASSET_NAME = "cloudflared-windows-amd64.exe";

export const toolsDir = path.join(paths.dataDir, "tools", "cloudflared");
export const managedExe = path.join(toolsDir, "cloudflared.exe");
const pidFile = path.join(paths.dataDir, "state", "cloudflared-pid.json");
const configFile = path.join(paths.dataDir, "state", "cloudflared-community.yml");
const quickConfigFile = path.join(paths.dataDir, "state", "cloudflared-quick.yml");

// A seam for tests: a stand-in program (and the arguments that make it behave) instead of the real one.
const override = () => (process.env.GHP_CLOUDFLARED_EXE ? { exe: process.env.GHP_CLOUDFLARED_EXE, pre: JSON.parse(process.env.GHP_CLOUDFLARED_PREARGS || "[]") } : null);

const SYSTEM_CANDIDATES = () => [
	path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "cloudflared", "cloudflared.exe"),
	path.join(process.env.ProgramFiles ?? "C:\\Program Files", "cloudflared", "cloudflared.exe"),
	path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Links", "cloudflared.exe"),
];

/** Where cloudflared is: the copy the panel downloaded, else one already on this PC, else nowhere. */
export function findCloudflared() {
	if (process.env.GHP_CLOUDFLARED_NONE) return null; // tests: pretend it isn't on this PC
	const o = override();
	if (o) return { exe: o.exe, source: "stand-in", pre: o.pre };
	if (fs.existsSync(managedExe)) return { exe: managedExe, source: "panel", pre: [] };
	const system = SYSTEM_CANDIDATES().find((p) => p && fs.existsSync(p));
	return system ? { exe: system, source: "system", pre: [] } : null;
}

// ---- download ---------------------------------------------------------------------------------

let installing = null;

async function fetchJson(url) {
	const res = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "GodlyPanel" }, signal: AbortSignal.timeout(20_000) });
	if (!res.ok) throw new Error(`Couldn't ask GitHub for the latest cloudflared: HTTP ${res.status}`);
	return res.json();
}

/**
 * Download cloudflared from Cloudflare's GitHub release into the panel's tools folder. Concurrent
 * callers share one download. Checked against the SHA-256 GitHub publishes for the file, and run
 * once (`--version`) before it is trusted.
 */
export function installCloudflared(log = () => {}) {
	if (!installing) {
		installing = doInstall(log).finally(() => {
			installing = null;
		});
	}
	return installing;
}

async function doInstall(log) {
	log("Asking GitHub for the latest cloudflared release...");
	const release = await fetchJson(RELEASE_API);
	const asset = (release.assets ?? []).find((a) => a.name === ASSET_NAME);
	if (!asset?.browser_download_url) throw new Error(`The latest release (${release.tag_name}) has no ${ASSET_NAME}.`);
	if (!/^https:\/\/(github\.com|objects\.githubusercontent\.com)\//.test(asset.browser_download_url)) throw new Error("The download address isn't on GitHub, so it was not used.");

	log(`Downloading cloudflared ${release.tag_name} (${Math.round((asset.size ?? 0) / 1048576)} MB)...`);
	const res = await fetch(asset.browser_download_url, { redirect: "follow", signal: AbortSignal.timeout(5 * 60_000) });
	if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
	const bytes = Buffer.from(await res.arrayBuffer());

	// An error page or a captive portal would otherwise be saved as a program.
	if (bytes.length < 5_000_000 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) throw new Error("The download isn't a Windows program.");
	const expected = /^sha256:([0-9a-f]{64})$/i.exec(asset.digest ?? "")?.[1];
	if (expected) {
		const actual = crypto.createHash("sha256").update(bytes).digest("hex");
		if (actual.toLowerCase() !== expected.toLowerCase()) throw new Error("The download doesn't match the checksum GitHub published for it, so it was thrown away.");
		log("Checksum matches what GitHub published.");
	} else {
		log("GitHub didn't publish a checksum for this file; checked only that it is a Windows program.");
	}

	fs.mkdirSync(toolsDir, { recursive: true });
	const part = `${managedExe}.download`;
	fs.writeFileSync(part, bytes);
	await new Promise((resolve, reject) => {
		execFile(part, ["--version"], { windowsHide: true, timeout: 20_000 }, (err, stdout) => (err ? reject(new Error(`It was downloaded but won't run: ${err.message.split("\n")[0]}`)) : resolve(stdout)));
	}).catch((err) => {
		fs.rmSync(part, { force: true });
		throw err;
	});
	fs.renameSync(part, managedExe);
	log("cloudflared is ready.");
	return managedExe;
}

export const isInstalling = () => Boolean(installing);

// ---- tunnels already on this PC -------------------------------------------------------------------

/**
 * What `~/.cloudflared/config.yml` says, in the few fields the panel needs. Pure, for testing: a
 * hand-rolled reader for the small file `cloudflared tunnel create` leaves, not a YAML parser.
 */
export function parseTunnelConfig(text) {
	const out = { tunnel: null, credentialsFile: null, hostnames: [] };
	for (const raw of String(text ?? "").split(/\r?\n/)) {
		const line = raw.replace(/\s+#.*$/, "");
		let m;
		if ((m = /^tunnel:\s*(\S+)\s*$/.exec(line))) out.tunnel = m[1].replace(/^["']|["']$/g, "");
		else if ((m = /^credentials-file:\s*(.+?)\s*$/.exec(line))) out.credentialsFile = m[1].replace(/^["']|["']$/g, "");
		else if ((m = /^\s*-\s*hostname:\s*(\S+)\s*$/.exec(line))) out.hostnames.push(m[1].replace(/^["']|["']$/g, ""));
	}
	return out;
}

/** A tunnel set up on this PC by hand (`cloudflared tunnel create`), if there is one. */
export function detectExistingTunnel() {
	const dir = path.join(os.homedir(), ".cloudflared");
	const file = path.join(dir, "config.yml");
	if (!fs.existsSync(file)) return null;
	try {
		const parsed = parseTunnelConfig(fs.readFileSync(file, "utf8"));
		if (!parsed.tunnel || !parsed.credentialsFile) return null;
		const credentialsFile = path.isAbsolute(parsed.credentialsFile) ? parsed.credentialsFile : path.join(dir, parsed.credentialsFile);
		return { tunnel: parsed.tunnel, credentialsFile, hostnames: parsed.hostnames, credentialsFound: fs.existsSync(credentialsFile), configFile: file };
	} catch {
		return null;
	}
}

/** Other cloudflared programs running on this PC that the panel didn't start (and their tunnel name if the command line shows one). */
export function otherConnectors(ownPid) {
	return new Promise((resolve) => {
		execFile(
			"powershell",
			["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process -Filter \"Name='cloudflared.exe'\" | Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress"],
			{ windowsHide: true, timeout: 15_000 },
			(err, stdout) => {
				if (err || !stdout.trim()) return resolve([]);
				try {
					const parsed = JSON.parse(stdout);
					const list = (Array.isArray(parsed) ? parsed : [parsed]).filter((p) => p?.ProcessId && p.ProcessId !== ownPid);
					resolve(list.map((p) => ({ pid: p.ProcessId, command: String(p.CommandLine ?? "").replace(/--token\s+\S+/i, "--token <hidden>") })));
				} catch {
					resolve([]);
				}
			},
		);
	});
}

// ---- running a tunnel --------------------------------------------------------------------------------

const QUICK_URL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
const REGISTERED = /Registered tunnel connection/i;

/** What a line of cloudflared's output means for the tunnel's state. Pure, for testing. */
export function readTunnelLine(line) {
	const url = QUICK_URL.exec(line)?.[0] ?? null;
	return { url: url ? url.toLowerCase() : null, registered: REGISTERED.test(line), failed: /(failed to|error).*(authenticat|unauthori|token|credential)|Invalid tunnel secret|failed to unmarshal/i.test(line) };
}

const HOSTNAME = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
export const validHostname = (h) => HOSTNAME.test(String(h ?? ""));

/** The settings file for running an existing named tunnel at the community listener (never the user's own config.yml). */
export function communityConfigText({ tunnel, credentialsFile, hostname, port }) {
	if (!validHostname(hostname)) throw new Error("That isn't a valid web address (use a name such as panel.example.com).");
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("The community listener's port isn't valid.");
	if (/[\r\n"]/.test(tunnel + credentialsFile)) throw new Error("The tunnel settings contain characters that aren't allowed.");
	return [`tunnel: ${tunnel}`, `credentials-file: "${credentialsFile.replace(/\\/g, "/")}"`, "", "ingress:", `  - hostname: ${hostname}`, `    service: http://127.0.0.1:${port}`, "  - service: http_status:404", ""].join("\n");
}

const state = { child: null, desired: false, status: "stopped", url: null, connections: 0, error: null, lines: [], restarts: 0, timer: null, startedAt: null, options: null };
const MAX_LINES = 80;

export function tunnelState() {
	return { status: state.status, url: state.url, connections: state.connections, error: state.error, startedAt: state.startedAt, pid: state.child?.pid ?? null, lines: state.lines.slice(-30), restarts: state.restarts };
}

function remember(line) {
	state.lines.push(line.replace(/\s+$/, ""));
	if (state.lines.length > MAX_LINES) state.lines.splice(0, state.lines.length - MAX_LINES);
}

/** If the panel was killed without a chance to stop its tunnel, stop the one it left behind (and only that one). */
async function stopStale() {
	try {
		const saved = JSON.parse(fs.readFileSync(pidFile, "utf8"));
		if (!saved?.pid) return;
		const found = await new Promise((resolve) =>
			execFile("powershell", ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(saved.pid)}").ExecutablePath`], { windowsHide: true, timeout: 10_000 }, (e, out) => resolve(String(out ?? "").trim())),
		);
		if (found && saved.exe && found.toLowerCase() === saved.exe.toLowerCase()) {
			try {
				process.kill(saved.pid);
			} catch {
				// Already gone.
			}
		}
	} catch {
		// No record.
	} finally {
		fs.rmSync(pidFile, { force: true });
	}
}

/**
 * Start a tunnel to the community listener. `mode`: "quick" (a temporary public address, no account),
 * "token" (a tunnel made in the Cloudflare dashboard) or "existing" (a named tunnel already on this PC).
 */
export async function startTunnel({ mode, port, token, existing, hostname }) {
	const found = findCloudflared();
	if (!found) throw new Error("cloudflared isn't installed yet.");
	await stopTunnel();
	await stopStale();

	const env = { ...process.env };
	delete env.TUNNEL_TOKEN;
	let args;
	if (mode === "quick") {
		// An empty settings file of the panel's own. Without one, cloudflared reads ~/.cloudflared/config.yml if
		// there is one, and a temporary tunnel then follows that file's rules (answering 404 to everything).
		fs.mkdirSync(path.dirname(quickConfigFile), { recursive: true });
		fs.writeFileSync(quickConfigFile, "# GodlyPanel: temporary link. Deliberately empty so no other tunnel settings apply.\n");
		args = ["tunnel", "--no-autoupdate", "--config", quickConfigFile, "--url", `http://127.0.0.1:${port}`];
	} else if (mode === "token") {
		if (!token) throw new Error("A tunnel token is needed.");
		// In the environment rather than the command line, where any program on the PC could read it.
		env.TUNNEL_TOKEN = token;
		args = ["tunnel", "--no-autoupdate", "run"];
	} else if (mode === "existing") {
		if (!existing?.tunnel || !existing?.credentialsFile) throw new Error("No existing tunnel was chosen.");
		fs.mkdirSync(path.dirname(configFile), { recursive: true });
		fs.writeFileSync(configFile, communityConfigText({ tunnel: existing.tunnel, credentialsFile: existing.credentialsFile, hostname, port }));
		args = ["tunnel", "--no-autoupdate", "--config", configFile, "run"];
	} else {
		throw new Error("Unknown tunnel type.");
	}

	state.desired = true;
	state.options = { mode, port, token, existing, hostname };
	state.restarts = 0;
	launch(found, args, env);
	return tunnelState();
}

function launch(found, args, env) {
	state.status = "starting";
	state.url = null;
	state.connections = 0;
	state.error = null;
	state.lines = [];
	state.startedAt = Date.now();

	const child = spawn(found.exe, [...found.pre, ...args], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
	state.child = child;
	try {
		fs.mkdirSync(path.dirname(pidFile), { recursive: true });
		fs.writeFileSync(pidFile, JSON.stringify({ pid: child.pid, exe: found.exe }));
	} catch {
		// Not fatal: only used to clean up after a crash.
	}

	let buffer = "";
	const onData = (chunk) => {
		buffer += chunk.toString();
		let nl;
		while ((nl = buffer.indexOf("\n")) !== -1) {
			const line = buffer.slice(0, nl);
			buffer = buffer.slice(nl + 1);
			if (!line.trim()) continue;
			remember(line);
			const read = readTunnelLine(line);
			if (read.url) state.url = read.url;
			if (read.registered) {
				state.connections += 1;
				state.status = "connected";
				state.error = null;
			}
			if (read.failed) state.error = "Cloudflare refused the tunnel's credentials. Check the token.";
		}
	};
	child.stdout.on("data", onData);
	child.stderr.on("data", onData);
	child.on("error", (err) => {
		state.error = `Couldn't run cloudflared: ${err.message}`;
		state.status = "error";
	});
	child.on("exit", (code) => {
		if (state.child !== child) return; // replaced on purpose
		state.child = null;
		fs.rmSync(pidFile, { force: true });
		if (!state.desired) {
			state.status = "stopped";
			return;
		}
		state.status = "error";
		state.error ??= `cloudflared stopped (exit ${code}).`;
		// Back off: 5 s, 10 s ... 5 min, so a bad token doesn't hammer Cloudflare.
		state.restarts += 1;
		const wait = Math.min(300_000, 5000 * 2 ** Math.min(state.restarts - 1, 6));
		state.timer = setTimeout(() => {
			if (state.desired && !state.child) launch(found, args, env);
		}, wait);
		state.timer.unref?.();
	});
}

/** Stop the tunnel and don't bring it back. */
export async function stopTunnel() {
	state.desired = false;
	clearTimeout(state.timer);
	const child = state.child;
	state.child = null;
	if (child && child.exitCode === null) {
		await new Promise((resolve) => {
			child.once("exit", resolve);
			try {
				child.kill();
			} catch {
				resolve();
			}
			setTimeout(resolve, 3000).unref?.();
		});
		try {
			if (child.exitCode === null) process.kill(child.pid, "SIGKILL");
		} catch {
			// Gone.
		}
	}
	fs.rmSync(pidFile, { force: true });
	state.status = "stopped";
	state.url = null;
	state.connections = 0;
	return tunnelState();
}

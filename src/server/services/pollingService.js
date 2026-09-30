import { all as allServers, has as hasServer, onChange as onServersChange } from "../data/serverStore.js";
import { broadcastSseEvent } from "./sseHub.js";
import { sendDiscordAlert, discordEnabled } from "./discordService.js";
import { withRcon } from "./rconClient.js";
import { withTimeout } from "../util/async.js";
import { get as getServerEntry } from "../data/serverStore.js";
import { noteServerCameOnline } from "./serverWindows.js";
import { checkPort } from "./portCheck.js";
import { checkProcess } from "./processCheck.js";
import { latestServerStats } from "./serverResourceStats.js";
import { latestStats } from "./systemStats.js";
import { getConfig } from "../config/configStore.js";
import { sanitizeServerStatus } from "../data/sanitize.js";
import { noteServerPlayers } from "./playerTracker.js";

// Holds the latest known status
export let serverStatus = {};

/**
 * Bring serverStatus in line with the server list: seed an entry for anything
 * new so it appears on the dashboard immediately rather than only after the
 * next poll reaches it, and drop entries for servers that no longer exist so
 * a deleted server doesn't linger on the dashboard forever.
 *
 * This used to run once at module scope, which stopped working the moment the
 * server list became something loaded asynchronously from disk.
 */
export function syncServerStatusKeys() {
	const names = new Set();
	for (const s of allServers()) {
		names.add(s.name);
		if (!serverStatus[s.name]) {
			// Seed the static, known-without-asking fields too. These come from
			// config, not from polling, so withholding them until the first
			// poll lands just means the dashboard groups every server under
			// "Unknown" for the first few seconds — longer when a poll is slow
			// or hangs, since a hung poll never writes a status entry at all.
			serverStatus[s.name] = {
				type: s.type,
				sessionName: s.sessionName,
				serverPassword: s.serverPassword,
				joinAddress: s.joinAddress,
				// Not yet checked. This used to default to `true`, which meant
				// anything the panel hadn't successfully polled — a server
				// that's simply down, or one whose poll hangs — was reported
				// as up. Claiming a server is running when nothing has
				// confirmed it is the worse failure of the two.
				online: false,
				playerList: [],
				playerCount: 0,
			};
		}
	}
	for (const name of Object.keys(serverStatus)) {
		if (!names.has(name)) delete serverStatus[name];
	}
}

/** Called once after the server store has loaded. */
export function initPollingState() {
	syncServerStatusKeys();
	onServersChange(syncServerStatusKeys);
}

// Snapshot for diffing
let lastSnapshot = null;

/**
 * The status payload includes each server's join password, so admins and
 * guests get different versions of the same event rather than one payload
 * that would leak credentials to whoever happens to be watching.
 */
function broadcastServerUpdate(serverName, status) {
	broadcastSseEvent(
		{ type: "server_update", serverName, status },
		(client) => client.role === "admin",
	);
	broadcastSseEvent(
		{
			type: "server_update",
			serverName,
			status: sanitizeServerStatus(status, "guest"),
		},
		(client) => client.role !== "admin",
	);
}

const samePlayers = (a = [], b = []) => a.length === b.length && a.every((p, i) => p === b[i]);

function diffAndBroadcast(current, previous) {
	for (const [serverName, cur] of Object.entries(current)) {
		const prev = previous?.[serverName];

		// No previous reading means this is the first real result for this
		// server — always push it. Skipping it (which is what this used to do
		// for the entire first cycle, and for every newly-added server) left
		// connected clients showing the placeholder state indefinitely, since
		// nothing would ever be detected as a "change" afterwards.
		if (!prev) {
			broadcastServerUpdate(serverName, cur);
			continue;
		}

		// The player *list*, not just the count: one person leaving as another
		// joins keeps the count the same, and that used to go unreported.
		const changed =
			cur.online !== prev.online ||
			cur.playerCount !== prev.playerCount ||
			cur.sessionName !== prev.sessionName ||
			!samePlayers(cur.playerList, prev.playerList);

		if (changed) {
			// A server that came up by itself (a crash-restart, or started by hand)
			// opens a fresh window, which hidden/windowless servers shouldn't keep.
			if (cur.online && !prev.online) noteServerCameOnline(getServerEntry(serverName));
			if (cur.online !== prev.online) {
				console.log(`[poll] ${serverName} is now ${cur.online ? "online" : "offline"}.`);
			}
			broadcastServerUpdate(serverName, cur);
		}
	}
}

// A failing server would otherwise log the same line every cycle, forever —
// twenty of them turn the log into noise and rotate anything useful out. Say
// it when the reason changes, not each time it's true.
const lastProblem = new Map();
function noteProblem(name, message) {
	if (lastProblem.get(name) === message) return;
	lastProblem.set(name, message);
	console.warn(`[poll] ${name}: ${message}`);
}
function clearProblem(name) {
	lastProblem.delete(name);
}

const offline = (base) => ({ ...base, online: false, playerCount: 0, playerList: [] });

// ARK's ListPlayers lines look like "0. Name, 76561198000000000".
function parseRconPlayers(text) {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => /^\d+\./.test(line))
		.map((line) => line.substring(line.indexOf(".") + 2, line.indexOf(",")));
}

// RCON is TCP, so a quick pre-check avoids a slower failed handshake when the
// port's trivially closed. gamedig's protocols are mostly UDP (a TCP pre-check
// wouldn't work at all) and process polling has no port to check, so those
// skip straight to their own method and let it be the sole source of truth.
async function pollRcon(server, base) {
	if (!(await checkPort(server.host, server.rconPort, 1500))) return offline(base);

	const startedAt = Date.now();
	const text = await withRcon(server, (_rcon, send) => send("ListPlayers"), { timeoutMs: 5000 });
	const ping = Date.now() - startedAt;
	const players = parseRconPlayers(text);
	return { ...base, online: true, playerCount: players.length, playerList: players, ping };
}

// Loaded on first use: a setup with no gamedig-polled servers never pays for
// the library's hundred-odd protocol modules at startup.
let gamedig = null;
async function pollGamedig(server, base) {
	gamedig ??= (await import("gamedig")).GameDig;
	const protocol = server.queryProtocol || server.type;
	const state = await withTimeout(
		gamedig.query({
			type: protocol,
			host: server.host,
			port: server.queryPort || server.port,
			socketTimeout: 4000,
			...(protocol === "palworld" ? { username: "admin", password: server.rconPassword } : {}),
		}),
		6000,
		"gamedig query",
	);
	return {
		...base,
		online: true,
		sessionName: base.sessionName || state.name,
		playerCount: state.players.length,
		maxplayers: state.maxplayers,
		playerList: state.players.map((p) => p.name || p),
		ping: state.ping,
	};
}

// No port to check — process running means the server is up. These games
// don't expose a queryable port, which is why they use process detection.
async function pollProcess(server, base) {
	const running = await checkProcess(server.processName);
	return { ...base, online: running, playerCount: 0, playerList: [] };
}

const POLLERS = { rcon: pollRcon, gamedig: pollGamedig, process: pollProcess };

async function pollOne(server) {
	const name = server.name;
	const base = {
		sessionName: server.sessionName,
		serverPassword: server.serverPassword,
		joinAddress: server.joinAddress,
		type: server.type,
	};

	let status;
	try {
		const poll = POLLERS[server.method];
		status = poll
			? await withTimeout(poll(server, base), 8000, "poll")
			: offline(base);
		clearProblem(name);
	} catch (error) {
		noteProblem(name, error.message);
		status = offline(base);
	}

	// The server may have been deleted while this poll was in flight; writing
	// it back would resurrect a ghost entry on the dashboard.
	if (hasServer(name)) serverStatus[name] = status;
}

/**
 * Poll one server now and return its fresh status. For code that has just
 * stopped or started something and needs the real answer rather than whatever the
 * last scheduled cycle saw.
 */
export async function pollServerNow(name) {
	const server = getServerEntry(name);
	if (!server) return null;
	await pollOne(server);
	return serverStatus[name] ?? null;
}

// Renders a percentage as a fixed-width block bar (Discord has no real
// progress-bar element, so this is the text approximation of the
// dashboard's RAM/CPU meters — mirrors SystemStatsBar.jsx on the frontend).
function textBar(percent, length = 10) {
	const filled = Math.round((Math.min(Math.max(percent, 0), 100) / 100) * length);
	return "█".repeat(filled) + "░".repeat(length - filled);
}

function buildServerDashboard(status) {
	const adminRoleId = getConfig().discord.adminRoleId;

	let msg = `**Server Status Dashboard**\n\n`;

	if (latestStats) {
		const usedGB = (latestStats.usedMemMB / 1024).toFixed(1);
		const totalGB = (latestStats.totalMemMB / 1024).toFixed(1);
		msg += `🖥️ **System**\n`;
		msg += `RAM \`${textBar(latestStats.usedMemPercent)}\` ${latestStats.usedMemPercent}% (${usedGB}/${totalGB} GB)\n`;
		msg += `CPU \`${textBar(latestStats.cpuPercent)}\` ${latestStats.cpuPercent}%\n\n`;
	}

	const statsByName = Object.fromEntries(
		latestServerStats.map((s) => [s.name, s]),
	);

	const entries = Object.entries(status);
	const onlineEntries = entries.filter(([, s]) => s.online);
	const offlineNames = entries.filter(([, s]) => !s.online).map(([name]) => name);

	for (const name of offlineNames) {
		msg += `🔴 **${name}** — offline\n`;
	}
	for (const [name, s] of onlineEntries) {
		msg += `🟢 **${name}**\n`;
		msg += `• Session: \`${s.sessionName || "N/A"}\`\n`;
		msg += `• Password: \`${s.serverPassword || "None"}\`\n`;

		const stat = statsByName[name];
		if (stat && stat.running) {
			const ramGB = (stat.ramMB / 1024).toFixed(1);
			msg += `• CPU/RAM: \`${stat.cpuPercent}%\` / \`${ramGB} GB\`\n`;

			if (s.type === "minecraft" && stat.heapMaxMB) {
				const heapUsedGB = (stat.heapUsedMB / 1024).toFixed(1);
				const heapMaxGB = (stat.heapMaxMB / 1024).toFixed(1);
				msg += `• Heap \`${textBar(stat.heapPercent)}\` ${stat.heapPercent}% (${heapUsedGB}/${heapMaxGB} GB)\n`;
			}
		}
	}

	msg += "\n_Last updated: " + new Date().toLocaleTimeString() + "_";
	// The role mention is optional now that Discord is opt-in, so don't leave
	// a dangling blank line when it isn't set.
	if (adminRoleId) msg += `\n${adminRoleId}`;
	return msg.trim();
}

// Guards against an overlapping cycle if one run is still in flight when the
// next tick fires (each server has up to an 8s budget, so a slow cycle could
// otherwise stack on top of the next one and compound things like ARK's
// single-RCON-session contention).
let isPolling = false;

// Main polling function
export const pollServers = async () => {
	if (isPolling) {
		console.warn("[poll] Previous cycle still running — skipping this tick.");
		return;
	}
	isPolling = true;

	try {
		await Promise.allSettled(allServers().map(pollOne));
		for (const [name, status] of Object.entries(serverStatus)) noteServerPlayers(name, status);

		diffAndBroadcast(serverStatus, lastSnapshot);
		lastSnapshot = structuredClone(serverStatus);

		// Not awaited: a slow or hung Discord request must never hold up the
		// next poll — the overlap guard above would just skip cycles until it
		// gave up. Skipped entirely when Discord is off, rather than building
		// a message nobody will read.
		if (discordEnabled()) {
			sendDiscordAlert(buildServerDashboard(serverStatus)).catch(() => {});
		}
	} catch (err) {
		console.error("pollServers fatal error:", err);
	} finally {
		isPolling = false;
	}
};

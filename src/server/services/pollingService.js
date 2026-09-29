import { GameDig } from "gamedig";
import { Rcon } from "rcon-client";
import { all as allServers, onChange as onServersChange } from "../data/serverStore.js";
import { broadcastSseEvent } from "../routes/api.js";
import { sendDiscordAlert } from "./discordService.js";
import { checkPort } from "./portCheck.js";
import { checkProcess } from "./processCheck.js";
import { latestServerStats } from "./serverResourceStats.js";
import { latestStats } from "./systemStats.js";
import { getConfig } from "../config/configStore.js";

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

async function diffAndBroadcast(current, previous) {
	let globalChangeDetected = false;

	for (const [serverName, cur] of Object.entries(current)) {
		const prev = previous?.[serverName];

		// No previous reading means this is the first real result for this
		// server — always push it. Skipping it (which is what this used to do
		// for the entire first cycle, and for every newly-added server) left
		// connected clients showing the placeholder state indefinitely, since
		// nothing would ever be detected as a "change" afterwards.
		if (!prev) {
			broadcastSseEvent({ type: "server_update", serverName, status: cur });
			globalChangeDetected = true;
			continue;
		}

		const statusChanged = cur.online !== prev.online;
		const dataChanged =
			cur.playerCount !== prev.playerCount ||
			cur.sessionName !== prev.sessionName;

		console.log(
			`[DIFF] ${serverName} | online: ${prev.online} → ${cur.online} | players: ${prev.playerCount} → ${cur.playerCount} | statusChanged: ${statusChanged} | dataChanged: ${dataChanged}`,
		);

		if (statusChanged || dataChanged) {
			broadcastSseEvent({
				type: "server_update",
				serverName,
				status: cur,
			});
			console.log(`[SSE] Broadcasted update for ${serverName}`);
			globalChangeDetected = true;
		}
	}

	return globalChangeDetected;
}

// timeout helper
const withTimeout = (promise, ms) =>
	Promise.race([
		promise,
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error("timeout")), ms),
		),
	]);

// Wrap any async function with logging + timeout
const safeStep = async (label, fn, timeout = 5000) => {
	try {
		const result = await withTimeout(fn(), timeout);
		return result;
	} catch (err) {
		console.error(`   ✗ Step failed (${label}):`, err.message);
		throw err;
	}
};

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

	const online = Object.entries(status).filter(([_, s]) => s.online);
	const offline = Object.entries(status).filter(([_, s]) => !s.online);

	for (const [name, s] of offline) {
		msg += `🔴 **${name}** — offline\n`;
	}
	for (const [name, s] of online) {
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

// Guards against an overlapping cycle if one run is still in flight when
// the next setInterval tick fires (each server has up to an 8s timeout
// budget, so a slow cycle could otherwise stack on top of the next one and
// compound things like ARK's single-RCON-session contention).
let isPolling = false;

// Main polling function
export const pollServers = async () => {
	if (isPolling) {
		console.warn("[POLL] Previous cycle still running — skipping this tick.");
		return;
	}
	isPolling = true;

	try {
		const promises = allServers().map(async (serverConfig) => {
			const name = serverConfig.name;

			return withTimeout(
				(async () => {
					const baseInfo = {
						sessionName: serverConfig.sessionName,
						serverPassword: serverConfig.serverPassword,
						joinAddress: serverConfig.joinAddress,
						type: serverConfig.type,
					};

					// ─── RCON POLLING ───────────────────────────────────────────
					// RCON is TCP, so a quick pre-check avoids a slower failed
					// handshake when the port's trivially closed. gamedig's
					// protocols are mostly UDP-based (query wouldn't work over a
					// TCP pre-check at all), and process polling doesn't have a
					// port to check — both skip straight to their own method
					// below and let it be the sole source of truth.
					if (serverConfig.method === "rcon") {
						let portOpen;
						try {
							portOpen = await safeStep(
								`checkPort(${serverConfig.host}:${serverConfig.rconPort})`,
								() => checkPort(serverConfig.host, serverConfig.rconPort),
								4000,
							);
						} catch {
							portOpen = false;
						}

						if (!portOpen) {
							serverStatus[name] = {
								...baseInfo,
								online: false,
								playerCount: 0,
								playerList: [],
							};
							return;
						}

						let rcon;

						try {
							rcon = new Rcon({
								host: serverConfig.host,
								port: serverConfig.rconPort,
								password: serverConfig.rconPassword,
							});

							rcon.on("error", (err) => {
								console.warn(
									`RCON error on ${name}:`,
									err.message,
								);
							});

							await safeStep(
								"rcon.connect()",
								() => rcon.connect(),
								5000,
							);

							const startTime = Date.now();

							const playerListStr = await safeStep(
								"rcon.send(ListPlayers)",
								() => rcon.send("ListPlayers"),
								5000,
							);

							const ping = Date.now() - startTime;

							const players = playerListStr
								.split("\n")
								.map((line) => line.trim())
								.filter((line) => /^\d+\./.test(line))
								.map((line) =>
									line.substring(
										line.indexOf(".") + 2,
										line.indexOf(","),
									),
								);

							serverStatus[name] = {
								...baseInfo,
								online: true,
								playerCount: players.length,
								playerList: players,
								ping,
							};
						} catch (error) {
							console.warn(
								`RCON query failed for ${name}:`,
								error.message,
							);

							serverStatus[name] = {
								...baseInfo,
								online: false,
								playerCount: 0,
								playerList: [],
							};
						} finally {
							if (rcon) {
								try {
									rcon.socket?.destroy();
								} catch (e) {
									console.warn(
										`Error closing RCON connection for ${name}:`,
										e.message,
									);
								}
							}
						}
					}

					// ─── GAMEDIG POLLING ────────────────────────────────────────
					else if (serverConfig.method === "gamedig") {
						try {
							const queryProtocol =
								serverConfig.queryProtocol || serverConfig.type;
							const authOptions =
								queryProtocol === "palworld"
									? {
											username: "admin",
											password: serverConfig.rconPassword,
										}
									: {};

							const state = await safeStep(
								"gamedig.query()",
								() =>
									GameDig.query({
										type: queryProtocol,
										host: serverConfig.host,
										port: serverConfig.queryPort || serverConfig.port,
										socketTimeout: 4000,
										...authOptions,
									}),
								6000,
							);

							serverStatus[name] = {
								...baseInfo,
								online: true,
								sessionName: baseInfo.sessionName || state.name,
								playerCount: state.players.length,
								maxplayers: state.maxplayers,
								playerList: state.players.map(
									(p) => p.name || p,
								),
								ping: state.ping,
							};
						} catch (error) {
							console.warn(
								`GameDig query failed for ${name}:`,
								error.message,
							);

							serverStatus[name] = {
								...baseInfo,
								online: false,
								playerCount: 0,
								playerList: [],
							};
						}
					}

					// ─── PROCESS POLLING ────────────────────────────────────────
					// No port check — process running = server online.
					// These games don't expose a queryable port, that's why
					// we use process detection instead of gamedig.
					else if (serverConfig.method === "process") {
						try {
							console.log(
								`[PROCESS] Checking "${name}" | processName: "${serverConfig.processName}"`,
							);

							const isRunning = await safeStep(
								`checkProcess(${serverConfig.processName})`,
								() => checkProcess(serverConfig.processName),
								4000,
							);

							console.log(
								`[PROCESS] "${name}" isRunning: ${isRunning}`,
							);

							serverStatus[name] = {
								...baseInfo,
								online: isRunning,
								playerCount: 0,
								playerList: [],
								sessionName: baseInfo.sessionName,
								serverPassword: baseInfo.serverPassword,
							};
						} catch (error) {
							console.warn(
								`Process check failed for ${name}:`,
								error.message,
							);

							serverStatus[name] = {
								...baseInfo,
								online: false,
								playerCount: 0,
								playerList: [],
							};
						}
					}
				})(),
				8000,
			).catch((err) => {
				console.error(`[HANG] Server ${name} hung:`, err.message);
			});
		});

		await Promise.allSettled(promises);

		await diffAndBroadcast(serverStatus, lastSnapshot);

		const dashboard = buildServerDashboard(serverStatus);
		await sendDiscordAlert(dashboard);

		lastSnapshot = JSON.parse(JSON.stringify(serverStatus));
	} catch (err) {
		console.error("pollServers fatal error:", err);
	} finally {
		isPolling = false;
	}
};

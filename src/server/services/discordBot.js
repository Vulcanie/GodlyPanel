import { getConfig } from "../config/configStore.js";
import { getSecrets } from "../config/secretsStore.js";
import { COMMANDS, handleInteraction } from "./discordCommands.js";

// The Discord bot: slash commands for seeing and running servers from Discord. It talks to
// Discord the way any bot does: a WebSocket connection (the "gateway") that delivers
// commands as people type them, and plain web requests to answer and to register the
// commands. Nothing is written beyond those two calls, and nothing is installed: Node
// already has WebSocket and fetch. The bot only connects while it is turned on in Settings
// and has a token.
//
// Addresses can be overridden (GHP_DISCORD_API, GHP_DISCORD_GATEWAY) so tests run against a
// stand-in; in normal use they are Discord's.

const API = () => process.env.GHP_DISCORD_API || "https://discord.com/api/v10";
const GATEWAY = () => process.env.GHP_DISCORD_GATEWAY || "wss://gateway.discord.gg/?v=10&encoding=json";
const RECONNECT_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

let socket = null;
let heartbeat = null;
let reconnectTimer = null;
let attempts = 0;
let wanted = false;
let lastSeq = null;
let appliedSignature = null;
let ackPending = false;
let state = { status: "off", detail: "The bot is off.", user: null, registered: false };

export const botState = () => ({ ...state });
const setState = (patch) => {
	state = { ...state, ...patch };
};

async function rest(method, path, body, token) {
	const res = await fetch(`${API()}${path}`, {
		method,
		headers: { "Content-Type": "application/json", Authorization: `Bot ${token}`, "User-Agent": "GodlyPanel (https://github.com/Vulcanie/GodlyPanel, 0.1)" },
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(15_000),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Discord answered ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
	}
	return res.status === 204 ? null : res.json().catch(() => null);
}

/** Make Discord's list of this bot's commands match ours, in the one server it is set up for. */
export async function registerCommands({ token, applicationId, guildId }) {
	await rest("PUT", `/applications/${applicationId}/guilds/${guildId}/commands`, COMMANDS, token);
}

function settings() {
	const c = getConfig().discord;
	return { enabled: Boolean(c.botEnabled), applicationId: String(c.botApplicationId ?? "").trim(), guildId: String(c.botGuildId ?? "").trim(), token: getSecrets().discordBotToken || "" };
}

function stopSocket() {
	clearInterval(heartbeat);
	heartbeat = null;
	if (socket) {
		const s = socket;
		socket = null;
		s.onclose = null;
		s.onerror = null;
		try {
			s.close(1000);
		} catch {
			// Already closed.
		}
	}
}

function scheduleReconnect(reason) {
	stopSocket();
	if (!wanted) return;
	const wait = RECONNECT_MS[Math.min(attempts, RECONNECT_MS.length - 1)];
	attempts += 1;
	setState({ status: "reconnecting", detail: `${reason} Trying again in ${Math.round(wait / 1000)} seconds.` });
	clearTimeout(reconnectTimer);
	reconnectTimer = setTimeout(connect, wait);
}

async function answer(interaction, response, cfg) {
	if (!response) return;
	await rest("POST", `/interactions/${interaction.id}/${interaction.token}/callback`, response, cfg.token);
}

async function onInteraction(interaction, cfg) {
	try {
		await answer(interaction, await handleInteraction(interaction, { guildId: cfg.guildId }), cfg);
	} catch (err) {
		console.warn(`[discord-bot] Couldn't answer a command: ${err.message}`);
	}
}

function connect() {
	const cfg = settings();
	if (!wanted || !cfg.enabled || !cfg.token) return;
	stopSocket();
	setState({ status: "connecting", detail: "Connecting to Discord…" });
	let ws;
	try {
		ws = new WebSocket(GATEWAY());
	} catch (err) {
		scheduleReconnect(`Couldn't connect: ${err.message}.`);
		return;
	}
	socket = ws;
	lastSeq = null;
	ackPending = false;

	const send = (op, d) => ws.readyState === 1 && ws.send(JSON.stringify({ op, d }));

	ws.onmessage = async (event) => {
		let msg;
		try {
			msg = JSON.parse(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8"));
		} catch {
			return;
		}
		if (msg.s != null) lastSeq = msg.s;
		switch (msg.op) {
			case 10: {
				clearInterval(heartbeat);
				heartbeat = setInterval(() => {
					if (ackPending) return ws.close(4000); // no answer to the last heartbeat: the connection is dead
					ackPending = true;
					send(1, lastSeq);
				}, msg.d.heartbeat_interval);
				// Slash commands need no intents: only the commands people send to the bot.
				send(2, { token: cfg.token, intents: 0, properties: { os: "windows", browser: "godlypanel", device: "godlypanel" } });
				break;
			}
			case 11:
				ackPending = false;
				break;
			case 1:
				send(1, lastSeq);
				break;
			case 7:
				ws.close(4001);
				break;
			case 9:
				setState({ status: "reconnecting", detail: "Discord refused the session." });
				ws.close(4002);
				break;
			case 0:
				if (msg.t === "READY") {
					attempts = 0;
					setState({ status: "online", detail: "Connected.", user: msg.d.user?.username ?? null });
					registerCommands(cfg)
						.then(() => setState({ registered: true }))
						.catch((err) => setState({ registered: false, detail: `Connected, but the commands couldn't be registered: ${err.message}` }));
				} else if (msg.t === "INTERACTION_CREATE") {
					onInteraction(msg.d, cfg);
				}
				break;
			default:
		}
	};
	ws.onclose = (event) => {
		const fatal = { 4004: "Discord rejected the token. Check it in Settings.", 4013: "Discord rejected the bot's settings (intents).", 4014: "The bot isn't allowed what it asked for." }[event.code];
		if (fatal) {
			wanted = false;
			stopSocket();
			setState({ status: "error", detail: fatal });
			return;
		}
		scheduleReconnect("Disconnected from Discord.");
	};
	ws.onerror = () => {
		// onclose follows and does the retrying.
	};
}

/** Start, stop or restart the bot to match Settings. Safe to call whenever settings change. */
export function applyBotSettings() {
	const cfg = settings();
	// Changing something that doesn't concern the connection (the admin role) leaves it alone.
	const signature = JSON.stringify([cfg.enabled, cfg.applicationId, cfg.guildId, cfg.token]);
	if (signature === appliedSignature && (socket || !wanted)) return;
	appliedSignature = signature;
	clearTimeout(reconnectTimer);
	attempts = 0;
	if (!cfg.enabled) {
		wanted = false;
		stopSocket();
		setState({ status: "off", detail: "The bot is off.", user: null, registered: false });
		return;
	}
	if (!cfg.token || !cfg.applicationId || !cfg.guildId) {
		wanted = false;
		stopSocket();
		const missing = [!cfg.token && "the bot token", !cfg.applicationId && "the application ID", !cfg.guildId && "the server (guild) ID"].filter(Boolean).join(", ");
		setState({ status: "error", detail: `Still needed: ${missing}.`, user: null, registered: false });
		return;
	}
	wanted = true;
	connect();
}

export function stopBot() {
	wanted = false;
	appliedSignature = null;
	clearTimeout(reconnectTimer);
	stopSocket();
	setState({ status: "off", detail: "The bot is off." });
}

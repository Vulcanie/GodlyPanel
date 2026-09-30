import { all as allServers } from "../data/serverStore.js";
import { serverStatus } from "./pollingService.js";
import { CONTROL_ACTIONS } from "../routes/control.js";
import { createBackup } from "./backupService.js";
import { runDetached, currentOperation } from "./serverOps.js";
import { broadcast } from "./serverLifecycle.js";
import { logActivity } from "./activityLog.js";
import { getConfig } from "../config/configStore.js";

// What the Discord bot does with a slash command. Looking is open to everyone in the
// Discord server; changing anything (start, stop, restart, back up, say) needs the admin
// role chosen in Settings. With no role chosen, nobody can change anything from Discord.
// This file only turns an interaction into an answer: talking to Discord is discordBot.js.

export const COMMANDS = [
	{ name: "servers", description: "List every server and whether it is running" },
	{ name: "status", description: "How one server is doing", options: [serverOption()] },
	{ name: "players", description: "Who is on a server", options: [serverOption()] },
	{ name: "start", description: "Start a server (admins)", options: [serverOption()] },
	{ name: "stop", description: "Stop a server (admins)", options: [serverOption()] },
	{ name: "restart", description: "Restart a server (admins)", options: [serverOption()] },
	{ name: "backup", description: "Back a server up now (admins)", options: [serverOption()] },
	{
		name: "say",
		description: "Send a message to everyone in a server (admins)",
		options: [serverOption(), { type: 3, name: "message", description: "What to say", required: true, max_length: 200 }],
	},
];

function serverOption() {
	return { type: 3, name: "server", description: "Which server", required: true, autocomplete: true };
}

const ADMINISTRATOR = 0x8n;
const EPHEMERAL = 64;
const CONTROL = new Set(["start", "stop", "restart", "backup", "say"]);

const reply = (content, { ephemeral = false } = {}) => ({ type: 4, data: { content: String(content).slice(0, 1900), allowed_mentions: { parse: [] }, ...(ephemeral ? { flags: EPHEMERAL } : {}) } });

/** May this person change servers? They need the admin role chosen in Settings. */
export function isAdminMember(interaction, adminRoleId = getConfig().discord.adminRoleId) {
	if (!adminRoleId) return false;
	return Array.isArray(interaction.member?.roles) && interaction.member.roles.includes(String(adminRoleId));
}

export function hasAdministratorPermission(interaction) {
	try {
		return (BigInt(interaction.member?.permissions ?? "0") & ADMINISTRATOR) === ADMINISTRATOR;
	} catch {
		return false;
	}
}

const icon = (s) => (s?.online ? "🟢" : "⚫");

function describe(name, s, { detail = false } = {}) {
	const players = s?.online ? ` · ${s.playerCount ?? 0}${s.maxplayers ? `/${s.maxplayers}` : ""} players` : "";
	const op = currentOperation(name);
	return `${icon(s)} **${name}**${s?.online ? " is online" : " is offline"}${players}${op ? ` (${op}…)` : ""}${detail && s?.joinAddress ? `\nJoin: \`${s.joinAddress}\`` : ""}`;
}

const optionValue = (interaction, name) => interaction.data?.options?.find((o) => o.name === name)?.value;

/** Find a server by the name typed, ignoring case; a unique partial match also works. */
export function findServer(text) {
	const q = String(text ?? "").trim().toLowerCase();
	if (!q) return null;
	const all = allServers();
	const exact = all.find((s) => s.name.toLowerCase() === q);
	if (exact) return exact;
	const partial = all.filter((s) => s.name.toLowerCase().includes(q));
	return partial.length === 1 ? partial[0] : null;
}

function autocomplete(interaction) {
	const typed = String(interaction.data?.options?.find((o) => o.focused)?.value ?? "").toLowerCase();
	const choices = allServers()
		.filter((s) => s.name.toLowerCase().includes(typed))
		.slice(0, 25)
		.map((s) => ({ name: s.name.slice(0, 100), value: s.name.slice(0, 100) }));
	return { type: 8, data: { choices } };
}

/**
 * Turn an interaction into the response to send, or null when there's nothing to say.
 * @param {object} interaction  the INTERACTION_CREATE payload
 * @param {{ guildId?: string }} options
 */
export async function handleInteraction(interaction, { guildId = null } = {}) {
	// Slash commands only (type 2) and their autocomplete (type 4).
	if (interaction.type !== 2 && interaction.type !== 4) return null;
	// Only in the Discord server it was set up for, never in a private message to the bot.
	if (!interaction.guild_id || (guildId && interaction.guild_id !== guildId)) {
		return reply("This bot only works in the Discord server it was set up for.", { ephemeral: true });
	}
	if (interaction.type === 4) return autocomplete(interaction);

	const command = interaction.data?.name;
	const who = interaction.member?.user?.username ?? interaction.user?.username ?? "someone on Discord";

	if (command === "servers") {
		const servers = allServers();
		if (servers.length === 0) return reply("No servers are set up yet.");
		return reply(servers.map((s) => describe(s.name, serverStatus[s.name])).join("\n"));
	}

	if (!["status", "players", ...CONTROL].includes(command)) return reply("I don't know that command.", { ephemeral: true });

	const server = findServer(optionValue(interaction, "server"));
	if (!server) return reply(`I couldn't find a server called "${String(optionValue(interaction, "server") ?? "").slice(0, 60)}". Start typing its name and pick it from the list.`, { ephemeral: true });
	const status = serverStatus[server.name];

	if (command === "status") return reply(describe(server.name, status, { detail: true }));
	if (command === "players") {
		if (!status?.online) return reply(`**${server.name}** is offline.`);
		const list = status.playerList ?? [];
		return reply(list.length === 0 ? `Nobody is on **${server.name}** right now.` : `On **${server.name}** (${list.length}): ${list.map((p) => `\`${String(p).replace(/`/g, "")}\``).join(", ")}`);
	}

	// Everything below changes something.
	if (!isAdminMember(interaction)) {
		const hint = getConfig().discord.adminRoleId ? "You need the admin role for that." : "Changing servers from Discord is off: choose an admin role in the panel's Settings first.";
		return reply(hint, { ephemeral: true });
	}

	try {
		if (command === "start") {
			await CONTROL_ACTIONS.start(server);
			audit(server, who, "start");
			return reply(`Starting **${server.name}**…`);
		}
		if (command === "stop") {
			await CONTROL_ACTIONS.stop(server);
			audit(server, who, "stop");
			return reply(`Stopping **${server.name}**…`);
		}
		if (command === "restart") {
			await CONTROL_ACTIONS.restart(server);
			audit(server, who, "restart");
			return reply(`Restarting **${server.name}**…`);
		}
		if (command === "backup") {
			await runDetached(server.name, "backing up", async (report) => {
				await createBackup(server, { kind: "manual", reason: `Asked for on Discord by ${who}`.slice(0, 200), onReady: () => report({ started: true }) });
			});
			audit(server, who, "backup");
			return reply(`Backing up **${server.name}**. It is listed in the panel when it finishes.`);
		}
		if (command === "say") {
			const message = String(optionValue(interaction, "message") ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
			if (!message) return reply("There was nothing to say.", { ephemeral: true });
			const r = await broadcast(server, `[Discord] ${who}: ${message}`);
			if (!r.sent) return reply(`I couldn't send that: ${r.reason}.`, { ephemeral: true });
			audit(server, who, "say");
			return reply(`Sent to **${server.name}**.`);
		}
	} catch (err) {
		return reply(err.message || "That didn't work.", { ephemeral: true });
	}
	return null;
}

function audit(server, who, command) {
	logActivity({ type: "discord.command", server: server.name, message: `${who} used /${command} on ${server.name} from Discord.`, data: { user: who, command } });
}

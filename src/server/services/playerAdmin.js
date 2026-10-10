import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { sendRconCommand } from "./serverControl.js";
import { sendTelnetCommand, cleanTelnetOutput } from "./telnetClient.js";
import { backupSpecsFor } from "./backupService.js";
import { isServerRunning } from "./serverState.js";
import { logActivity } from "./activityLog.js";
import { writeManagedFile } from "../util/managedFiles.js";
import { isWithinAllowedRoots } from "../util/safePath.js";

// Kicking and banning players, and keeping each game's whitelist, admin list and ban list.
// What is possible differs a lot by game, so each one says what it can do:
//
//   console   the game's own console (RCON, or Telnet for 7 Days to Die): acts on the
//             running server at once
//   files     a list kept in a text file the game reads (Valheim's adminlist.txt and
//             friends): works with the server stopped, and the game picks it up when it
//             reads the file
//
// A game with nothing listed here can't be managed this way, and the panel says so
// rather than offering buttons that do nothing.

export class PlayerAdminError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

// A name or id goes into a console command, so nothing that could end the command and
// start another (a newline) or break out of quotes is let through.
const NAME = /^[^\r\n\t"\\;]{1,64}$/;
const STEAM64 = /^\d{17}$/;
const MC_NAME = /^[.A-Za-z0-9_]{1,17}$/;
const PALWORLD_ID = /^(?:steam_)?\d{17}$/;

function requireName(value, pattern, what) {
	const v = String(value ?? "").trim();
	if (!pattern.test(v)) throw new PlayerAdminError(`That isn't a valid ${what}.`, "bad_player");
	return v;
}

const reasonText = (reason) => {
	const r = String(reason ?? "").replace(/[\r\n"\\;]/g, " ").trim().slice(0, 100);
	return r || null;
};

// ---- what each game can do ---------------------------------------------------

/** Console commands by game. `who` is what identifies a player to that game. */
const GAMES = {
	minecraft: {
		who: { label: "player name", pattern: MC_NAME, hint: "Minecraft name" },
		run: "rcon",
		kick: (p, r) => `kick ${p}${r ? ` ${r}` : ""}`,
		ban: (p, r) => `ban ${p}${r ? ` ${r}` : ""}`,
		unban: (p) => `pardon ${p}`,
		lists: {
			whitelist: { label: "Whitelist", add: (p) => `whitelist add ${p}`, remove: (p) => `whitelist remove ${p}`, file: "whitelist.json", kind: "mcjson" },
			admins: { label: "Operators", add: (p) => `op ${p}`, remove: (p) => `deop ${p}`, file: "ops.json", kind: "mcjson" },
			bans: { label: "Banned players", add: (p) => `ban ${p}`, remove: (p) => `pardon ${p}`, file: "banned-players.json", kind: "mcjson", readOnly: true },
		},
		// What the game answers when nothing happened.
		nothing: /no player was found|nothing changed|already|that player does not exist|is not whitelisted|not an operator|isn't banned/i,
	},
	// Checked against a real Palworld server's RCON: these commands exist, and an id nobody
	// has answers "Failed to Kick: <id>" (likewise Ban and UnBan).
	Palword: {
		who: { label: "Steam ID", pattern: PALWORLD_ID, hint: "17-digit SteamID64 (see ShowPlayers)" },
		run: "rcon",
		kick: (p) => `KickPlayer ${p}`,
		ban: (p) => `BanPlayer ${p}`,
		unban: (p) => `UnBanPlayer ${p}`,
		lists: {},
		nothing: /^failed to/i,
	},
	// Sons of the Forest has no console to kick from; its owners list (who may administer in game) is
	// ownerswhitelist.txt in the userdata folder, one Steam ID per line, # for comments.
	sotf: {
		who: { label: "Steam ID", pattern: STEAM64, hint: "17-digit SteamID64" },
		run: null,
		listsDir: (server) => path.join(server.workingDir || server.installDir, "userdata"),
		lists: { admins: { label: "Owners (in-game admins)", file: "ownerswhitelist.txt", kind: "lines" } },
	},
	// V Rising has no console to kick from; the game keeps its admin and ban lists as Steam IDs, one
	// per line, in save-data\Settings (created by the game on first start, checked on a real install).
	vrising: {
		who: { label: "Steam ID", pattern: STEAM64, hint: "17-digit SteamID64" },
		run: null,
		listsDir: (server) => path.join(server.workingDir || server.installDir, "save-data", "Settings"),
		lists: {
			admins: { label: "Admins", file: "adminlist.txt", kind: "lines" },
			bans: { label: "Banned", file: "banlist.txt", kind: "lines" },
		},
	},
	// Project Zomboid: checked on a real server. A name nobody has answers "User <name> doesn't exist."
	zomboid: {
		who: { label: "player name", pattern: NAME, hint: "exact account name" },
		run: "rcon",
		kick: (p, r) => `kickuser "${p}"${r ? ` -r "${r}"` : ""}`,
		ban: (p, r) => `banuser "${p}"${r ? ` -r "${r}"` : ""}`,
		unban: (p) => `unbanuser "${p}"`,
		lists: {},
		nothing: /doesn't exist/i,
	},
	// Rust: checked on a real server. An id nobody has answers "Player not found" (kick, ban) or
	// "User <id> isn't banned" (unban).
	rust: {
		who: { label: "Steam ID or name", pattern: NAME, hint: "SteamID64 or exact name" },
		run: "rcon",
		kick: (p, r) => `kick ${p}${r ? ` "${r}"` : ""}`,
		ban: (p, r) => `ban ${p}${r ? ` "${r}"` : ""}`,
		unban: (p) => `unban ${p}`,
		lists: {},
		nothing: /not found|isn't banned/i,
	},
	// ARK (both): checked on a real Evolved server. Every command answers "<id> Kicked" and so
	// on whether or not anyone by that id exists, so there is no "nothing happened" reply to
	// read. The game keeps its ban list and its join-without-checks list (its whitelist) in
	// BanList.txt and PlayersJoinNoCheckList.txt beside its program.
	ark: {
		who: { label: "Steam ID", pattern: STEAM64, hint: "17-digit SteamID64 (see ListPlayers)" },
		run: "rcon",
		listsIn: "working",
		kick: (p) => `KickPlayer ${p}`,
		ban: (p) => `BanPlayer ${p}`,
		unban: (p) => `UnbanPlayer ${p}`,
		lists: {
			whitelist: { label: "Allowed to join (whitelist)", file: "PlayersJoinNoCheckList.txt", kind: "lines", add: (p) => `AllowPlayerToJoinNoCheck ${p}`, remove: (p) => `DisallowPlayerToJoinNoCheck ${p}` },
			bans: { label: "Banned", file: "BanList.txt", kind: "lines", readOnly: true, add: (p) => `BanPlayer ${p}`, remove: (p) => `UnbanPlayer ${p}` },
		},
	},
	// 7 Days to Die's own console, over Telnet. Who: a player's name or entity id.
	"7days": {
		who: { label: "player name or id", pattern: NAME, hint: "name if online, else Steam_<id>" },
		run: "telnet",
		kick: (p, r) => `kick ${p}${r ? ` "${r}"` : ""}`,
		ban: (p, r) => `ban add ${p} 1 year${r ? ` "${r}"` : ""}`,
		unban: (p) => `ban remove ${p}`,
		lists: {
			whitelist: { label: "Whitelist", add: (p) => `whitelist add ${p}`, remove: (p) => `whitelist remove ${p}` },
			admins: { label: "Admins", add: (p) => `admin add ${p} 0`, remove: (p) => `admin remove ${p}` },
		},
		nothing: /not a valid|not found|unknown|no such|invalid|could not|couldn't/i,
	},
	valheim: {
		who: { label: "Steam ID", pattern: STEAM64, hint: "17-digit SteamID64" },
		run: null,
		lists: {
			admins: { label: "Admins", file: "adminlist.txt", kind: "lines" },
			bans: { label: "Banned", file: "bannedlist.txt", kind: "lines" },
			whitelist: { label: "Allowed (whitelist)", file: "permittedlist.txt", kind: "lines" },
		},
	},
};

const gameOf = (server) => GAMES[server.type] ?? null;

export function capabilities(server) {
	const game = gameOf(server);
	if (!game) return { supported: false, kick: false, ban: false, lists: [], who: null };
	const consoleReady = game.run === "rcon" ? Boolean(server.rconPort && server.rconPassword) : game.run === "telnet" ? Boolean(server.telnetPort) : false;
	return {
		supported: true,
		who: { label: game.who.label, hint: game.who.hint },
		console: consoleReady,
		kick: Boolean(game.kick) && consoleReady,
		ban: Boolean(game.ban) && consoleReady,
		unban: Boolean(game.unban) && consoleReady,
		lists: Object.entries(game.lists ?? {}).map(([id, l]) => ({ id, label: l.label, kind: l.kind, readOnly: Boolean(l.readOnly) })),
		note: game.run === null ? "This game has no console to kick or ban from, so players are kept out with its lists. The game reads them when it starts, so restart the server after changing them." : null,
	};
}

// ---- running a command -------------------------------------------------------

async function runConsole(server, game, command) {
	if (game.run === "rcon") {
		if (!server.rconPort || !server.rconPassword) throw new PlayerAdminError("RCON isn't set up for this server.", "no_console", 409);
		if (!(await isServerRunning(server))) throw new PlayerAdminError("The server isn't running.", "not_running", 409);
		return (await sendRconCommand(server, command)) ?? "";
	}
	if (game.run === "telnet") {
		if (!server.telnetPort) throw new PlayerAdminError("The Telnet console isn't set up for this server.", "no_console", 409);
		return cleanTelnetOutput((await sendTelnetCommand(server, command)) ?? "", command);
	}
	throw new PlayerAdminError("This game has no console to do that from.", "unsupported", 409);
}

function outcome(game, response) {
	const text = String(response ?? "").trim();
	return { ok: !(game.nothing && game.nothing.test(text)), response: text };
}

function audit(server, actor, type, message, data) {
	logActivity({ type, server: server.name, message: `${actor ? `${actor}: ` : ""}${message}`, data: { actor, ...data } });
}

export async function kickPlayer(server, who, reason, actor = null) {
	const game = gameOf(server);
	if (!game?.kick) throw new PlayerAdminError("This game can't kick players from here.", "unsupported", 409);
	const target = requireName(who, game.who.pattern, game.who.label);
	const result = outcome(game, await runConsole(server, game, game.kick(target, reasonText(reason))));
	if (result.ok) audit(server, actor, "player.kicked", `Kicked ${target} from ${server.name}.`, { player: target, reason: reasonText(reason) });
	return result;
}

export async function banPlayer(server, who, reason, actor = null) {
	const game = gameOf(server);
	if (!game?.ban) throw new PlayerAdminError("This game can't ban players from here.", "unsupported", 409);
	const target = requireName(who, game.who.pattern, game.who.label);
	const result = outcome(game, await runConsole(server, game, game.ban(target, reasonText(reason))));
	if (result.ok) audit(server, actor, "player.banned", `Banned ${target} on ${server.name}.`, { player: target, reason: reasonText(reason) });
	return result;
}

export async function unbanPlayer(server, who, actor = null) {
	const game = gameOf(server);
	if (!game?.unban) throw new PlayerAdminError("This game can't unban players from here.", "unsupported", 409);
	const target = requireName(who, game.who.pattern, game.who.label);
	const result = outcome(game, await runConsole(server, game, game.unban(target)));
	if (result.ok) audit(server, actor, "player.unbanned", `Unbanned ${target} on ${server.name}.`, { player: target });
	return result;
}

// ---- the lists -----------------------------------------------------------------

async function listFolder(server, game) {
	if (game.listsDir) return game.listsDir(server);
	const kind = Object.values(game.lists)[0]?.kind;
	if (kind === "mcjson" || game.listsIn === "working") return server.workingDir || server.installDir;
	// Valheim keeps these beside its saves: the -savedir folder, or the shared default.
	const { specs } = await backupSpecsFor(server);
	const spec = specs[0];
	if (!spec) throw new PlayerAdminError("Couldn't work out where this game keeps its player lists.", "no_folder", 409);
	return spec.path;
}

function parseLines(text) {
	return text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("//") && !l.startsWith("#"))
		.map((id) => ({ id }));
}

// ---- Minecraft's operator levels ---------------------------------------------------
// An operator has a level from 1 to 4 (ops.json), and each level can do what the ones below it can.

export const MC_OP_LEVELS = [
	{ level: 1, name: "Moderator", description: "Can build inside the spawn protection area. Nothing else." },
	{ level: 2, name: "Gamemaster", description: "Cheats: /gamemode, /give, /tp, /effect, /gamerule, /summon, command blocks." },
	{ level: 3, name: "Admin", description: "Manages players: /op, /deop, /kick, /ban, /pardon, /whitelist." },
	{ level: 4, name: "Owner", description: "Everything, including /stop and /save-all." },
];
const MC_DEFAULT_OP_LEVEL = 4;

/** The level `op` gives, and the one this panel's "Add" uses when no level is chosen: op-permission-level in server.properties. */
async function defaultOpLevel(server) {
	try {
		const text = await fs.readFile(path.join(server.workingDir || server.installDir, "server.properties"), "utf8");
		const m = /^\s*op-permission-level\s*=\s*(\d)/m.exec(text);
		if (m && Number(m[1]) >= 1 && Number(m[1]) <= 4) return Number(m[1]);
	} catch {
		// No file yet: the game's own default.
	}
	return MC_DEFAULT_OP_LEVEL;
}

const levelOf = (value) => {
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 4) throw new PlayerAdminError("An operator level is 1, 2, 3 or 4.", "bad_level");
	return n;
};

/** The UUID Minecraft knows a name by. Offline servers derive it from the name; online ones ask Mojang. `fetchProfile` is for tests. */
export const deps = { fetchProfile: (name) => defaultProfileLookup(name) };
export async function minecraftUuid(server, name, { fetchProfile = deps.fetchProfile } = {}) {
	let onlineMode = true;
	try {
		const text = await fs.readFile(path.join(server.workingDir || server.installDir, "server.properties"), "utf8");
		if (/^\s*online-mode\s*=\s*false\s*$/im.test(text)) onlineMode = false;
	} catch {
		// Assume the default, online.
	}
	let hex;
	if (!onlineMode) {
		const bytes = crypto.createHash("md5").update(`OfflinePlayer:${name}`).digest();
		bytes[6] = (bytes[6] & 0x0f) | 0x30;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		hex = bytes.toString("hex");
	} else {
		hex = await fetchProfile(name);
		if (!/^[0-9a-f]{32}$/i.test(hex ?? "")) throw new PlayerAdminError(`Couldn't find a Minecraft account called ${name}. Check the spelling, or start the server and add them from there.`, "no_profile", 404);
	}
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
}

async function defaultProfileLookup(name) {
	try {
		const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(8000) });
		return res.ok ? (await res.json()).id : null;
	} catch {
		return null;
	}
}

function parseMcJson(text) {
	try {
		const data = JSON.parse(text);
		return Array.isArray(data) ? data.map((e) => ({ id: e.name ?? e.uuid, name: e.name, uuid: e.uuid, reason: e.reason, level: e.level, bypassesPlayerLimit: e.bypassesPlayerLimit })) : [];
	} catch {
		return [];
	}
}

async function readList(folder, list) {
	const file = path.join(folder, list.file);
	let text = "";
	try {
		text = await fs.readFile(file, "utf8");
	} catch (err) {
		if (err.code !== "ENOENT") throw err;
	}
	return { file, entries: list.kind === "lines" ? parseLines(text) : parseMcJson(text), text };
}

export async function readLists(server) {
	const game = gameOf(server);
	if (!game) throw new PlayerAdminError("This game has no player lists the panel can manage.", "unsupported", 409);
	const folder = await listFolder(server, game);
	const out = [];
	for (const [id, list] of Object.entries(game.lists)) {
		const { file, entries } = await readList(folder, list);
		// Minecraft's operators have levels; the interface offers them (and what each can do) with the list.
		const tiers = server.type === "minecraft" && id === "admins" ? { levels: MC_OP_LEVELS, defaultLevel: await defaultOpLevel(server) } : {};
		out.push({ id, label: list.label, kind: list.kind, readOnly: Boolean(list.readOnly), file, entries, ...tiers });
	}
	return out;
}

async function writeList(file, text, source) {
	let managed = false;
	try {
		managed = isWithinAllowedRoots(file);
	} catch {
		// No settings to say where the managed folders are (outside the running panel): plain write below.
	}
	if (managed) return writeManagedFile(file, text, source);
	// A shared default folder (outside the server's own): only these fixed list files are written.
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.copyFile(file, `${file}.bak`).catch(() => {});
	await fs.writeFile(file, text, "utf8");
}

const isMcOps = (server, listId) => server.type === "minecraft" && listId === "admins";

/** Write ops.json with this operator at this level, adding them (with their UUID) if they aren't there. Server must be stopped. */
async function writeOperator(server, target, level, actor, { fetchProfile } = {}) {
	const folder = await listFolder(server, gameOf(server));
	const list = gameOf(server).lists.admins;
	const { file, text } = await readList(folder, list);
	let data = [];
	try {
		data = text.trim() ? JSON.parse(text) : [];
	} catch {
		throw new PlayerAdminError("ops.json can't be read (it isn't valid JSON), so it was not changed.", "bad_file", 409);
	}
	if (!Array.isArray(data)) throw new PlayerAdminError("ops.json isn't a list, so it was not changed.", "bad_file", 409);
	const existing = data.find((e) => String(e.name).toLowerCase() === target.toLowerCase());
	const added = !existing;
	if (existing) existing.level = level;
	else data.push({ uuid: await minecraftUuid(server, target, fetchProfile ? { fetchProfile } : undefined), name: target, level, bypassesPlayerLimit: false });
	await writeList(file, JSON.stringify(data, null, 2) + "\n", list.label + " (" + (added ? "added " : "changed ") + target + ")");
	audit(server, actor, added ? "player.list_added" : "player.op_level", (added ? "Made " : "Set ") + target + (added ? " an operator at" : " to") + " level " + level + " on " + server.name + ".", { list: "admins", player: target, level });
	return { ok: true, changed: true, message: target + " is " + (added ? "now an operator at" : "now") + " level " + level + ". The server reads this list when it starts." };
}

const mustBeStopped = (what) =>
	new PlayerAdminError("Stop the server first: a running Minecraft server keeps its operator list in memory, so " + what + " would be lost or ignored.", "server_running", 409);

/** Change an existing operator's level (Minecraft). The server must be stopped; the new level applies when it starts. */
export async function setOpLevel(server, who, level, actor = null) {
	if (!isMcOps(server, "admins")) throw new PlayerAdminError("Only Minecraft operators have levels.", "unsupported", 409);
	const target = requireName(who, gameOf(server).who.pattern, gameOf(server).who.label);
	const chosen = levelOf(level);
	if (await isServerRunning(server)) throw mustBeStopped("a changed level");
	const { entries } = await readList(await listFolder(server, gameOf(server)), gameOf(server).lists.admins);
	if (!entries.some((e) => String(e.name).toLowerCase() === target.toLowerCase())) throw new PlayerAdminError(target + " isn't an operator.", "not_found", 404);
	return writeOperator(server, target, chosen, actor);
}

export async function addToList(server, listId, who, actor = null, { level, fetchProfile } = {}) {
	const game = gameOf(server);
	const list = game?.lists?.[listId];
	if (!list) throw new PlayerAdminError("That list doesn't exist for this game.", "bad_list", 404);
	const target = requireName(who, game.who.pattern, game.who.label);

	// A Minecraft operator can be given a level. A running server only does that at its own default (the op command); a stopped
	// one is edited in ops.json, which is the only place a different level can be set.
	if (isMcOps(server, listId)) {
		const chosen = level === undefined || level === null || level === "" ? null : levelOf(level);
		const running = await isServerRunning(server);
		const def = await defaultOpLevel(server);
		if (running && chosen !== null && chosen !== def) {
			throw new PlayerAdminError("A running server can only make someone an operator at its default level (" + def + "). Stop the server to choose level " + chosen + ", or add them now and change the level after stopping it.", "server_running", 409);
		}
		if (!running) return writeOperator(server, target, chosen ?? def, actor, { fetchProfile });
	}

	if (list.kind === "lines" && !list.add) {
		const { file, text, entries } = await readList(await listFolder(server, game), list);
		if (entries.some((e) => e.id === target)) return { ok: true, changed: false, message: `${target} is already on the list.` };
		const eol = text.includes("\r\n") ? "\r\n" : "\n";
		const next = `${text.replace(/\s*$/, "")}${text.trim() ? eol : ""}${target}${eol}`;
		await writeList(file, next, `${list.label} (added ${target})`);
		audit(server, actor, "player.list_added", `Added ${target} to ${server.name}'s ${list.label.toLowerCase()}.`, { list: listId, player: target });
		return { ok: true, changed: true, message: `Added ${target}. The game reads this list when it starts, so restart the server for it to apply.` };
	}

	if (list.readOnly) throw new PlayerAdminError(`Use Ban to add to the ${list.label.toLowerCase()}.`, "read_only", 409);
	const result = outcome(game, await runConsole(server, game, list.add(target)));
	if (result.ok) audit(server, actor, "player.list_added", `Added ${target} to ${server.name}'s ${list.label.toLowerCase()}.`, { list: listId, player: target });
	return { ...result, changed: result.ok, message: result.response };
}

export async function removeFromList(server, listId, who, actor = null) {
	const game = gameOf(server);
	const list = game?.lists?.[listId];
	if (!list) throw new PlayerAdminError("That list doesn't exist for this game.", "bad_list", 404);
	const target = requireName(who, game.who.pattern, game.who.label);

	// A stopped Minecraft server has no console to deop from: take them out of ops.json.
	if (isMcOps(server, listId) && !(await isServerRunning(server))) {
		const { file, text } = await readList(await listFolder(server, game), list);
		let data = [];
		try {
			data = text.trim() ? JSON.parse(text) : [];
		} catch {
			throw new PlayerAdminError("ops.json can't be read (it isn't valid JSON), so it was not changed.", "bad_file", 409);
		}
		const kept = data.filter((e) => String(e.name).toLowerCase() !== target.toLowerCase());
		if (kept.length === data.length) return { ok: true, changed: false, message: target + " isn't an operator." };
		await writeList(file, JSON.stringify(kept, null, 2) + "\n", list.label + " (removed " + target + ")");
		audit(server, actor, "player.list_removed", "Removed " + target + " from " + server.name + "'s operators.", { list: listId, player: target });
		return { ok: true, changed: true, message: "Removed " + target + ". The server reads this list when it starts." };
	}

	if (list.kind === "lines" && !list.add) {
		const { file, text, entries } = await readList(await listFolder(server, game), list);
		if (!entries.some((e) => e.id === target)) return { ok: true, changed: false, message: `${target} isn't on the list.` };
		const eol = text.includes("\r\n") ? "\r\n" : "\n";
		const next = text.split(/\r?\n/).filter((l) => l.trim() !== target).join(eol);
		await writeList(file, next, `${list.label} (removed ${target})`);
		audit(server, actor, "player.list_removed", `Removed ${target} from ${server.name}'s ${list.label.toLowerCase()}.`, { list: listId, player: target });
		return { ok: true, changed: true, message: `Removed ${target}. The game reads this list when it starts, so restart the server for it to apply.` };
	}

	const result = outcome(game, await runConsole(server, game, list.remove(target)));
	if (result.ok) audit(server, actor, "player.list_removed", `Removed ${target} from ${server.name}'s ${list.label.toLowerCase()}.`, { list: listId, player: target });
	return { ...result, changed: result.ok, message: result.response };
}

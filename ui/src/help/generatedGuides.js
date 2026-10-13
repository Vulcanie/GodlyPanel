// The two guides that are written out of the game catalogs rather than out of panelHelp.js:
//   - the launch arguments guide (docs/LAUNCH_ARGUMENTS.md), from ui/src/catalog/launchArgs.js
//   - the game settings guide (docs/GAME_SETTINGS.md), from ui/src/configCatalog.js and the files in ui/src/catalog
// scripts/build-guides.mjs renders them with renderGuide.js; the tests check the committed pages are what this makes.
//
// Everything here is deterministic: it follows the order the catalogs are written in, and nothing depends on the date.
import { LAUNCH_ARGS } from "../catalog/launchArgs.js";
import { CONFIG_CATALOG } from "../configCatalog.js";
import { guideUrl, slugify } from "./guides.js";

// ──────────────────────────────── Shared helpers ────────────────────────────────

/**
 * Text that is safe inside a markdown table cell or paragraph: a pipe would end the cell, and a bare <LINE> or <name> would be
 * taken for an HTML tag and vanish from the page, so those are shown as code.
 */
const mdText = (text) =>
	String(text)
		.replace(/\s*\r?\n\s*/g, " ")
		.replace(/<[A-Za-z][^<>\s]*>/g, (tag) => `\`${tag}\``)
		.replace(/\|/g, "\\|");

/** A value as code. Backticks inside it are rare, but would end the code span, so they are dropped. */
const code = (value) => `\`${String(value).replace(/`/g, "")}\``;

/** The choices of a setting as a sentence: `a` (what it means), `b` ... */
function choicesText(options) {
	return options
		.map((o) => {
			const [value, label] = Array.isArray(o) ? o : [o.value, o.label];
			return label && label !== value ? `${code(value)} (${mdText(label)})` : code(value);
		})
		.join(", ");
}

// ──────────────────────────────── Launch arguments ────────────────────────────────

/** How an argument is written on the line, for the example: "-port 2456", "-Port=7777", "-Xmx4g". */
function exampleLine(def, arg) {
	if (arg.example === undefined || arg.kind === "bool") return null;
	const example = String(arg.example);
	// Some examples are already the whole thing (a map and its ?options, or "-modifier combat hard").
	if (arg.flag.startsWith("<") || example.startsWith(arg.flag)) return example;
	if (arg.kind === "attached") return `${arg.flag}${example}`;
	const style = arg.style ?? def.style;
	return style === "equals" ? `${arg.flag}=${example}` : `${arg.flag} ${example}`;
}

function launchNotes(def, arg) {
	const notes = [];
	if (def.editable && arg.edit === false) notes.push("Not offered in the Launch options form; the panel sets it and it is best left alone.");
	else if (arg.managed) notes.push("The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.");
	return notes;
}

function launchEntries() {
	// A flag several games share (-batchmode, -port) gets the game's name in its heading so every heading, and so every link, is unique.
	const seen = new Map();
	for (const def of Object.values(LAUNCH_ARGS)) for (const arg of def.args) seen.set(arg.flag, (seen.get(arg.flag) ?? 0) + 1);

	const entries = [];
	for (const def of Object.values(LAUNCH_ARGS)) {
		entries.push({
			id: `launch.${slugify(def.title)}`,
			guide: "launch",
			section: def.title,
			title: def.title,
			text: `${def.intro} These arguments are on ${def.where}.`,
			details: def.editable
				? "The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is."
				: "This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.",
		});
		for (const arg of def.args) {
			const shared = seen.get(arg.flag) > 1;
			const lines = [];
			if (arg.options?.length) lines.push(`Values: ${choicesText(arg.options)}${arg.allowCustom ? ". Other values are accepted too." : "."}`);
			const example = exampleLine(def, arg);
			if (example) lines.push(`Example: ${code(example)}`);
			lines.push(...launchNotes(def, arg));
			entries.push({
				id: `launch.${slugify(def.title)}.${slugify(arg.flag)}`,
				guide: "launch",
				section: def.title,
				title: `${shared ? `${def.title}: ` : ""}${code(arg.flag)}`,
				text: `**${mdText(arg.label)}** (${mdText(arg.group)}). ${mdText(arg.description)}`,
				details: lines.join("\n\n"),
			});
		}
	}
	return entries;
}

export const launchGuideEntries = {
	doc: {
		title: "Launch arguments guide",
		intro: [
			"Many game servers are set up, wholly or partly, by arguments on the command that starts them. This page explains the arguments GodlyPanel knows about, game by game. It is what the **All launch arguments** list on a server's Settings tab links to.",
			"A server is started by a small script, a `.bat` file, in the server's folder. One line of it runs the game's program, followed by its arguments, for example `valheim_server.exe -nographics -batchmode -port 2456`. A flag starting with `-` or `+` is an argument; some take a value after them (`-port 2456`, `-Port=7777`, `+server.maxplayers 50`), others stand alone (`-batchmode`).",
			"For the games marked as editable, the **Launch options** form on the server's Settings tab reads that one line and writes your changes back into it. Nothing else in the script is touched, and leaving a box empty takes the argument off the line. Changes apply the next time the server starts. For every other game, or for an argument the form does not offer, use **Edit Batch Files** on the server's page.",
			"Some arguments are put on the line by GodlyPanel when it creates the server (ports, folders, the log file, the remote console). They are marked below. Change a port from the server's **Ports** section rather than here, so the panel can check for clashes and open the right firewall rules.",
			"Settings that live in a game's own settings file are in the [game settings guide](GAME_SETTINGS.md).",
		],
	},
	entries: launchEntries,
};

// ──────────────────────────────── Game settings ────────────────────────────────

// Where each game keeps its settings and what to know about them, by the key the game has in CONFIG_CATALOG. The paths are the ones
// src/server/data/gameTemplates.js records for a server the panel creates, relative to the server's install folder.
// `short` names the game in the headings of its groups; `files` says what each file in the catalog is.
const GAME_INFO = {
	ark: {
		name: "ARK: Survival Ascended / Evolved",
		short: "ARK",
		summary: "ARK is set up in two files that both live in `ShooterGame\\Saved\\Config\\WindowsServer\\` inside the server's install folder. The panel's Settings tab shows both. The game makes them the first time it runs.",
		files: {
			"GameUserSettings.ini": "The server's name, passwords, player and tribe rules, taming, harvesting, structures, performance and admin options. The settings are in the `[ServerSettings]` section, plus the session name, the message of the day and the player limit.",
			"Game.ini": "The gameplay multipliers in the `[/Script/ShooterGame.ShooterGameMode]` section: experience, taming, harvesting, PvP and structures.",
		},
		notes: [
			"ARK has far more options than are listed here. In particular `Game.ini` also holds engram, crafting, spawn and level overrides, which are long and specialised. Anything the panel does not have an explanation for is still shown, without one.",
		],
	},
	conan: {
		name: "Conan Exiles",
		short: "Conan Exiles",
		summary: "Conan Exiles keeps its settings in `ConanSandbox\\Saved\\Config\\WindowsServer\\ServerSettings.ini` inside the server's install folder.",
		files: { "ServerSettings.ini": "Everything in the `[ServerSettings]` section: names, passwords, rates, building and combat rules." },
		notes: ["The remote console (RCON) settings are in `Game.ini` beside it. The panel manages that file itself, so it is not part of this list."],
	},
	minecraft: {
		name: "Minecraft (Java)",
		short: "Minecraft",
		summary: "Minecraft keeps its settings in `server.properties` in the server's install folder: one `name=value` line per setting.",
		files: { "server.properties": "The whole server: name, gameplay, world generation, who can join, networking and the resource pack." },
		notes: ["Mods and plugins add settings in files of their own (a `config` folder, a plugin's folder). The panel does not explain those."],
	},
	enshrouded: {
		name: "Enshrouded",
		short: "Enshrouded",
		summary: "Enshrouded keeps its settings in `enshrouded_server.json` in the server's install folder.",
		files: { "enshrouded_server.json": "The server's name, ports, slot count and the rules of the world (`gameSettings`). The player groups with their passwords (`userGroups`) are listed separately from these simple settings." },
		notes: [],
	},
	"7days": {
		name: "7 Days to Die",
		short: "7 Days to Die",
		summary: "7 Days to Die keeps almost all of its settings in `serverconfig.xml` in the server's install folder. Each is a `<property name=\"...\" value=\"...\"/>` line. The launch line only says where that file is and where saves go.",
		files: { "serverconfig.xml": "Everything about the server and the world: name, ports, difficulty, day length, loot, blood moon, land claims and more." },
		notes: ["A setting the file does not list keeps the game's own default. To use another value, add its line to the file."],
	},
	subsistence: {
		name: "Subsistence",
		short: "Subsistence",
		summary: "Subsistence keeps its settings in `UDKGame\\Config\\UDKDedServerSettings.ini` inside the server's install folder.",
		files: { "UDKDedServerSettings.ini": "The server's own options. The panel does not have explanations for this file yet." },
		notes: ["Subsistence has no documented settings in the panel yet. The Settings tab shows what is in the file, using any comment the game wrote beside a line as its explanation, but nothing here is explained by the panel."],
	},
	rune: {
		name: "RuneScape: Dragonwilds",
		short: "Dragonwilds",
		summary: "RuneScape: Dragonwilds keeps its settings in `RSDragonwilds\\Saved\\Config\\WindowsServer\\DedicatedServer.ini` inside the server's install folder.",
		files: { "DedicatedServer.ini": "The server's name, the world password, the admin password and the world's save name." },
		notes: ["The file also holds an owner ID and a server GUID. The game makes them itself on its first start, so the panel hides them. Only four settings are explained so far."],
	},
	windrose: {
		name: "Windrose",
		short: "Windrose",
		summary: "Windrose keeps its settings in `R5\\ServerDescription.json` inside the server's install folder.",
		files: { "ServerDescription.json": "The server's name, password, player limit, region and how players connect." },
		notes: ["The file also holds identifiers the game makes itself (a version, a deployment, a persistent server ID and a world island ID). The panel hides them so they are not changed by accident."],
	},
	valheim: {
		name: "Valheim",
		short: "Valheim",
		summary: "Valheim has no settings file. A dedicated server is set up entirely by the arguments on the command that starts it, so its settings are on the Settings tab under **Launch options**.",
		files: {},
		notes: [],
	},
	palword: {
		name: "Palworld",
		short: "Palworld",
		summary: "Palworld keeps its settings in `Pal\\Saved\\Config\\WindowsServer\\PalWorldSettings.ini` inside the server's install folder. The file holds them all on one `OptionSettings=(...)` line; the panel shows each option as its own setting and writes the line back together.",
		files: { "PalWorldSettings.ini": "The server's name, passwords, ports, rates and rules." },
		notes: ["Palworld has many more options than are listed here. Anything without an explanation is still shown."],
	},
	rust: {
		name: "Rust",
		short: "Rust",
		summary: "Rust is set up with console variables (\"convars\"), named like `server.hostname`. The panel's start script puts some of them on the launch line, and the rest can go in `server\\<identity>\\cfg\\server.cfg` (inside the server's install folder), one per line. A value on the launch line wins over the same one in `server.cfg`.",
		files: { "server.cfg": "Any console variable, one per line: its name, then its value (in quotes when it has spaces)." },
		notes: ["Rust does not make `server.cfg` until it is asked to (`server.writecfg` in the console), so the file may not exist yet. You can write one from the Settings tab."],
	},
	zomboid: {
		name: "Project Zomboid",
		short: "Project Zomboid",
		summary: "Project Zomboid keeps the server's options in `zomboid\\Server\\<name>.ini` inside the server's install folder, where `<name>` is the server's settings name (`servertest` by default). The game makes the file the first time the server starts.",
		files: { "servertest.ini": "The server's name, passwords, ports, gameplay rules, loot and building, safehouses, factions, saving, voice chat, Discord, moderation and mods." },
		notes: ["How the world itself plays (zombie numbers, loot, the speed of the seasons) is in `<name>_SandboxVars.lua`, which the Settings tab does not edit. Mods add their own options, which are not explained."],
	},
	vrising: {
		name: "V Rising",
		short: "V Rising",
		summary: "V Rising keeps the server's options in `save-data\\Settings\\ServerHostSettings.json` inside the server's install folder.",
		files: { "ServerHostSettings.json": "The server's name, passwords, ports, listing, saves and player limits." },
		notes: ["The rules of the world itself (clan size, blood drain, castle rules and similar) are in `ServerGameSettings.json`, which the game makes the first time it runs. The Settings tab does not edit that file."],
	},
	sotf: {
		name: "Sons of the Forest",
		short: "Sons of the Forest",
		summary: "Sons of the Forest keeps its settings in `userdata\\dedicatedserver.cfg` inside the server's install folder. The file is JSON even though it is called `.cfg`.",
		files: { "dedicatedserver.cfg": "The server's name, password, ports, saves and the rules of the game, including the custom game mode rules." },
		notes: [],
	},
	corekeeper: {
		name: "Core Keeper",
		short: "Core Keeper",
		summary: "The panel sets Core Keeper up from the arguments on the command that starts it, so its settings on the Settings tab are the **Launch options**. It has no settings file in the panel yet.",
		files: {},
		notes: [],
	},
	satisfactory: {
		name: "Satisfactory",
		short: "Satisfactory",
		summary: "Satisfactory is set up from inside the game (the Server Manager screen, with the server's address and port) and by a few launch arguments, which are the **Launch options** on the Settings tab. It has no settings file in the panel.",
		files: {},
		notes: [],
	},
};

/** The groups of one file in the order the form shows them: the catalog's groupOrder first, then the rest as they first appear. */
function groupsOf(file) {
	const groups = new Map();
	for (const [key, meta] of Object.entries(file.settings)) {
		if (!groups.has(meta.group)) groups.set(meta.group, []);
		groups.get(meta.group).push([key, meta]);
	}
	const rank = new Map((file.groupOrder ?? []).map((name, i) => [name, i]));
	const first = new Map([...groups.keys()].map((name, i) => [name, i]));
	return [...groups.entries()].sort(([a], [b]) => (rank.get(a) ?? 1000) - (rank.get(b) ?? 1000) || first.get(a) - first.get(b));
}

/** The name a setting has in its file: "Section::Key" is shown as Key with its section, a dotted JSON path as it is. */
function keyCell(key) {
	const at = key.lastIndexOf("::");
	if (at < 0) return code(key);
	return `${code(key.slice(at + 2))} in ${code(`[${key.slice(0, at)}]`)}`;
}

function settingsTable(settings) {
	const rows = settings.map(([key, meta]) => {
		let what = mdText(meta.description);
		if (meta.options?.length) what += ` Choices: ${choicesText(meta.options)}${meta.allowCustom ? ". Another value can be typed." : "."}`;
		return `| ${mdText(meta.label)} | ${keyCell(key)} | ${what} |`;
	});
	return ["| Setting | Name in the file | What it does |", "| --- | --- | --- |", ...rows].join("\n");
}

function gameEntries() {
	const entries = [];
	for (const [game, catalog] of Object.entries(CONFIG_CATALOG)) {
		const info = GAME_INFO[game];
		if (!info) throw new Error(`generatedGuides.js: no description for the game "${game}" in GAME_INFO`);
		const section = info.name;
		const own = Object.entries(catalog.files).filter(([, f]) => !f.launch);
		const hasLaunch = Object.values(catalog.files).some((f) => f.launch);
		const launchDef = LAUNCH_ARGS[game === "palword" ? "palworld" : game];

		const details = [];
		for (const [name] of own) details.push(`- ${code(name)}: ${info.files[name] ?? "Settings of the server."}`);
		if (hasLaunch || launchDef) {
			const launchLink = launchDef ? `[launch arguments guide](${`LAUNCH_ARGUMENTS.md#${slugify(launchDef.title)}`})` : "launch arguments guide";
			details.push(`- Launch arguments: ${hasLaunch ? "the **Launch options** file on the Settings tab edits them" : "they are in the start script"}. See the ${launchLink}.`);
		}
		if (info.notes.length) details.push("", ...info.notes);
		entries.push({ id: `games.${game}`, guide: "games", section, title: section, text: info.summary, details: details.join("\n") });

		for (const [name, file] of own) {
			const groups = groupsOf(file);
			if (!groups.length) {
				entries.push({
					id: `games.${game}.${slugify(name)}`,
					guide: "games",
					section,
					title: `${info.short}: ${name}`,
					text: `The panel has no explanations for ${code(name)} yet. The Settings tab still shows every setting in the file, and the game's own comments beside them where there are any.`,
				});
				continue;
			}
			const label = own.length > 1 ? `${info.short} (${name})` : info.short;
			for (const [group, settings] of groups) {
				entries.push({
					id: `games.${game}.${slugify(name)}.${slugify(group)}`,
					guide: "games",
					section,
					title: `${label}: ${group}`,
					text: `${settings.length === 1 ? "1 setting" : `${settings.length} settings`} in ${code(name)}, shown under **${mdText(group)}** on the Settings tab.`,
					details: settingsTable(settings),
				});
			}
		}
	}
	return entries;
}

export const gameGuideEntries = {
	doc: {
		title: "Game settings guide",
		intro: [
			"What the settings on a server's **Settings** tab mean, game by game. Each game has the file its settings are kept in, where that file is, and a table of every setting the panel explains: the label you see on screen, the name the setting has in the file, and what it does. The settings are grouped the way the Settings tab groups them.",
			"The panel explains the game's own settings. **Mods will not have explanations.** Mods and plugins add settings of their own, and so do game updates newer than this panel, so a setting the panel does not know appears on the Settings tab with no explanation, and the form says how many there are. Look those up in the mod's or the game's own documentation.",
			"A setting that is not listed in the file keeps the game's own default. Some games only write a setting to the file after you change it, so a setting in these tables may not be in your file yet.",
			"Some games are set up by the arguments on the command that starts them, not by a file. Those are in the [launch arguments guide](LAUNCH_ARGUMENTS.md). For the controls on the server's page itself (ports, backups, schedules and so on), see the [server options guide](SERVER_OPTIONS.md).",
		],
	},
	entries: gameEntries,
};

// Exposed for the tests: the games the guide has a description for, and the link a launch section is reached by.
export const GAME_GUIDE_INFO = GAME_INFO;
export const launchSectionUrl = (title) => guideUrl("launch", title);

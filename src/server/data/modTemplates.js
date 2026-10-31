import path from "node:path";
import { GAME_MODULES } from "./games/index.js";

// How each game takes mods, and what the panel can do about it.
//
//   folder       mods are files or folders dropped into a directory the game reads
//   workshop     Steam Workshop items, downloaded with SteamCMD and listed in a file
//   thunderstore Thunderstore packages, unpacked into BepInEx's plugins folder
//   script-ids   mod ids written into the start script (ARK)
//
// `dir` is where the game looks: `base` and `rel` work as in backupTemplates.js.
// `sources` lists the places a mod can be fetched from (see services/modSources), so the
// Mods tab only offers the ones a game can use. Games not listed here have no mod support in the panel.
//
// A game module can declare its own block (`mods` in games/<id>.js); collectModBlocks adds it below.
//
// Only Conan Exiles and Minecraft are checked against the real games so far.

export const MOD_ADAPTERS = ["folder", "workshop", "thunderstore", "script-ids"];
const LOADERS = ["forge", "fabric", "quilt", "neoforge"];
// Keys a block may carry beyond the ones the panel reads itself (adapter, label, dir, accepts, sources, loader, gameVersionFrom, note).
const EXTRA_KEYS = ["appId", "community", "framework", "flag"];
const KEYS = ["adapter", "label", "dir", "accepts", "sources", "loader", "gameVersionFrom", "note", ...EXTRA_KEYS];
const DIR_ADAPTERS = ["folder", "workshop", "thunderstore"];
const ACCEPT_EXT = /^\.[a-z0-9]{1,10}$/;
const DOTTED_PATH = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$|^[A-Za-z][A-Za-z0-9]*$/;

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// A relative path that stays inside the folder it is given. Checked for Windows forms too (drive letters, backslashes),
// because a panel that runs on Windows would follow them.
function dirProblems(dir) {
	if (!isPlainObject(dir)) return ["dir is required: { base, rel }"];
	const problems = [];
	if (dir.base !== "working" && dir.base !== "install") problems.push('dir.base must be "working" or "install"');
	const rel = dir.rel;
	if (typeof rel !== "string" || rel === "") {
		problems.push("dir.rel must be a non-empty string");
	} else if (rel.includes("\0")) {
		problems.push("dir.rel has a NUL character");
	} else if (path.win32.isAbsolute(rel) || /^[A-Za-z]:/.test(rel)) {
		problems.push("dir.rel must be relative, not absolute");
	} else if (rel.split(/[\\/]/).includes("..")) {
		problems.push("dir.rel must not go up with ..");
	}
	return problems;
}

/**
 * The problems with one mods block, as readable sentences. An empty list means the block is valid.
 * `knownSources` (the ids from services/modSources) is optional: this file can't import it, because the sources
 * import the mod service, which imports this file. Without it the sources are checked for shape only.
 */
export function validateModBlock(block, knownSources) {
	if (!isPlainObject(block)) return ["the mods block must be an object"];
	const problems = [];
	for (const key of Object.keys(block)) {
		if (!KEYS.includes(key)) problems.push(`unknown key ${key}`);
	}
	const { adapter } = block;
	if (!MOD_ADAPTERS.includes(adapter)) problems.push(`adapter must be one of ${MOD_ADAPTERS.join(", ")}`);
	if (typeof block.label !== "string" || block.label.trim() === "") problems.push("label must be a non-empty string");

	if (DIR_ADAPTERS.includes(adapter)) {
		problems.push(...dirProblems(block.dir));
	} else if (adapter === "script-ids") {
		// ARK's ids live in the start script, not a folder, so there is no dir to check.
		if (block.dir !== undefined) problems.push("script-ids takes no dir");
		if (typeof block.flag !== "string" || block.flag === "") problems.push("script-ids needs a flag");
	}

	if (block.accepts !== undefined) {
		if (!Array.isArray(block.accepts)) {
			problems.push("accepts must be an array");
		} else {
			for (const item of block.accepts) {
				if (item !== "archive" && !(typeof item === "string" && ACCEPT_EXT.test(item))) problems.push(`accepts item ${JSON.stringify(item)} must be "archive" or a file extension like ".jar"`);
			}
		}
	}

	if (block.sources !== undefined) {
		if (!Array.isArray(block.sources)) {
			problems.push("sources must be an array");
		} else {
			const known = Array.isArray(knownSources) ? new Set(knownSources) : null;
			for (const item of block.sources) {
				if (typeof item !== "string") problems.push("sources must hold strings");
				else if (known && !known.has(item)) problems.push(`sources item ${item} is not a known mod source`);
			}
			if (new Set(block.sources).size !== block.sources.length) problems.push("sources must not repeat");
		}
	}

	if (block.loader !== undefined && !LOADERS.includes(block.loader)) problems.push(`loader must be one of ${LOADERS.join(", ")}`);
	if (block.gameVersionFrom !== undefined && !(typeof block.gameVersionFrom === "string" && DOTTED_PATH.test(block.gameVersionFrom))) {
		problems.push("gameVersionFrom must be a field path like mcVersion or versions.game");
	}
	if (block.note !== undefined && typeof block.note !== "string") problems.push("note must be a string");
	for (const key of ["appId", "community", "flag"]) {
		if (block[key] !== undefined && (typeof block[key] !== "string" || block[key] === "")) problems.push(`${key} must be a non-empty string`);
	}
	if (block.framework !== undefined && (!isPlainObject(block.framework) || typeof block.framework.owner !== "string" || typeof block.framework.name !== "string")) {
		problems.push("framework must be { owner, name }");
	}
	return problems;
}

/**
 * Add each game module's `mods` block to `target`, keyed by its template id. A block can't replace an entry that is already
 * there (a typo in a game's id would otherwise silently overwrite Conan's entry), and an invalid block stops the load
 * with the template id in the message.
 */
export function collectModBlocks(target, modules, knownSources) {
	for (const m of modules) {
		if (!m.mods) continue;
		const id = m.template.id;
		if (Object.hasOwn(target, id)) throw new Error(`The game ${id} declares mods, but its id already has mod support built in. Pick another template id or drop the mods block.`);
		const problems = validateModBlock(m.mods, knownSources);
		if (problems.length > 0) throw new Error(`The mods block of ${id} is invalid: ${problems.join("; ")}`);
		target[id] = m.mods;
	}
	return target;
}

export const MOD_TEMPLATES = {
	"minecraft-modpack": {
		adapter: "folder",
		label: "Mods",
		dir: { base: "working", rel: "mods" },
		accepts: [".jar"],
		sources: ["modrinth", "curseforge", "github", "url"],
		note: "Drop mod .jar files here. They must match the modpack's Minecraft and loader version.",
	},
	"7days": {
		adapter: "folder",
		label: "Mods",
		dir: { base: "working", rel: "Mods" },
		accepts: ["archive"],
		sources: ["github", "url"],
		note: "Each mod is a folder (with a ModInfo.xml) inside the Mods folder. Upload a mod's .zip.",
	},
	palworld: {
		adapter: "folder",
		label: "Mods",
		dir: { base: "working", rel: "Pal/Content/Paks/~mods" },
		accepts: [".pak"],
		sources: ["github", "url"],
		note: "Pak mods go in the ~mods folder.",
	},
	conan: {
		adapter: "workshop",
		label: "Mods",
		appId: "440900",
		dir: { base: "working", rel: "ConanSandbox/Mods" },
		accepts: [".pak"],
		sources: ["workshop", "url"],
		note: "Add a Steam Workshop item by its number, or upload a .pak. The panel keeps modlist.txt for you.",
	},
	valheim: {
		adapter: "thunderstore",
		label: "Mods (BepInEx)",
		dir: { base: "working", rel: "BepInEx/plugins" },
		accepts: [".dll", "archive"],
		sources: ["thunderstore", "github", "url"],
		community: "valheim",
		framework: { owner: "denikson", name: "BepInExPack_Valheim" },
		note: "Adds BepInEx if it isn't there, then installs mods from Thunderstore by name (Owner-Name).",
	},
	"ark-ase": { adapter: "script-ids", label: "Mods", flag: "GameModIds", sources: [], note: "Steam Workshop mod numbers, in the order they load." },
	"ark-asa": { adapter: "script-ids", label: "Mods", flag: "-mods=", sources: [], note: "CurseForge mod numbers, in the order they load." },
};

// Games added one module each (see games/index.js).
collectModBlocks(MOD_TEMPLATES, GAME_MODULES);

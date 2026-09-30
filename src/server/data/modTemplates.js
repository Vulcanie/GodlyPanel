// How each game takes mods, and what the panel can do about it.
//
//   folder       mods are files or folders dropped into a directory the game reads
//   workshop     Steam Workshop items, downloaded with SteamCMD and listed in a file
//   thunderstore Thunderstore packages, unpacked into BepInEx's plugins folder
//   script-ids   mod ids written into the start script (ARK)
//
// `dir` is where the game looks: `base` and `rel` work as in backupTemplates.js.
// Games not listed here have no mod support in the panel.
//
// Only Conan Exiles and Minecraft are checked against the real games so far.

export const MOD_TEMPLATES = {
	"minecraft-modpack": {
		adapter: "folder",
		label: "Mods",
		dir: { base: "working", rel: "mods" },
		accepts: [".jar"],
		note: "Drop mod .jar files here. They must match the modpack's Minecraft and loader version.",
	},
	"7days": {
		adapter: "folder",
		label: "Mods",
		dir: { base: "working", rel: "Mods" },
		accepts: ["archive"],
		note: "Each mod is a folder (with a ModInfo.xml) inside the Mods folder. Upload a mod's .zip.",
	},
	palworld: {
		adapter: "folder",
		label: "Mods",
		dir: { base: "working", rel: "Pal/Content/Paks/~mods" },
		accepts: [".pak"],
		note: "Pak mods go in the ~mods folder.",
	},
	conan: {
		adapter: "workshop",
		label: "Mods",
		appId: "440900",
		dir: { base: "working", rel: "ConanSandbox/Mods" },
		accepts: [".pak"],
		note: "Add a Steam Workshop item by its number, or upload a .pak. The panel keeps modlist.txt for you.",
	},
	valheim: {
		adapter: "thunderstore",
		label: "Mods (BepInEx)",
		dir: { base: "working", rel: "BepInEx/plugins" },
		accepts: [".dll", "archive"],
		community: "valheim",
		framework: { owner: "denikson", name: "BepInExPack_Valheim" },
		note: "Adds BepInEx if it isn't there, then installs mods from Thunderstore by name (Owner-Name).",
	},
	"ark-ase": { adapter: "script-ids", label: "Mods", flag: "GameModIds", note: "Steam Workshop mod numbers, in the order they load." },
	"ark-asa": { adapter: "script-ids", label: "Mods", flag: "-mods=", note: "CurseForge mod numbers, in the order they load." },
};

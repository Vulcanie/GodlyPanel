// Where each game keeps what is worth backing up: its world, saves and settings.
//
// `base` says what `rel` is relative to: the server's working folder, its install
// folder, or (for "abs") nothing, in which case `rel` is a full path that may use
// %ENVIRONMENT% variables. Folders that don't exist are skipped, so a list can be
// generous. `exclude` names things inside a folder that aren't worth keeping
// (logs, crash dumps) or can't be copied while the game runs.
//
// A `base: "flag"` entry follows the start script: the game is told where to keep its
// saves (`-savedir`, `-UserDataFolder=`), and the backup looks there, then inside `join`.
// Without the flag the game uses a folder in the user's profile that every such server on
// the PC shares (`fallback`), and the spec is marked shared: it is backed up, but never
// restored over without an explicit go-ahead.
//
// A `base: "property"` entry names a folder after a setting in one of the game's own files (Minecraft's
// `level-name` in server.properties), with `default` when the file or the setting isn't there.
//
// Every game here has been through a real install's backup and restore (see docs/GAME_SUPPORT.md). A server can
// override its list in its own settings, which is also what the panel offers for a game it has no list for.

const LOGS = ["Logs", "Crashes"];
// Distant Horizons (a long-range-view mod) keeps a database of far-away terrain next to each dimension. It can be
// tens of gigabytes, is rebuilt by the mod, and is not part of the world, so a backup leaves it out. The leading *
// matters: the folders it sits in are nested, and tar only matches a nested file with a pattern that starts with *.
const DISTANT_HORIZONS = "*DistantHorizons*";

export const BACKUP_TEMPLATES = {
	conan: {
		paths: [{ base: "working", rel: "ConanSandbox/Saved", label: "Saved games and settings", exclude: LOGS }],
	},
	// Several ARK Ascended maps often share one install, each with its own save folder named in its launch line
	// (`?AltSaveDirectoryName=RagnarokSave`), so a server's backup is its own map's folder, not the whole Saved
	// folder (which would copy every map's world once per server). The settings and the cluster's transfer
	// folder (characters and items moved between maps) are shared and small.
	"ark-asa": {
		paths: [
			{ base: "option", option: "AltSaveDirectoryName", rel: "ShooterGame/Saved", fallbackRel: "ShooterGame/Saved/SavedArks", label: "This map's saved world" },
			{ base: "working", rel: "ShooterGame/Saved/Config/WindowsServer", label: "Server settings" },
			{ base: "working", rel: "ClusterStorage", label: "Cluster transfers" },
		],
	},
	"ark-ase": {
		paths: [{ base: "working", rel: "../../Saved", label: "Saved worlds and settings", exclude: LOGS }],
	},
	valheim: {
		// Where Valheim keeps worlds unless the start script sets -savedir. Every
		// Valheim server on this PC shares it, so a backup covers all of their worlds.
		paths: [{ base: "flag", flag: "-savedir", join: "", fallback: "%USERPROFILE%/AppData/LocalLow/IronGate/Valheim", label: "Worlds and player data" }],
	},
	enshrouded: {
		paths: [
			{ base: "working", rel: "savegame", label: "Saved world" },
			{ base: "working", rel: "enshrouded_server.json", label: "Server settings" },
		],
	},
	dragonwilds: {
		paths: [{ base: "working", rel: "RSDragonwilds/Saved", label: "Saved worlds and settings", exclude: LOGS }],
	},
	windrose: {
		paths: [
			{ base: "working", rel: "R5/Saved", label: "Saved worlds", exclude: LOGS },
			{ base: "working", rel: "R5/ServerDescription.json", label: "Server settings" },
		],
	},
	// Seen on a real, running server: the world and players are in UDKGame/SaveData and the settings in
	// UDKGame/Config, in the game's root folder. A server the panel created runs from Binaries/Win64
	// (two levels down); one that was imported usually runs from the root itself. Whichever exists is used.
	subsistence: {
		paths: [
			{ base: "working", rel: "UDKGame/SaveData", label: "Saved world and players" },
			{ base: "working", rel: "../../UDKGame/SaveData", label: "Saved world and players" },
			{ base: "working", rel: "UDKGame/Config", label: "Server settings" },
			{ base: "working", rel: "../../UDKGame/Config", label: "Server settings" },
		],
	},
	// Rust keeps everything for a server (world saves, settings, player data) in server<identity>.
	rust: { paths: [{ base: "working", rel: "server", label: "World, settings and player data" }] },
	// Saves and settings are inside the server folder (checked on a real install, not in the user profile).
	satisfactory: {
		paths: [
			{ base: "working", rel: "FactoryGame/Saved/SaveGames", label: "Saved factories" },
			{ base: "working", rel: "FactoryGame/Saved/Config/WindowsServer", label: "Server settings" },
		],
	},
	// Settings and saves are in the userdata folder beside the game (-userdatapath).
	sotf: { paths: [{ base: "working", rel: "userdata", label: "World and settings", exclude: ["Logs"] }] },
	// Worlds are in the data folder beside the game (-datapath in the start script).
	corekeeper: { paths: [{ base: "working", rel: "data", label: "Worlds" }] },
	// The world and the settings are in save-data beside the game.
	vrising: { paths: [{ base: "working", rel: "save-data", label: "World and settings" }] },
	// Everything for the server is in the zomboid folder beside the game: its world (Saves), its
	// settings (Server) and its player accounts (db).
	zomboid: {
		paths: [
			{ base: "working", rel: "zomboid/Saves", label: "World" },
			{ base: "working", rel: "zomboid/Server", label: "Server settings" },
			{ base: "working", rel: "zomboid/db", label: "Player accounts" },
		],
	},
	"7days": {
		paths: [
			{ base: "flag", flag: "-UserDataFolder=", join: "Saves", fallback: "%APPDATA%/7DaysToDie/Saves", label: "Saved worlds" },
			{ base: "flag", flag: "-UserDataFolder=", join: "GeneratedWorlds", fallback: "%APPDATA%/7DaysToDie/GeneratedWorlds", label: "Generated maps" },
			{ base: "working", rel: "serverconfig.xml", label: "Server settings" },
		],
	},
	palworld: {
		paths: [{ base: "working", rel: "Pal/Saved", label: "Saved worlds and settings", exclude: LOGS }],
	},
	"minecraft-modpack": {
		paths: [
			// Named by level-name. Plain Minecraft keeps the Nether and End inside the world folder; servers that
			// split them out (Bukkit and its relatives) have <name>_nether and <name>_the_end beside it.
			{ base: "property", file: "server.properties", key: "level-name", default: "world", label: "World", exclude: ["session.lock", DISTANT_HORIZONS] },
			{ base: "property", file: "server.properties", key: "level-name", default: "world", suffix: "_nether", label: "Nether", exclude: ["session.lock", DISTANT_HORIZONS] },
			{ base: "property", file: "server.properties", key: "level-name", default: "world", suffix: "_the_end", label: "The End", exclude: ["session.lock", DISTANT_HORIZONS] },
			{ base: "working", rel: "config", label: "Mod settings" },
			{ base: "working", rel: "defaultconfigs", label: "Default mod settings" },
			{ base: "working", rel: "server.properties", label: "Server settings" },
			{ base: "working", rel: "ops.json", label: "Operators" },
			{ base: "working", rel: "whitelist.json", label: "Whitelist" },
			{ base: "working", rel: "banned-players.json", label: "Bans" },
			{ base: "working", rel: "banned-ips.json", label: "IP bans" },
		],
	},
};

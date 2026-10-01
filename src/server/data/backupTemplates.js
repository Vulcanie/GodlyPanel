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
// Only Conan Exiles has been checked against a real install so far. The rest are
// the documented locations; a server can override its list in its own settings,
// which is what the panel offers for any game it has no list for (`paths: []`).

const LOGS = ["Logs", "Crashes"];

export const BACKUP_TEMPLATES = {
	conan: {
		paths: [{ base: "working", rel: "ConanSandbox/Saved", label: "Saved games and settings", exclude: LOGS }],
	},
	"ark-asa": {
		paths: [{ base: "working", rel: "ShooterGame/Saved", label: "Saved worlds and settings", exclude: LOGS }],
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
	// No documented save location has been confirmed, so nothing is guessed: the
	// panel asks for the folders instead.
	subsistence: { paths: [] },
	// Rust keeps everything for a server (world saves, settings, player data) in server<identity>.
	rust: { paths: [{ base: "working", rel: "server", label: "World, settings and player data" }] },
	// Saves and settings are inside the server folder (checked on a real install, not in the user profile).
	satisfactory: {
		paths: [
			{ base: "working", rel: "FactoryGame/Saved/SaveGames", label: "Saved factories" },
			{ base: "working", rel: "FactoryGame/Saved/Config/WindowsServer", label: "Server settings" },
		],
	},
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
			{ base: "working", rel: "world", label: "World", exclude: ["session.lock"] },
			{ base: "working", rel: "world_nether", label: "Nether", exclude: ["session.lock"] },
			{ base: "working", rel: "world_the_end", label: "The End", exclude: ["session.lock"] },
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

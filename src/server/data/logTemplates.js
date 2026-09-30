// Where each game writes its own log. A `dir` entry is a folder of logs (the newest
// few are offered); a `file` entry is one file. Folders that don't exist are
// skipped. `base` and `rel` work as in backupTemplates.js.
//
// Only Conan Exiles has been checked against a real install; the rest are the
// documented locations. Games that only print to their console have no entry, and
// for any server started with no window the panel also keeps what it printed.

export const LOG_TEMPLATES = {
	conan: [{ kind: "dir", base: "working", rel: "ConanSandbox/Saved/Logs", label: "Game log" }],
	"ark-asa": [{ kind: "dir", base: "working", rel: "ShooterGame/Saved/Logs", label: "Game log" }],
	"ark-ase": [{ kind: "dir", base: "working", rel: "../../Saved/Logs", label: "Game log" }],
	enshrouded: [{ kind: "dir", base: "working", rel: "logs", label: "Server log" }],
	dragonwilds: [{ kind: "dir", base: "working", rel: "RSDragonwilds/Saved/Logs", label: "Game log" }],
	windrose: [{ kind: "dir", base: "working", rel: "R5/Saved/Logs", label: "Game log" }],
	"7days": [{ kind: "file", base: "working", rel: "output_log.txt", label: "Server log" }],
	palworld: [{ kind: "dir", base: "working", rel: "Pal/Saved/Logs", label: "Game log" }],
	"minecraft-modpack": [
		{ kind: "file", base: "working", rel: "logs/latest.log", label: "Server log" },
		{ kind: "dir", base: "working", rel: "crash-reports", label: "Crash reports" },
	],
};

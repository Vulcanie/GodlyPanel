// The permission names, kept in a file of their own with no imports. permissions.js needs the role store, and the role store
// needs these names, so putting them in either one would make the two import each other.

// Every permission a role can hold. The first 11 keep the names they have always had, because saved settings and the UI refer to them.
export const PERMISSIONS = [
	"server.control", // start, stop, restart
	"server.console", // send RCON commands
	"server.update", // run a game update
	"server.backup", // list and take backups
	"server.logs",
	"server.players",
	"players.kick", // remove someone from a running server
	"players.ban", // ban, unban and edit whitelists and admin lists
	"activity.view",
	"schedules.view",
	"metrics.view",
	"files.view", // browse and read files in a server's folder
	"files.edit", // change files in a server's folder
	"files.delete", // delete files in a server's folder
	"mods.manage", // install, update and remove mods
	"servers.migrate", // move a server to another folder or machine
	"roles.manage", // create, change and remove roles
];

// What a moderator could do before roles became data. The built-in moderator role gets exactly these, so existing moderators
// keep their access and nothing new is handed out by accident.
export const MODERATOR_PERMISSIONS = [
	"server.control",
	"server.console",
	"server.update",
	"server.backup",
	"server.logs",
	"server.players",
	"players.kick",
	"players.ban",
	"activity.view",
	"schedules.view",
	"metrics.view",
];

// Groups for showing permissions together in the role editor. Each permission is in exactly one group.
export const PERMISSION_GROUPS = {
	control: ["server.control", "server.console", "server.update"],
	backups: ["server.backup"],
	monitoring: ["server.logs", "server.players", "activity.view", "schedules.view", "metrics.view"],
	players: ["players.kick", "players.ban"],
	files: ["files.view", "files.edit", "files.delete"],
	mods: ["mods.manage"],
	admin: ["servers.migrate", "roles.manage"],
};

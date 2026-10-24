// Warfork. The research dossier (docs/research/games/warfork/) names no launch argument and no config key it could confirm. The one
// setting the panel writes, sv_hostname, is in basewf\server.cfg as a `set sv_hostname "..."` console command. No existing parser reads
// that form (the Rust convar parser reads `name value` lines), so no settings file is offered here: the Settings tab shows nothing,
// and the guide explains what the panel writes. Nothing is invented: a key or flag gets an entry only when a source names it.

const launch = null;

export default {
	type: "warfork",
	title: "Warfork",
	// No settings file: the one file the panel writes uses console `set` lines that no parser in the panel reads. See the top of this file.
	files: {},
	launch,
	guide: {
		name: "Warfork",
		short: "Warfork",
		summary:
			"Warfork's server is `wf_server_x64.exe`, started by the panel's start script. The panel passes the server name and the ports on the launch line. Every other setting is in the shipped `basewf\dedicated_autoexec.cfg`, which the panel does not show in the Settings tab.",
		files: {},
		notes: [
			"**The name and ports come from the launch line, not from a file.** The start script passes `+set sv_hostname`, `+set sv_port` and `+set sv_http_port`, which override the shipped file. Names with a quote, a semicolon or a backslash are refused, because the game reads them as console text. A `basewf\server.cfg` is not read by this server.",
			"**Other settings are edited by hand.** They are `set name \"value\"` console lines in `basewf\dedicated_autoexec.cfg` (the password, rcon password, most players, public listing, gametypes and votes). Edit it while the server is stopped; the game never rewrites it. Changing the name or a port there has no effect, since the launch line wins.",
			"**Ports:** the game port (44400 by default) is UDP and answers server queries. The port after it is a TCP port the server uses to send files to players. The panel moves both together, so keep the next port free.",
			"**Files stay in the install.** The panel adds `+set fs_usehomedir 0`; without it the game would keep its log, demos and configs in Documents\\My Games\\Warfork 2.1, shared by every server on the PC. The log is `basewf\wfconsole.log`.",
			"**Stop** closes the server cleanly on a real install; if it does not exit within 15 seconds the panel ends the program.",
		],
	},
};

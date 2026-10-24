// Assetto Corsa Competizione (dossier: docs/research/games/acc/, confidence low). The server's settings are JSON files (settings.json,
// configuration.json, event.json and the rest) saved as UTF-16 little-endian: the game ignores them in any other encoding. The panel
// reads and writes files as UTF-8 only, so this form has no settings file, and the start line has no arguments that the dossier names.

const guide = {
	name: "Assetto Corsa Competizione",
	short: "Assetto Corsa Competizione",
	summary:
		"The Assetto Corsa Competizione server is server\accServer.exe, started by the panel's start script with no arguments. Its settings are in the server's cfg folder as JSON files saved as UTF-16, which this panel cannot read or write, so you edit them by hand.",
	files: {
		"settings.json": "The server's name, passwords, car group, player slots and rating limits.",
		"configuration.json": "The network settings: the ports and whether the server is listed in the lobby.",
		"event.json": "The track, the weather and the session list.",
		"eventRules.json": "The race rules: pit stops, refuelling, and the qualifying standing.",
		"assistRules.json": "Which driving assists are allowed.",
		"entrylist.json": "The optional fixed entry list or reserved slots.",
	},
	notes: [
		"Save every file in the cfg folder as UTF-16 little-endian (Notepad's 'Unicode' option, or an editor that offers UTF-16 LE). The game ignores a file in any other encoding and regenerates its defaults. The panel cannot edit these files, because it reads and writes UTF-8.",
		"The game port is set in configuration.json, not in the panel. The panel's port (28110) is only used for its checks, so set the same number in configuration.json, and forward the port as UDP and TCP.",
		"The defaults for the settings, and whether the game makes these files on its first start, are not confirmed by an official source. The sources we read were community guides.",
		"The server is installed anonymously from Steam (tool app 1430110), but the sources do not confirm that an anonymous login works. If the install asks for an account, it cannot be done from this panel.",
		"The panel's Stop closes the server window, and the game's own clean stop is not documented. Back up the cfg folder before you stop or update.",
		"Mods are not supported by the sources we read, so the panel has no mod settings.",
	],
};

export default {
	type: "acc",
	title: "Assetto Corsa Competizione",
	files: {},
	launch: null,
	guide,
};

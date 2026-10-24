import { A } from "../launchHelpers.js";

// Stormworks: Build and Rescue. Its settings live in server_config.xml, which the server makes on its first run and the panel does not
// write. The format is XML with either attributes or child elements (the sources disagree), and the panel's `xml` parser only reads
// 7 Days to Die's one-line <property name value/> style, so no settings form is offered: the file is edited by hand.
// The one form the panel offers is the launch line: the only launch argument any source documents is +server_dir (the Pterodactyl egg's
// start command, which runs the server under Wine). The dossier (research/stormworks/03-launch-args.md) says nothing about what it does.
//
// Not in the form, on purpose: the server name, password, port, map and every other setting (all in server_config.xml).

export default {
	type: "stormworks",
	title: "Stormworks: Build and Rescue",
	// No settings file: the server writes server_config.xml itself and the panel does not read it.
	files: {},
	launch: {
		title: "Stormworks: Build and Rescue",
		// server.exe is the program the dossier names for a Windows install; the Pterodactyl egg runs server64.exe under Wine.
		program: /\bserver\.exe\b/i,
		style: "plus",
		editable: true,
		where: "the `server.exe` line of the server's start script",
		intro:
			"Stormworks is started with `server.exe` and at most one documented argument, `+server_dir`, which names the folder the server looks in. The panel writes it with the server's own folder. The dossier does not describe what the game does with it, so change it only if you know why. Changes apply the next time the server starts.",
		args: [
			A({
				flag: "+server_dir",
				label: "Server folder",
				group: "Folders",
				managed: true,
				example: "C:\\Servers\\stormworks",
				description:
					"The folder the server looks in for its files, such as server_config.xml. The panel sets it to the server's own folder when it creates the server. Its use with a native server.exe was not verified, so leave it as it is unless you know a reason to change it.",
			}),
		],
	},
	guide: {
		name: "Stormworks: Build and Rescue",
		short: "Stormworks",
		summary:
			"Stormworks' server is set up in server_config.xml, which the server makes the first time it runs in the server's folder. The panel does not change that file, so set the server's name, password and port there by hand. The launch line carries the server's folder and nothing else.",
		files: {
			"server_config.xml": "Every server setting: the name, password, port, players, world and rules. The server writes it the first time it runs; the panel does not edit it.",
		},
		notes: [
			"Set the port in server_config.xml to the same number as the server's Game Port in the panel. The server reads its port from that file, not from the start script. The panel keeps the port and the two above it free for the server.",
			"The server uses three consecutive UDP ports from its game port (one page says two). Forward and open all three on your router and firewall.",
			"Edit server_config.xml only while the server is stopped: the server can overwrite it when it saves or shuts down. Keep a copy before you change it, since a syntax error makes the server reset its settings to the defaults.",
			"The panel cannot save or stop the server cleanly. Stop closes the server's window and, after 15 seconds, ends the program, so progress since the last save can be lost. Stormworks has no documented console command for saving or quitting.",
			"The server can be made to show a password and admins through server_config.xml (the admin list takes Steam64 ids). Those are set by hand too.",
			"Playlists and mods are added in server_config.xml as file paths, and the sources disagree on the attribute name (path or value). Mods are not managed by the panel.",
		],
	},
};

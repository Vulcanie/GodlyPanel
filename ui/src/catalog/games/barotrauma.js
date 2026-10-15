import { A, FLAG } from "../launchHelpers.js";

// Barotrauma. The server keeps its settings in serversettings.xml, next to DedicatedServer.exe. Every setting of that file is an
// ATTRIBUTE of one <serversettings> element (<serversettings ServerName="..." MaxPlayers="10" ...>), not a <property name= value=>
// child, and no reader the panel has handles that shape. The research dossier did not find a minimal file that was checked on a real
// install either, so the panel neither writes the file nor offers it in the Settings tab: the server makes it itself the first time it
// starts. What the Settings tab offers is the launch line, which the server reads first and which overrides the file.
//
// The launch arguments are the ones the server's own start-up code reads (GameMain.StartServer in the public source). Left out because
// they are not for a dedicated server: -ownerkey and -endpoint (used when the game hosts a server for its own player; -ownerkey also stops
// the server from signing in to Steam as a dedicated server), -pipes (links a child server to the game that started it),
// -lenienthandshake (the sources do not say what it is for) and -multiclienttestmode (developer testing). There is no -steamid, -pause,
// -savepath or -config in the source, so the save folder and config files cannot be moved by an argument.

const launch = {
	title: "Barotrauma",
	program: /\bDedicatedServer(?:\.exe)?"?/i,
	style: "space",
	editable: true,
	where: "the `DedicatedServer.exe` line of the server's start script",
	intro:
		"Barotrauma's server name, ports, player limit and password are given on the command that starts it, and they override the same settings in `serversettings.xml`. The rest of its options are in that file, which the server writes itself and the Settings tab cannot edit. Changes apply the next time the server starts.",
	args: [
		A({
			flag: "-name",
			label: "Server name",
			group: "Server",
			managed: true,
			example: '"My Sub Crew"',
			description: "The name shown in the server list and the lobby. The game cuts a name longer than 60 characters. It overrides the name in serversettings.xml.",
		}),
		A({
			flag: "-port",
			label: "Game port",
			group: "Network",
			managed: true,
			example: "27215",
			description: "The UDP port players connect to. The game's own default is 27015. Change it from the server's Ports section so the panel can check for clashes and open the firewall.",
		}),
		A({
			flag: "-queryport",
			label: "Query port",
			group: "Network",
			managed: true,
			example: "27217",
			description:
				"The UDP port Steam's server list asks for the server's details on. The game's own default is 27016. The server only opens it while it is listed publicly. Change it from the server's Ports section so the panel can check for clashes.",
		}),
		A({
			flag: "-public",
			label: "Listed publicly",
			group: "Server",
			managed: true,
			example: "False",
			options: [["True", "Listed in the public server list"], ["False", "Not listed (players join by IP address)"]],
			description: "Whether the server appears in the in-game server list. The panel starts a new server as not listed. Without this argument the server uses the setting in serversettings.xml.",
		}),
		A({
			flag: "-maxplayers",
			label: "Max players",
			group: "Server",
			managed: true,
			example: "10",
			description: "The number of player slots. The game allows 1 to 16 and uses a limit of 10 when nothing else says otherwise.",
		}),
		A({
			flag: "-password",
			label: "Join password",
			group: "Server",
			managed: true,
			example: '"secret"',
			description:
				"What players type to join. It overrides the password in serversettings.xml. It is written on this line, so anyone who can open the start script or see the server's process list can read it. To remove the password, clear this and add the 'No password' switch.",
		}),
		FLAG({
			flag: "-nopassword",
			label: "No password",
			edit: false,
			managed: true,
			group: "Server",
			description:
				"Clears the join password, even one saved in serversettings.xml. The panel puts it on the line when the server has no password. When both this and -password are on the line, the one that comes last wins.",
		}),
		A({
			flag: "-upnp",
			label: "Open the ports automatically (UPnP)",
			group: "Network",
			example: "True",
			options: [["True", "Ask the router to open the ports"], ["False", "Do not"]],
			description: "Asks the router to forward the server's ports by itself. The official wiki warns that this does not work on every router, so forward the ports by hand if players cannot connect.",
		}),
		A({
			flag: "-enableupnp",
			label: "Open the ports automatically (UPnP), long spelling",
			edit: false,
			group: "Network",
			example: "True",
			options: [["True", "Ask the router to open the ports"], ["False", "Do not"]],
			description: "The same as -upnp: the game reads both spellings with the same code. Use -upnp in the form.",
		}),
		A({
			flag: "-playstyle",
			label: "Play style label",
			group: "Server",
			example: "Casual",
			options: [["Serious", "Serious"], ["Casual", "Casual"], ["Roleplay", "Roleplay"], ["Rampage", "Rampage"], ["SomethingDifferent", "Something different"]],
			description: "The label shown in the server list so players know what to expect. The names are the game's own, and a value it does not know falls back to Serious.",
		}),
		A({
			flag: "-banafterwrongpassword",
			label: "Ban after wrong password",
			group: "Access",
			example: "True",
			options: [["True", "Ban a player who gets the password wrong too many times"], ["False", "Never ban for wrong passwords"]],
			description: "Whether a player who types the wrong password too many times is banned. The number of tries is the MaxPasswordRetriesBeforeBan setting in serversettings.xml (3 in the game's code). Always give a value after it.",
		}),
		A({
			flag: "-karma",
			label: "Karma system",
			group: "Access",
			example: "True",
			options: [["True", "On"], ["False", "Off"]],
			description: "Turns the karma system on: players who grief lose karma and can be kicked or banned automatically. Off in the game's own defaults.",
		}),
		A({
			flag: "-karmaenabled",
			label: "Karma system, long spelling",
			edit: false,
			group: "Access",
			example: "True",
			options: [["True", "On"], ["False", "Off"]],
			description: "The same as -karma; this is the spelling the game's own Host Server menu uses. Use -karma in the form.",
		}),
		A({
			flag: "-karmapreset",
			label: "Karma preset",
			group: "Access",
			example: "default",
			options: [["default", "Default"], ["strict", "Strict"], ["custom", "Custom"]],
			description: "Which set of karma rules is used. They come from the game's Data\\karmasettings.xml, which has these three presets. It only matters when karma is turned on.",
		}),
		A({
			flag: "-language",
			label: "Server language",
			group: "Server",
			example: "English",
			allowCustom: true,
			options: [
				"Brazilian Portuguese", "Chinese", "Czech", "Danish", "Dutch", "English", "Finnish", "French", "German", "Italian",
				"Japanese", "Korean", "Norwegian", "Polish", "European Portuguese", "Russian", "Spanish", "Swedish", "Turkish", "Ukrainian",
			],
			description: "The language shown for the server in the server list. It is only used when it matches a name in the game's Data\\languageoptions.xml; anything else is ignored.",
		}),
	],
};

export default {
	type: "barotrauma",
	title: "Barotrauma",
	// No settings file: see the top of this file.
	files: {},
	launch,
	guide: {
		name: "Barotrauma",
		short: "Barotrauma",
		summary:
			"Barotrauma's server keeps its settings in `serversettings.xml` in the server's install folder, next to `DedicatedServer.exe`. The server's name, ports, player limit, password and whether it is listed publicly are given on the command that starts it, and those are the **Launch options** on the Settings tab.",
		files: {},
		notes: [
			"**The panel does not write or edit `serversettings.xml`.** The server makes it the first time it starts. Every setting in it is an attribute of one `<serversettings>` element, which the Settings tab has no editor for, so open it in a text editor with the server stopped. The server writes the file again whenever an admin changes a setting in the game and when it shuts down, so a change made while it runs is lost. The server also drops any attribute it does not know when it writes the file.",
			"**The panel cannot stop the server cleanly.** The server only takes its `exit`, `quit` or `close` command typed into its own console window, and it ignores input from other programs. Stop closes the window and then ends the process. A campaign is saved when it is created and at the end of every round, so stopping in the middle of a round loses that round. Stop between rounds, or type `exit` in the server's window yourself. What a closed window does to the settings file is not known.",
			"**Saves are not in the server's folder.** Campaign saves are in `%LocalAppData%\\Daedalic Entertainment GmbH\\Barotrauma\\Multiplayer` of the Windows user that runs the panel, shared with every other Barotrauma server on this PC and with the game itself. The panel's default backup keeps only the files in the server's folder (the settings, the player permissions, the ban list and the mods you added). To keep the saves too, set the server's backup folders yourself and include that folder.",
			"A server that is not listed publicly has no query port open, so the panel can only tell that it is running, not how many players are on. Players join a server that is not listed by its IP address and game port.",
			"Players and server must run the same game version. Update the server (the Update button) after the game updates.",
			"Mods are Steam Workshop packages. The server downloads nothing by itself: copy each mod's folder (the one with a `filelist.xml` in it) into a `LocalMods` folder in the server's install folder, and list it in `config_player.xml` as `<package path=\"LocalMods/<folder>/filelist.xml\" />` under `<regularpackages>`, in load order (a mod's required mods first), with the server stopped. Players need the same mods; with `AllowModDownloads` on (its default) they can fetch them from the server.",
			"The player and admin permissions are in `Data\\clientpermissions.xml`, also edited by hand with the server stopped.",
		],
	},
};

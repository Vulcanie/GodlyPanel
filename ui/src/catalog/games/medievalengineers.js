// Medieval Engineers. The server's settings are in MedievalEngineers-Dedicated.cfg (XML, child elements such as <ServerName>...</ServerName>).
// The Settings tab has no reader for that shape (its XML reader handles <property name= value=> lines), and the dossier gives no
// argument syntax for the start line (console, path are bare words), so neither a settings file nor a launch form is offered. The
// panel writes the first config file when it creates the server (src/server/data/games/medievalengineers.js); the guide explains it.

const launch = null;

export default {
	type: "medievalengineers",
	title: "Medieval Engineers",
	// No settings file: see the top of this file.
	files: {},
	launch,
	guide: {
		name: "Medieval Engineers",
		short: "Medieval Engineers",
		summary:
			"Medieval Engineers' server is `DedicatedServer64\\MedievalEngineersDedicated.exe`, started by the panel's start script in console mode. The panel writes its first config file, `Data\\MedievalEngineers-Dedicated.cfg`, with the server name, the world name and the port. The game's other settings are not offered in this panel: edit the file by hand while the server is stopped.",
		files: {},
		notes: [
			"**What the panel set up.** The config file names the server and the world after the name you typed, uses 0.0.0.0 for the address and the game port you chose (UDP), and switches the remote web API off. It also names a scenario from the game's sample (`SafeAreaStart`). The data folder is `Data` in the server's folder; the game is told to keep its config and saves there.",
			"**Checked on a real install.** The start line is `-console -path` (with dashes; the bare words the official page lists leave a process that never starts the game). The server starts, creates its world in `Data\Saves`, lists under its name and answers status queries on the game port. The log is `Data\MedievalEngineersDedicated.log`, shown in the Logs tab.",
			"**Stop.** The panel closes the server's window and, if it does not exit within 15 seconds, ends it. The official guide says a normal `taskkill` saves the world and `taskkill /F` does not, so the panel's close request is probably the safe kind; the save was not checked.",
			"**Mods are not set by the panel.** The sources disagree on where mods go (a Mods list in the config file, `<Mods>` in the world's `sandbox.sbc`, or the server's settings page). Add mods by hand only after a backup, and test one at a time.",
			"**Admins and bans** are in the config file under the names the game documents (Administrators as Steam IDs, one per line). Edit them with the server stopped.",
		],
	},
};

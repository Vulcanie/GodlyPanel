const electron = require("electron");
const path = require("node:path");

const { BrowserWindow, shell } = electron;

const here = __dirname;

function createMainWindow({ port }) {
	const win = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 900,
		minHeight: 600,
		backgroundColor: "#121212",
		show: false,
		title: "GodlyPanel",
		icon: path.join(here, "..", "tray.png"),
		webPreferences: {
			preload: path.join(here, "..", "preload.cjs"),
			// The renderer loads over HTTP and displays text written by game
			// servers into their own config files, so it gets no Node access.
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			webSecurity: true,
		},
	});

	const appOrigin = `http://127.0.0.1:${port}`;

	// Anything that isn't our own UI opens in the real browser instead of
	// inside a window that would otherwise have app privileges.
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:\/\//i.test(url)) shell.openExternal(url);
		return { action: "deny" };
	});

	win.webContents.on("will-navigate", (event, url) => {
		if (!url.startsWith(appOrigin)) {
			event.preventDefault();
			if (/^https?:\/\//i.test(url)) shell.openExternal(url);
		}
	});

	win.once("ready-to-show", () => win.show());
	return win;
}

module.exports = { createMainWindow };

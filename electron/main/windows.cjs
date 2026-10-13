const electron = require("electron");
const path = require("node:path");

const { isOurOrigin, externalLink } = require("./urlRules.cjs");

const { BrowserWindow, shell, app } = electron;

const here = __dirname;

/** Only ordinary web links are ever handed to the operating system. */
function openInBrowser(url) {
	const link = externalLink(url);
	if (link) shell.openExternal(link);
}

// The panel needs no camera, microphone, location or the like, so none is ever granted, whatever a
// page asks for. (Copying text to the clipboard from a button press needs no permission.)
function denyPermissions(session) {
	session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
	session.setPermissionCheckHandler(() => false);
}

let hardened = false;

/**
 * Rules for every window and embedded page the app ever creates, set once: no <webview> tags, and no
 * navigation away from the panel's own address (a link to anywhere else opens in the real browser).
 */
function hardenAllContents() {
	if (hardened) return;
	hardened = true;
	app.on("web-contents-created", (_event, contents) => {
		contents.on("will-attach-webview", (event) => event.preventDefault());
	});
}

/**
 * @param {{ port: number, getPort?: () => number }} options  `getPort` is asked each time, because the panel's port can be changed
 *   in Settings while the window is open; the window then follows it, and must not treat its own new address as a foreign site.
 */
function createMainWindow({ port, getPort = () => port }) {
	hardenAllContents();
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
			allowRunningInsecureContent: false,
			webviewTag: false,
			// The dev tools are for development (GP_DEVTOOLS=1 turns them on in a packaged app, for support).
			devTools: !app.isPackaged || process.env.GP_DEVTOOLS === "1",
		},
	});

	const appOrigin = () => `http://127.0.0.1:${getPort()}`;
	denyPermissions(win.webContents.session);

	// Anything that isn't our own UI opens in the real browser instead of
	// inside a window that would otherwise have app privileges.
	win.webContents.setWindowOpenHandler(({ url }) => {
		openInBrowser(url);
		return { action: "deny" };
	});

	const keepInside = (event, url) => {
		if (isOurOrigin(url, appOrigin())) return;
		event.preventDefault();
		openInBrowser(url);
	};
	win.webContents.on("will-navigate", keepInside);
	win.webContents.on("will-redirect", keepInside);

	win.once("ready-to-show", () => win.show());
	return win;
}

module.exports = { createMainWindow };

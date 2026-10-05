const { app, dialog, ipcMain, shell, BrowserWindow, Menu, Notification } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { ApiSupervisor } = require("./apiSupervisor.cjs");
const { resolveDataDir, resolveResourceRoot } = require("./paths.cjs");
const { createMainWindow } = require("./windows.cjs");
const { createTray } = require("./tray.cjs");
const { launchUpdate } = require("./updater.cjs");

const DEFAULT_PORT = 8765;

// The port is a setting (Settings -> Access), but the window has to know it
// before the API is up, so read it from the config file directly. It used to be
// a hardcoded constant here, which made changing the setting quietly do nothing.
function readConfiguredPort(dir) {
	try {
		const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
		const port = Number(config?.http?.port);
		return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : DEFAULT_PORT;
	} catch {
		return DEFAULT_PORT;
	}
}

const { dataDir, portable, fellBack } = resolveDataDir();
const resourceRoot = resolveResourceRoot();

// Must happen before whenReady() so Electron's own caches land in our data dir
// rather than the default %APPDATA% location when running portable.
fs.mkdirSync(dataDir, { recursive: true });
app.setPath("userData", path.join(dataDir, "electron"));

// Two copies pointed at the same data dir would double every poller, fight over
// the HTTP port, and both write servers.js. Keyed on the data dir so running a
// second instance with --data-dir=... for testing is still allowed.
const gotLock = app.requestSingleInstanceLock({ dataDir });
if (!gotLock) {
	app.quit();
	process.exit(0);
}

// Launched by Windows at sign-in with --hidden: live in the tray, no window.
const startHidden = process.argv.includes("--hidden");

let port = readConfiguredPort(dataDir);
let mainWindow = null;
let trayRef = null;
let quitting = false;

// No env bridge any more: the API owns its own config and secrets files in
// the data dir, and migrates any leftover .env from Stage 1 on first boot.
const supervisor = new ApiSupervisor({
	serverEntry: path.join(app.getAppPath(), "src", "server", "index.js"),
	dataDir,
	resourceRoot,
	getPort: () => readConfiguredPort(dataDir),
	env: {
		GHP_APP_VERSION: app.getVersion(),
		// What lets the panel offer "Update now": only the packaged app, which knows where it is installed.
		GHP_SELF_UPDATE: app.isPackaged ? "1" : "",
		GHP_APP_DIR: path.dirname(process.execPath),
		GHP_APP_EXE: process.execPath,
	},
});

function showWindow() {
	if (mainWindow && !mainWindow.isDestroyed()) {
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.show();
		mainWindow.focus();
		return;
	}
	mainWindow = createMainWindow({ port });
	mainWindow.loadURL(`http://127.0.0.1:${port}/`);
	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

supervisor.on("state", (state, detail) => {
	trayRef?.rebuild();
	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send("api:state", state, detail ?? null);
	}
	if (state === "crashed") {
		dialog
			.showMessageBox({
				type: "error",
				title: "GodlyPanel — API stopped",
				message: detail?.reason ?? "The API stopped unexpectedly.",
				detail: `Recent log output:\n\n${(detail?.logTail ?? "").slice(-2000)}`,
				buttons: ["Retry", "Open log folder", "Quit"],
				defaultId: 0,
			})
			.then(({ response }) => {
				if (response === 0) supervisor.restart();
				if (response === 1) shell.openPath(path.join(dataDir, "logs"));
				if (response === 2) {
					quitting = true;
					app.quit();
				}
			});
	}
});

// "Start when I sign in to Windows". The setting lives in the panel's config; the
// API tells us when it changes. Only a packaged build registers itself, so running
// from source never leaves a login entry pointing at a dev checkout.
function applyLoginItem({ openAtLogin, startHidden: hidden }) {
	if (!app.isPackaged) return;
	try {
		const passThrough = process.argv.filter((a) => a.startsWith("--data-dir="));
		app.setLoginItemSettings({
			openAtLogin: Boolean(openAtLogin),
			path: process.execPath,
			args: [...passThrough, ...(hidden ? ["--hidden"] : [])],
		});
	} catch (err) {
		console.warn("Could not change the start-with-Windows setting:", err.message);
	}
}

// A native toast for events that need attention. Clicking it opens the panel.
function showNotification({ title, body }) {
	if (!Notification.isSupported()) return;
	const toast = new Notification({ title: String(title ?? "GodlyPanel").slice(0, 100), body: String(body ?? "").slice(0, 400), silent: false });
	toast.on("click", showWindow);
	toast.show();
}

// "Update now": the API has downloaded and checked an update. Hand it to the update script and get out of its way.
async function handleApplyUpdate(request) {
	const refuse = (reason) => supervisor.sendToApi({ type: "update-refused", reason });
	try {
		const jobs = await supervisor.requestActiveJobs();
		if (jobs.length > 0) return refuse(`${jobs.map((j) => j.label ?? j.id).join(", ")} still running. Wait for it to finish, then update.`);
		await launchUpdate(request, { dataDir, resourceRoot, execPath: process.execPath, currentVersion: app.getVersion(), argv: process.argv, pid: process.pid });
	} catch (err) {
		return refuse(err.message);
	}
	quitting = true;
	await supervisor.stop();
	app.quit();
}

supervisor.on("ipc", (msg) => {
	if (msg?.type === "startup-settings") applyLoginItem(msg);
	if (msg?.type === "notify") showNotification(msg);
	if (msg?.type === "apply-update") handleApplyUpdate(msg);
});

supervisor.on("bind-error", ({ code }) => {
	const message =
		code === "EADDRINUSE"
			? `Port ${port} is already in use — another program (or a second copy of GodlyPanel) has it.`
			: `Could not start the web server (${code}).`;
	dialog.showErrorBox("GodlyPanel — cannot start", message);
});

app.on("second-instance", () => showWindow());

app.whenReady().then(() => {
	// Electron's stock File/Edit/View menu makes a shipped app look like a dev
	// shell. Keep it in development for the DevTools shortcuts.
	if (app.isPackaged) Menu.setApplicationMenu(null);

	supervisor.start();

	// Wait for the API to report ready before pointing the window at it, so the
	// first paint isn't a connection-refused error page. Also runs after a
	// restart: if the port changed, an open window follows it.
	let firstReady = true;
	supervisor.on("state", (state, detail) => {
		if (state !== "ready") return;
		const previous = port;
		port = detail?.port ?? port;
		if (firstReady) {
			firstReady = false;
			if (!startHidden) showWindow();
		} else if (port !== previous && mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.loadURL(`http://127.0.0.1:${port}/`);
		}
	});

	trayRef = createTray({
		onShow: showWindow,
		onRestartApi: () => supervisor.restart(),
		onQuit: () => {
			quitting = true;
			app.quit();
		},
		getState: () => supervisor.getState(),
	});

	if (fellBack) {
		dialog.showMessageBox({
			type: "info",
			title: "GodlyPanel — data location",
			message:
				"Could not write next to the application, so app data is stored in your user profile instead.",
			detail: dataDir,
		});
	}
});

// Closing the window keeps the panel running in the tray — the whole point is
// that monitoring and scheduled jobs continue.
app.on("window-all-closed", () => {});

app.on("before-quit", async (event) => {
	if (quitting) return;
	event.preventDefault();

	const jobs = await supervisor.requestActiveJobs();
	if (jobs.length > 0) {
		const { response } = await dialog.showMessageBox({
			type: "warning",
			title: "GodlyPanel — work in progress",
			message: `${jobs.length} job${jobs.length === 1 ? "" : "s"} still running.`,
			detail:
				`${jobs.map((j) => `• ${j.label ?? j.id}`).join("\n")}\n\n` +
				"Quitting now cancels the install and may leave a partly-downloaded server folder. " +
				"Already-running game servers are unaffected either way.",
			buttons: ["Keep running", "Cancel job and quit"],
			defaultId: 0,
			cancelId: 0,
		});
		if (response === 0) return;
	}

	quitting = true;
	await supervisor.stop();
	app.quit();
});

ipcMain.handle("app:info", () => ({
	version: app.getVersion(),
	dataDir,
	portable,
	port,
	apiState: supervisor.getState(),
}));
ipcMain.handle("app:openDataFolder", () => shell.openPath(dataDir));

// Native pickers, so choosing a folder or file never needs a browser or typing a path.
ipcMain.handle("app:pickFolder", async (event, { title, defaultPath } = {}) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	const result = await dialog.showOpenDialog(win, {
		title: typeof title === "string" ? title : "Choose a folder",
		defaultPath: typeof defaultPath === "string" && defaultPath ? defaultPath : undefined,
		properties: ["openDirectory", "createDirectory"],
	});
	return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle("app:pickFile", async (event, { title, filters } = {}) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	const result = await dialog.showOpenDialog(win, {
		title: typeof title === "string" ? title : "Choose a file",
		filters: Array.isArray(filters) ? filters : undefined,
		properties: ["openFile"],
	});
	return result.canceled ? null : result.filePaths[0];
});
// Opens a folder in Explorer. Only folders: asking to open a file would run it.
ipcMain.handle("app:openFolder", async (_event, target) => {
	try {
		if (typeof target !== "string" || !fs.statSync(target).isDirectory()) return "Not a folder.";
		return await shell.openPath(target);
	} catch {
		return "That folder doesn't exist.";
	}
});
ipcMain.handle("api:restart", () => supervisor.restart());
ipcMain.handle("api:state", () => supervisor.getState());

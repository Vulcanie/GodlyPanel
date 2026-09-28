const { app, dialog, ipcMain, shell, BrowserWindow, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { ApiSupervisor } = require("./apiSupervisor.cjs");
const { resolveDataDir, resolveResourceRoot } = require("./paths.cjs");
const { createMainWindow } = require("./windows.cjs");
const { createTray } = require("./tray.cjs");

const DEFAULT_PORT = 8765;

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

const port = DEFAULT_PORT;
let mainWindow = null;
let trayRef = null;
let quitting = false;

// Stage 1 bridge: the API still reads its secrets from env, so load
// <dataDir>/.env here and hand it to the child. Stage 2 replaces this with a
// real settings store and an in-app settings UI.
function loadEnvFile() {
	const envPath = path.join(dataDir, ".env");
	const extra = {};
	if (!fs.existsSync(envPath)) return extra;
	for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq === -1) continue;
		// Deliberately no shell-style expansion: values here are secrets that
		// legitimately contain $ (bcrypt hashes, API keys) and must stay literal.
		extra[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
	}
	return extra;
}

const supervisor = new ApiSupervisor({
	serverEntry: path.join(app.getAppPath(), "src", "server", "index.js"),
	dataDir,
	resourceRoot,
	port,
	env: loadEnvFile(),
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
	// first paint isn't a connection-refused error page.
	const openWhenReady = (state) => {
		if (state === "ready") {
			supervisor.off("state", openWhenReady);
			showWindow();
		}
	};
	supervisor.on("state", openWhenReady);

	trayRef = createTray({
		appPath: app.getAppPath(),
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
ipcMain.handle("api:restart", () => supervisor.restart());
ipcMain.handle("api:state", () => supervisor.getState());

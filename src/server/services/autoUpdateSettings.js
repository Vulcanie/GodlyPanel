import { promises as fs } from "fs";
import path from "path";
import { paths } from "../paths.js";

// The `autoUpdate` field in servers.js is just the starting default. This
// file holds the live, toggleable state so the dashboard's Auto-Update
// button can flip it instantly without restarting the API (servers.js is
// only read once, at process start, so writing back to it wouldn't take
// effect until a restart).
const STORE_PATH = paths.autoUpdateFile;

async function loadSettings() {
	try {
		return JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
	} catch {
		return {};
	}
}

async function saveSettings(settings) {
	await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
	await fs.writeFile(STORE_PATH, JSON.stringify(settings, null, 2));
}

// Falls back to the server's own `autoUpdate` default until it's been
// explicitly toggled at least once.
export async function isAutoUpdateEnabled(server) {
	const settings = await loadSettings();
	const stored = settings[server.name];
	return stored ?? Boolean(server.autoUpdate);
}

export async function setAutoUpdateEnabled(serverName, enabled) {
	const settings = await loadSettings();
	settings[serverName] = enabled;
	await saveSettings(settings);
}

/** Forget a removed server's stored toggle, so a new server of the same name starts clean. */
export async function forgetAutoUpdateSetting(serverName) {
	const settings = await loadSettings();
	if (!(serverName in settings)) return;
	delete settings[serverName];
	await saveSettings(settings);
}

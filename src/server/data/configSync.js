// Servers that share one install (the ARK: Survival Ascended maps) share the one folder the game reads its settings from. A
// server given `configSync` keeps its own copy of those files in `dir`, and services/perServerConfig.js puts them in `live`
// (the shared path, per file name) just before it starts.
const ASA_SETTINGS = "ShooterGame\\Saved\\Config\\WindowsServer";
const ASA_FILES = ["GameUserSettings.ini", "Game.ini"];
export const CONFIG_FOLDER = "GodlyPanelConfigs";

/** The settings entry for one ASA map: its own folder under the install, the shared files the game reads, and config paths into its folder. */
export function asaConfigSync(installDir, slug) {
	const root = String(installDir).replace(/[\\/]+$/, "");
	const dir = `${root}\\${CONFIG_FOLDER}\\${slug}`;
	const live = {};
	const configPaths = {};
	for (const name of ASA_FILES) {
		live[name] = `${root}\\${ASA_SETTINGS}\\${name}`;
		configPaths[name] = `${dir}\\${name}`;
	}
	return { configSync: { dir, live }, configPaths };
}

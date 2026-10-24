// A Steam beta branch name (a game can ship its server on one, e.g. The Isle on "evrima"). Anything that is not a plain name is ignored.
export const steamBranchArgs = (branch) => (/^[A-Za-z0-9._-]{1,40}$/.test(String(branch ?? "")) ? ["-beta", String(branch)] : []);

// A game whose SteamCMD app holds several mods (Half-Life Dedicated Server) needs `+app_set_config <app> mod <name>` before the download,
// or only the base game is fetched. Anything that is not a plain name or app id is ignored.
export const steamModArgs = (appId, mod) =>
	/^\d{1,10}$/.test(String(appId ?? "")) && /^[A-Za-z0-9._-]{1,40}$/.test(String(mod ?? ""))
		? ["+app_set_config", String(appId), "mod", String(mod)]
		: [];

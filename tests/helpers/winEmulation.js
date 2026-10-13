import path from "node:path";

// The panel manages Windows programs through Windows tools (tasklist, taskkill, PowerShell, cmd,
// tar.exe). On any other system this puts small stand-ins for them (./winshim) ahead of everything
// else on the PATH, for the test process and so for every panel it starts, so the same tests can run
// on a Linux CI machine. On Windows it does nothing: the real tools are used, and that is what the
// Windows job in CI checks.
//
// Importing this file is enough; helpers that start the panel or a stand-in game already do.

export const onWindows = process.platform === "win32";

const SHIM = path.join(import.meta.dirname, "winshim");

if (!onWindows && !process.env.GP_WINSHIM_ON) {
	process.env.GP_WINSHIM_ON = "1";
	// The wrappers start node by this path, so a PATH without node on it still works.
	process.env.GP_WINSHIM_NODE = process.execPath;
	process.env.PATH = `${path.join(SHIM, "bin")}${path.delimiter}${process.env.PATH ?? ""}`;
	// The panel starts "no window" servers through ComSpec and zips through SystemRoot\System32\tar.exe.
	process.env.ComSpec = path.join(SHIM, "bin", "cmd");
	process.env.SystemRoot = path.join(SHIM, "SystemRoot");
}

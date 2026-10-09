// CommonJS on purpose: Electron's main-process `electron` module is a native
// CJS binding that does not interop cleanly with ESM (named imports fail and
// the default export comes through empty). The root package is "type":
// "module", so the Electron layer uses explicit .cjs extensions. This costs
// nothing — the API server is launched as a forked child by file path, so
// there is no import relationship between this layer and the ESM server code.
const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

/**
 * Where the bundled, non-asar resources live (PowerShell scripts, launcher
 * templates). Decided once, here, because this is the only place where
 * `app.isPackaged` is meaningful — the forked API child is told the answer.
 */
function resolveResourceRoot() {
	return app.isPackaged
		? process.resourcesPath
		: path.join(app.getAppPath(), "resources");
}

function argValue(name) {
	const prefix = `--${name}=`;
	const hit = process.argv.find((a) => a.startsWith(prefix));
	return hit ? hit.slice(prefix.length) : null;
}

function isWritable(dir) {
	try {
		fs.mkdirSync(dir, { recursive: true });
		const probe = path.join(dir, ".write-probe");
		fs.writeFileSync(probe, "");
		fs.rmSync(probe);
		return true;
	} catch {
		return false;
	}
}

/**
 * Resolve the data directory, preferring a portable layout beside the .exe.
 *
 * A zip the user unpacks anywhere should keep its data with it — that's what
 * "portable" implies — so a `data/` folder next to the executable wins. We ship
 * `data/portable.txt` in the zip so that folder exists on a first run. If it
 * isn't writable (unzipped into Program Files, say), fall back to %APPDATA%
 * rather than failing to boot.
 *
 * @returns {{ dataDir: string, portable: boolean, fellBack: boolean }}
 */
function resolveDataDir() {
	const fromFlag = argValue("data-dir");
	if (fromFlag) {
		return { dataDir: path.resolve(fromFlag), portable: false, fellBack: false, explicit: true };
	}
	if (process.env.GHP_DATA_DIR) {
		return {
			dataDir: path.resolve(process.env.GHP_DATA_DIR),
			portable: false,
			fellBack: false,
			explicit: true,
		};
	}

	// In dev, process.execPath is electron.exe inside node_modules, so "beside
	// the exe" would be meaningless — use the repo's own data/ folder instead.
	const beside = app.isPackaged
		? path.join(path.dirname(process.execPath), "data")
		: path.join(app.getAppPath(), "data");
	const portableMarker = path.join(beside, "portable.txt");
	const wantsPortable = fs.existsSync(beside) || fs.existsSync(portableMarker);

	if (wantsPortable && isWritable(beside)) {
		return { dataDir: beside, portable: true, fellBack: false, explicit: false };
	}

	return {
		dataDir: path.join(app.getPath("appData"), "GodlyPanel"),
		portable: false,
		fellBack: wantsPortable,
		explicit: false,
	};
}

/**
 * Where secrets.json goes: a hidden folder beside the data folder (so beside the .exe in the portable layout), out of the way of
 * anything that copies or backs up `data`. Null leaves it in the data folder, as before. That is the case when the data folder was
 * chosen by hand (a flag or GHP_DATA_DIR: a test, a second copy, and "beside" it could be a shared temp folder), and when the
 * folder can't be made. An existing one is always used: once secrets have moved there, falling back would start over with new keys.
 * @param {string} dataDir
 * @param {boolean} explicit
 * @returns {string | null}
 */
function resolveSecretsDir(dataDir, explicit) {
	if (explicit) return null;
	const dir = path.join(path.dirname(dataDir), ".godlypanel-secrets");
	if (fs.existsSync(dir)) return dir;
	return isWritable(dir) ? dir : null;
}

module.exports = { resolveResourceRoot, resolveDataDir, resolveSecretsDir };

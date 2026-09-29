import path from "node:path";
import fs from "node:fs";

// Every writable path the server touches hangs off one root, handed down from
// the Electron main process as GHP_DATA_DIR. This replaces the nine
// `path.resolve("some/relative/literal")` calls the original API used, all of
// which silently depended on process.cwd() being the repo root — an assumption
// that does not survive being launched from a packaged app, where cwd is
// arbitrary and the app directory is a read-only asar archive.
const FALLBACK_DATA_DIR = path.resolve(process.cwd(), "data");

export const dataDir = process.env.GHP_DATA_DIR || FALLBACK_DATA_DIR;

export const paths = {
	dataDir,
	// Only read now, by the one-time migration in secretsStore — the server
	// list itself moved to servers.json and credentials to secrets.json.
	legacyServersFile: path.join(dataDir, "servers.js"),
	envFile: path.join(dataDir, ".env"),
	logsDir: path.join(dataDir, "logs"),
	uploadsDir: path.join(dataDir, "uploads"),
	creationLogsDir: path.join(dataDir, "jobs", "creation"),
	updateLogsDir: path.join(dataDir, "jobs", "update"),
	buildVersionsFile: path.join(dataDir, "state", "build-versions.json"),
	autoUpdateFile: path.join(dataDir, "state", "auto-update-settings.json"),
	discordMessageIdFile: path.join(dataDir, "state", "discord-message-id.json"),
	// Default parent dir for newly created game servers. Becomes a real
	// configurable setting in Stage 2; until then it mirrors the layout the
	// existing servers already use so an imported setup stays coherent.
	serversRoot: process.env.GHP_SERVERS_ROOT || path.join(dataDir, "servers"),
};

/** Create every directory the server writes into, before anything needs them. */
export function ensureDataDirs() {
	for (const dir of [
		paths.dataDir,
		paths.logsDir,
		paths.uploadsDir,
		paths.creationLogsDir,
		paths.updateLogsDir,
		path.join(paths.dataDir, "state"),
	]) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

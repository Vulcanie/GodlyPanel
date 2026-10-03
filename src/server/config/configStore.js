import path from "node:path";
import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";
import {
	coerceConfig,
	changedPaths,
	restartRequiredFor,
	CURRENT_SCHEMA_VERSION,
} from "./configSchema.js";

const CONFIG_PATH = path.join(paths.dataDir, "config.json");
const enqueue = createWriteQueue();

let current = null;
const listeners = new Set();

/** Fill in the "" = derive-it path defaults against the real data dir. */
function withResolvedPaths(config) {
	const resolved = JSON.parse(JSON.stringify(config));
	resolved.paths.serversRoot =
		config.paths.serversRoot || path.join(paths.dataDir, "servers");
	resolved.paths.steamCmdPath =
		config.paths.steamCmdPath ||
		path.join(paths.dataDir, "tools", "steamcmd", "steamcmd.exe");
	resolved.backups.dir = config.backups.dir || path.join(paths.dataDir, "backups");
	// jcmdPath stays blank when unset — blank means "use jcmd from PATH".
	return resolved;
}

export async function initConfig() {
	const raw = await readJson(CONFIG_PATH, null, { strict: true });

	if (raw && raw.schemaVersion > CURRENT_SCHEMA_VERSION) {
		// Written by a newer build. Don't try to interpret it — keep a copy so
		// nothing is lost if the user downgrades temporarily.
		const backup = `${CONFIG_PATH}.v${raw.schemaVersion}.bak`;
		await writeJsonAtomic(backup, raw);
		console.warn(
			`[config] config.json is from a newer version (schema ${raw.schemaVersion}); ` +
				`backed up to ${path.basename(backup)} and starting from defaults.`,
		);
		const { config } = coerceConfig(null);
		current = config;
	} else {
		const { config, issues } = coerceConfig(raw);
		for (const issue of issues) console.warn(`[config] ${issue}`);
		current = config;
	}

	if (!raw) {
		await writeJsonAtomic(CONFIG_PATH, current);
		console.log(`[config] Created ${CONFIG_PATH}`);
	}

	return getConfig();
}

/** The active config, with derived paths filled in. */
export function getConfig() {
	if (!current) throw new Error("Config accessed before initConfig().");
	return withResolvedPaths(current);
}

/** The config exactly as stored, with "" placeholders intact — for the UI. */
export function getRawConfig() {
	if (!current) throw new Error("Config accessed before initConfig().");
	return JSON.parse(JSON.stringify(current));
}

export function onConfigChange(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Apply a partial config update.
 * @returns {{ config: object, issues: string[], restartRequired: string[] }}
 */
export async function patchConfig(partial) {
	return enqueue(async () => {
		const before = current;
		const merged = JSON.parse(JSON.stringify(before));

		for (const [key, value] of Object.entries(partial ?? {})) {
			if (
				value &&
				typeof value === "object" &&
				!Array.isArray(value) &&
				typeof merged[key] === "object"
			) {
				Object.assign(merged[key], value);
			} else {
				merged[key] = value;
			}
		}

		const { config, issues } = coerceConfig(merged);
		const changed = changedPaths(before, config);
		current = config;
		await writeJsonAtomic(CONFIG_PATH, current);

		const resolved = getConfig();
		for (const listener of listeners) {
			try {
				listener(resolved, changed);
			} catch (err) {
				console.error("[config] change listener failed:", err.message);
			}
		}

		return { config: resolved, issues, restartRequired: restartRequiredFor(changed) };
	});
}

export const configPath = CONFIG_PATH;

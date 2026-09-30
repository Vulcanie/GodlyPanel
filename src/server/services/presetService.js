import crypto from "node:crypto";
import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";
import { readManagedFile, writeManagedFile } from "../util/managedFiles.js";
import { templateOfServer } from "./serverCreationService.js";
import { isFullyStopped } from "./serverState.js";
import { logActivity } from "./activityLog.js";

// Presets: a game's settings files saved under a name, so "PvE", "hardcore" or
// "event weekend" can be applied to any server of the same game in one step.
// Applying one replaces the settings files (keeping a .bak of each) and, by
// default, keeps the target's own name, passwords and ports so two servers
// sharing a preset don't end up sharing an identity.

const FILE = path.join(paths.dataDir, "presets.json");
const enqueue = createWriteQueue();
let presets = [];

export async function initPresets() {
	const stored = await readJson(FILE, null);
	presets = Array.isArray(stored?.presets) ? stored.presets : [];
}

const persist = () => enqueue(() => writeJsonAtomic(FILE, { schemaVersion: 1, presets }));

// Settings that say who a server is, not how it plays.
const IDENTITY_KEYS = [
	"ServerName",
	"SessionName",
	"ServerPassword",
	"AdminPassword",
	"ServerAdminPassword",
	"RconPassword",
	"RCONPassword",
	"RconPort",
	"RCONPort",
	"ServerPort",
	"PublicPort",
	"PublicIP",
	"QueryPort",
	"Port",
	"server-port",
	"query.port",
	"rcon.port",
	"rcon.password",
	"motd",
	"level-name",
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const keyPattern = (key) => new RegExp(`(?<![A-Za-z0-9_.-])(${escape(key)})(\\s*=\\s*)("[^"\\r\\n]*"|[^\\r\\n,)]*)`, "i");

/**
 * Put the target's own values for identity settings into the preset's text.
 * Handles `Key=value` lines and values inside a struct (`Key="value",`); files in
 * other formats (JSON, XML) are applied as they are.
 */
export function keepIdentity(presetText, currentText) {
	let out = presetText;
	for (const key of IDENTITY_KEYS) {
		const mine = keyPattern(key).exec(currentText);
		if (!mine) continue;
		const re = new RegExp(keyPattern(key).source, "gi");
		out = out.replace(re, (whole, k, eq) => `${k}${eq}${mine[3]}`);
	}
	return out;
}

function configFilesOf(server) {
	if (server.configPaths) return Object.entries(server.configPaths).map(([key, file]) => ({ key, file }));
	if (server.configPath) return [{ key: "config", file: server.configPath }];
	return [];
}

export class PresetError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

export const listPresets = () =>
	presets.map(({ files, ...rest }) => ({ ...rest, files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, { bytes: Buffer.byteLength(v, "utf8") }])) }));

/** Save the server's settings files as a preset. */
export async function savePreset(server, name) {
	const clean = String(name ?? "").trim().slice(0, 60);
	if (!clean) throw new PresetError("Give the preset a name.", "no_name");
	const template = templateOfServer(server);
	if (!template) throw new PresetError("This server's game isn't one the panel has presets for.", "unknown_game");
	const sources = configFilesOf(server);
	if (sources.length === 0) throw new PresetError("This server has no settings files to save.", "no_files");

	const files = {};
	for (const { key, file } of sources) {
		try {
			files[key] = await readManagedFile(file);
		} catch {
			// A file that doesn't exist yet (the game makes it on first run) is left out.
		}
	}
	if (Object.keys(files).length === 0) throw new PresetError("None of this server's settings files exist yet. Start the server once so the game creates them.", "no_files");

	const preset = { id: crypto.randomUUID(), name: clean, templateId: template.id, game: template.displayName, fromServer: server.name, createdAt: new Date().toISOString(), files };
	presets = [...presets, preset];
	await persist();
	logActivity({ type: "preset.saved", server: server.name, message: `Saved ${server.name}'s settings as the preset "${clean}".` });
	return listPresets().find((p) => p.id === preset.id);
}

export async function deletePreset(id) {
	if (!presets.some((p) => p.id === id)) return false;
	presets = presets.filter((p) => p.id !== id);
	await persist();
	return true;
}

/**
 * Apply a preset to a stopped server of the same game.
 * @returns {Promise<{ files: string[], skipped: string[] }>}
 */
export async function applyPreset(server, id, { keepIdentity: keep = true } = {}) {
	const preset = presets.find((p) => p.id === id);
	if (!preset) throw new PresetError("No such preset.", "not_found", 404);
	const template = templateOfServer(server);
	if (!template || template.id !== preset.templateId) {
		throw new PresetError(`That preset is for ${preset.game}, not for this server's game.`, "wrong_game");
	}
	if (!(await isFullyStopped(server))) throw new PresetError("Stop the server first: a running game overwrites its settings when it stops.", "server_running", 409);

	const targets = new Map(configFilesOf(server).map(({ key, file }) => [key, file]));
	const written = [];
	const skipped = [];
	for (const [key, content] of Object.entries(preset.files)) {
		const file = targets.get(key);
		if (!file) {
			skipped.push(key);
			continue;
		}
		let next = content;
		if (keep) {
			try {
				next = keepIdentity(content, await readManagedFile(file));
			} catch {
				// Nothing there to keep from.
			}
		}
		await writeManagedFile(file, next);
		written.push(key);
	}
	if (written.length === 0) throw new PresetError("None of the preset's files belong to this server.", "no_matching_files");
	logActivity({ type: "preset.applied", server: server.name, message: `Applied the preset "${preset.name}" to ${server.name} (${written.join(", ")}).` });
	return { files: written, skipped };
}

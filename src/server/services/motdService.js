import path from "node:path";
import { readManagedFile, writeManagedFile } from "../util/managedFiles.js";
import { templateOfServer } from "./serverCreationService.js";
import { isFullyStopped } from "./serverState.js";
import { logActivity } from "./activityLog.js";

// The message players see when they look at or join a server. Each game keeps it
// somewhere different (a line in server.properties, a section of an ini file, a
// setting inside a struct, an XML property), so each has a small reader and writer
// that change only that value and leave the rest of the file alone. The edit goes
// through the usual managed write, so it is in the file's history and can be undone.

const EOL = (text) => (text.includes("\r\n") ? "\r\n" : "\n");

const minecraft = {
	label: "Message of the day (shown in the server list)",
	file: (server) => path.join(server.workingDir || server.installDir, "server.properties"),
	get(text) {
		const m = /^motd\s*=(.*)$/m.exec(text);
		if (!m) return "";
		return m[1]
			.replace(/\r$/, "")
			.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
			.replace(/\\n/g, "\n");
	},
	set(text, value) {
		// server.properties wants newlines and anything outside ASCII escaped.
		const encoded = value
			.replace(/\r?\n/g, "\\n")
			.replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
		const line = `motd=${encoded}`;
		return /^motd\s*=.*$/m.test(text) ? text.replace(/^motd\s*=.*$/m, () => line) : `${text.replace(/\s*$/, "")}${EOL(text)}${line}${EOL(text)}`;
	},
};

// An ini file as lines: where a section starts and ends, so a value in it can be read
// or changed without a regular expression that has to guess where the section stops.
function sectionRange(lines, name) {
	const start = lines.findIndex((l) => l.trim().toLowerCase() === `[${name.toLowerCase()}]`);
	if (start === -1) return null;
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i += 1) {
		if (/^\s*\[.*\]\s*$/.test(lines[i])) {
			end = i;
			break;
		}
	}
	return { start, end };
}

const ark = {
	label: "Message of the day (shown when players join)",
	file: (server) => server.configPaths?.["GameUserSettings.ini"] ?? null,
	get(text) {
		const lines = text.split(/\r?\n/);
		const range = sectionRange(lines, "MessageOfTheDay");
		if (!range) return "";
		const line = lines.slice(range.start + 1, range.end).find((l) => /^\s*Message\s*=/i.test(l));
		return line ? line.slice(line.indexOf("=") + 1) : "";
	},
	set(text, value) {
		const eol = EOL(text);
		const lines = text.split(/\r?\n/);
		const single = value.replace(/\r?\n/g, " ");
		const range = sectionRange(lines, "MessageOfTheDay");
		if (!range) {
			while (lines.length > 0 && lines.at(-1).trim() === "") lines.pop();
			return [...lines, "", "[MessageOfTheDay]", `Message=${single}`, "Duration=20", ""].join(eol);
		}
		const at = lines.findIndex((l, i) => i > range.start && i < range.end && /^\s*Message\s*=/i.test(l));
		if (at === -1) lines.splice(range.start + 1, 0, `Message=${single}`);
		else lines[at] = `Message=${single}`;
		return lines.join(eol);
	},
};

const palworld = {
	label: "Server description (shown in the server list)",
	file: (server) => server.configPath ?? null,
	get(text) {
		const m = /ServerDescription="((?:[^"\\]|\\.)*)"/.exec(text);
		return m ? m[1].replace(/\\"/g, '"') : "";
	},
	set(text, value) {
		const v = value.replace(/\r?\n/g, " ").replace(/"/g, '\\"');
		return /ServerDescription="/.test(text) ? text.replace(/ServerDescription="(?:[^"\\]|\\.)*"/, () => `ServerDescription="${v}"`) : text;
	},
};

const sevenDays = {
	label: "Server description (shown in the server list)",
	file: (server) => server.configPath ?? path.join(server.workingDir || server.installDir, "serverconfig.xml"),
	get(text) {
		const m = /<property\s+name="ServerDescription"\s+value="([^"]*)"/i.exec(text);
		return m ? m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : "";
	},
	set(text, value) {
		const v = value.replace(/\r?\n/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		const re = /(<property\s+name="ServerDescription"\s+value=")[^"]*(")/i;
		if (re.test(text)) return text.replace(re, (_, a, b) => `${a}${v}${b}`);
		return text.replace(/<\/ServerSettings>/i, `\t<property name="ServerDescription" value="${v}"/>${EOL(text)}</ServerSettings>`);
	},
};

export const MOTD_ADAPTERS = {
	"minecraft-modpack": minecraft,
	"ark-ase": ark,
	"ark-asa": ark,
	palworld,
	"7days": sevenDays,
};

export class MotdError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

const adapterFor = (server) => MOTD_ADAPTERS[templateOfServer(server)?.id] ?? null;

export async function readMotd(server) {
	const adapter = adapterFor(server);
	if (!adapter) return { supported: false };
	const file = adapter.file(server);
	if (!file) return { supported: true, label: adapter.label, value: "", available: false, reason: "This server's settings file isn't known to the panel." };
	try {
		return { supported: true, label: adapter.label, value: adapter.get(await readManagedFile(file)), available: true };
	} catch {
		return { supported: true, label: adapter.label, value: "", available: false, reason: "The settings file doesn't exist yet. Start the server once so the game creates it." };
	}
}

export async function writeMotd(server, value) {
	const adapter = adapterFor(server);
	if (!adapter) throw new MotdError("This game has no message of the day the panel can change.", "unsupported");
	if (typeof value !== "string" || value.length > 500) throw new MotdError("The message must be text of 500 characters or fewer.", "bad_value");
	if (!(await isFullyStopped(server))) throw new MotdError("Stop the server first: a running game writes its settings back when it stops and would undo this.", "server_running", 409);
	const file = adapter.file(server);
	if (!file) throw new MotdError("This server's settings file isn't known to the panel.", "no_file");
	let text;
	try {
		text = await readManagedFile(file);
	} catch {
		throw new MotdError("The settings file doesn't exist yet. Start the server once so the game creates it.", "no_file");
	}
	const next = adapter.set(text, value);
	if (next === text && adapter.get(text) !== value) throw new MotdError("That setting wasn't found in the file, so nothing was changed.", "not_found");
	await writeManagedFile(file, next, "message of the day");
	logActivity({ type: "motd.changed", server: server.name, message: `Changed ${server.name}'s message of the day.` });
	return readMotd(server);
}

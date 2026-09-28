import fs from "fs";
import { paths } from "../paths.js";

// Env is populated by the Electron main process (from <dataDir>/.env in Stage
// 1, from the real settings store in Stage 2) — no dotenv.config() here, which
// would have looked for a .env relative to an unpredictable cwd.
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const UPDATE_WEBHOOK_URL = process.env.DISCORD_UPDATE_WEBHOOK_URL;
const MESSAGE_FILE = paths.discordMessageIdFile;

// Load stored message ID
function loadMessageId() {
	try {
		const data = JSON.parse(fs.readFileSync(MESSAGE_FILE, "utf8"));
		return data.id || null;
	} catch {
		return null;
	}
}

// Save message ID
function saveMessageId(id) {
	fs.writeFileSync(MESSAGE_FILE, JSON.stringify({ id }, null, 2));
}

let lastMessageId = loadMessageId();

// Discord is optional and off unless configured, so an unset webhook is a
// normal state, not an error — say so once rather than every poll tick.
let warnedNoWebhook = false;

export async function sendDiscordAlert(message) {
	if (!WEBHOOK_URL) {
		if (!warnedNoWebhook) {
			warnedNoWebhook = true;
			console.log("[discord] No status webhook configured — skipping status posts.");
		}
		return;
	}

	try {
		let url;
		let method;

		if (!lastMessageId) {
			// FIRST MESSAGE → MUST USE wait=true
			url = `${WEBHOOK_URL}?wait=true`;
			method = "POST";
		} else {
			// EDIT EXISTING MESSAGE
			url = `${WEBHOOK_URL}/messages/${lastMessageId}`;
			method = "PATCH";
		}

		const res = await fetch(url, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: message }),
		});

		if (!res.ok) {
			console.error(
				`Discord webhook failed: ${res.status} ${res.statusText}`,
			);
			return;
		}

		// POST returns JSON, PATCH returns 204
		if (method === "POST") {
			const data = await res.json();
			lastMessageId = data.id;
			saveMessageId(lastMessageId);
		}
	} catch (err) {
		console.error("Error sending Discord webhook:", err);
	}
}

// Posts a standalone message to the update-alerts channel — unlike
// sendDiscordAlert() above, this never edits a prior message, so each
// detection/countdown/completion event stays in the channel history.
export async function sendUpdateAlert(message) {
	if (!UPDATE_WEBHOOK_URL) {
		console.error("DISCORD_UPDATE_WEBHOOK_URL not set in .env");
		return;
	}

	try {
		const res = await fetch(UPDATE_WEBHOOK_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: message }),
		});

		if (!res.ok) {
			console.error(
				`Discord update webhook failed: ${res.status} ${res.statusText}`,
			);
		}
	} catch (err) {
		console.error("Error sending Discord update webhook:", err);
	}
}

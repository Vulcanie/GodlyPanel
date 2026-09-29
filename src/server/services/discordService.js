import fs from "fs";
import { paths } from "../paths.js";
import { getConfig } from "../config/configStore.js";
import { getSecrets } from "../config/secretsStore.js";

// Read per call rather than captured at import, so turning Discord on or
// pasting a webhook in settings takes effect immediately instead of needing
// a restart. Both the toggle and the URL have to be present — having a
// webhook saved shouldn't start posting on its own.
function webhooks() {
	const { discord } = getConfig();
	if (!discord.enabled) return { status: null, update: null };
	const secrets = getSecrets();
	return {
		status: secrets.discordWebhookUrl || null,
		update: secrets.discordUpdateWebhookUrl || null,
	};
}

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
	const statusWebhook = webhooks().status;
	if (!statusWebhook) {
		if (!warnedNoWebhook) {
			warnedNoWebhook = true;
			console.log("[discord] Status posting is off — enable it in settings to use it.");
		}
		return;
	}

	try {
		let url;
		let method;

		if (!lastMessageId) {
			// FIRST MESSAGE → MUST USE wait=true
			url = `${statusWebhook}?wait=true`;
			method = "POST";
		} else {
			// EDIT EXISTING MESSAGE
			url = `${statusWebhook}/messages/${lastMessageId}`;
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
	const updateWebhook = webhooks().update;
	if (!updateWebhook) return;

	try {
		const res = await fetch(updateWebhook, {
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

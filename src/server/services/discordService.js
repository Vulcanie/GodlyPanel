import fs from "node:fs";
import { paths } from "../paths.js";
import { getConfig } from "../config/configStore.js";
import { getSecrets } from "../config/secretsStore.js";

// Read per call rather than captured at import, so turning Discord on or
// pasting a webhook in settings takes effect immediately instead of needing
// a restart. Both the toggle and the URL have to be present — having a
// webhook saved shouldn't start posting on its own.
function webhooks() {
	if (!getConfig().discord.enabled) return { status: null, update: null };
	const secrets = getSecrets();
	return {
		status: secrets.discordWebhookUrl || null,
		update: secrets.discordUpdateWebhookUrl || null,
	};
}

/** True when status posting would actually go somewhere. */
export function discordEnabled() {
	return Boolean(webhooks().status);
}

// A hung request must not hold anything up, and Discord being slow isn't
// something worth waiting on.
const REQUEST_TIMEOUT_MS = 10_000;

function post(url, method, message) {
	return fetch(url, {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content: message }),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
}

function loadMessageId() {
	try {
		return JSON.parse(fs.readFileSync(paths.discordMessageIdFile, "utf8")).id || null;
	} catch {
		return null;
	}
}

function saveMessageId(id) {
	try {
		fs.writeFileSync(paths.discordMessageIdFile, JSON.stringify({ id }));
	} catch (err) {
		console.warn("[discord] Could not remember the status message:", err.message);
	}
}

let lastMessageId = loadMessageId();

// Discord is optional and off unless configured, so an unset webhook is a
// normal state, not an error — say so once rather than every poll tick.
let warnedNoWebhook = false;

// The one status message is edited in place rather than re-posted. If it's
// been deleted in Discord the edit returns 404 — which used to fail forever,
// since nothing ever cleared the stale id. Forget it and post a fresh one.
async function sendFresh(webhook, message) {
	const res = await post(`${webhook}?wait=true`, "POST", message);
	if (!res.ok) {
		console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
		return;
	}
	lastMessageId = (await res.json()).id;
	saveMessageId(lastMessageId);
}

export async function sendDiscordAlert(message) {
	const webhook = webhooks().status;
	if (!webhook) {
		if (!warnedNoWebhook) {
			warnedNoWebhook = true;
			console.log("[discord] Status posting is off — enable it in settings to use it.");
		}
		return;
	}

	try {
		if (!lastMessageId) return await sendFresh(webhook, message);

		const res = await post(`${webhook}/messages/${lastMessageId}`, "PATCH", message);
		if (res.status === 404) {
			lastMessageId = null;
			return await sendFresh(webhook, message);
		}
		if (!res.ok) console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
	} catch (err) {
		console.error("Error sending Discord webhook:", err.message);
	}
}

// Posts a standalone message to the update-alerts channel — unlike
// sendDiscordAlert() above, this never edits a prior message, so each
// detection/countdown/completion event stays in the channel history.
export async function sendUpdateAlert(message) {
	const webhook = webhooks().update;
	if (!webhook) return;

	try {
		const res = await post(webhook, "POST", message);
		if (!res.ok) {
			console.error(`Discord update webhook failed: ${res.status} ${res.statusText}`);
		}
	} catch (err) {
		console.error("Error sending Discord update webhook:", err.message);
	}
}

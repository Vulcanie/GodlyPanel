import { getSecrets } from "../config/secretsStore.js";
import { onActivity } from "./activityLog.js";

// Posts every administrator and moderator action (sign-ins, failed sign-ins, changes) to a webhook as it happens, normally a Discord
// channel only the owner can read. The point is a copy of the trail somewhere an intruder on this PC can't edit.
//
// Events that arrive close together go out as one message (Discord allows only a few posts a minute to a webhook, and a person
// working through a settings page makes a burst). Nothing that was typed is in them: see auditTrail.js. A failed post is logged
// and dropped; the activity log on this PC still has it.

const FEED = /^(auth\.|admin\.|community\.staff-signin$)/;
const FLUSH_MS = 4000;
const MAX_QUEUED = 200;
const MAX_LINES = 20;
const MAX_CHARS = 1900; // Discord refuses a message over 2000
const ICON = { info: "•", warn: "⚠️", error: "⛔" };

let queue = [];
let timer = null;
let flushMs = FLUSH_MS;

// A name someone typed must not be able to ping anybody or break the message's formatting.
const plain = (text) => String(text).replaceAll("@", "@​").replace(/[`*_~|>]/g, "\$&");

const line = (e) => `${ICON[e.level] ?? "•"} <t:${Math.floor(Date.parse(e.t) / 1000)}:T> ${plain(e.message)}`;

/** Sends what is waiting. Resolves to how many events went out. Never throws. */
export async function flushAuditFeed() {
	clearTimeout(timer);
	timer = null;
	const url = getSecrets().auditWebhookUrl;
	const batch = queue.splice(0);
	if (!url || batch.length === 0) return 0;

	const shown = batch.slice(0, MAX_LINES).map(line);
	let content = shown.join("\n");
	if (content.length > MAX_CHARS) content = `${content.slice(0, MAX_CHARS)}…`;
	if (batch.length > MAX_LINES) content += `\n…and ${batch.length - MAX_LINES} more (see the Activity export).`;

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username: "GodlyPanel audit", content, allowed_mentions: { parse: [] }, text: content }),
			signal: AbortSignal.timeout(10_000),
		});
		if (res.status === 429) {
			// Told to slow down: put them back and try after the wait it asks for.
			const wait = Math.min(30_000, Math.max(1000, Number((await res.json().catch(() => ({}))).retry_after ?? 2) * 1000));
			queue = [...batch, ...queue].slice(0, MAX_QUEUED);
			timer = setTimeout(flushAuditFeed, wait);
			timer.unref?.();
			return 0;
		}
		if (!res.ok) throw new Error(`the webhook answered ${res.status}`);
		return batch.length;
	} catch (err) {
		console.warn(`[audit] Couldn't post to the audit webhook: ${err.message}`);
		return 0;
	}
}

/** Start listening. Returns a function that stops. `flushEveryMs` is for tests. */
export function startAuditFeed({ flushEveryMs = FLUSH_MS } = {}) {
	flushMs = flushEveryMs;
	const off = onActivity((event) => {
		if (!FEED.test(event.type) || !getSecrets().auditWebhookUrl) return;
		queue.push(event);
		if (queue.length > MAX_QUEUED) queue.shift();
		if (!timer) {
			timer = setTimeout(flushAuditFeed, flushMs);
			timer.unref?.();
		}
	});
	return () => {
		off();
		clearTimeout(timer);
		timer = null;
		queue = [];
	};
}

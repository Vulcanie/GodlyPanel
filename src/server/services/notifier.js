import { promises as fs } from "node:fs";
import path from "node:path";
import { getConfig } from "../config/configStore.js";
import { getSecrets } from "../config/secretsStore.js";
import { paths } from "../paths.js";
import { logActivity, onActivity } from "./activityLog.js";

// Tells people when something needs attention: a native Windows notification, a
// webhook (Discord, Slack and most chat tools take the same payload), and email.
// What counts is whatever the activity log records; which of those events to send,
// and where, is configured.

export const EVENT_LABELS = {
	"server.crashed": "A server went down unexpectedly",
	"server.restarted.auto": "A server was restarted automatically",
	"server.gave_up": "The panel gave up restarting a server",
	"server.unresponsive": "A server is running but not answering",
	"server.restart_failed": "An automatic restart failed",
	"server.start_failed": "A server couldn't be started",
	"server.restarted.scheduled": "A scheduled restart happened",
	"backup.completed": "A backup finished",
	"backup.failed": "A backup failed",
	"backup.restore_failed": "A restore failed",
	"backup.restart_failed": "A server wouldn't start after a restore",
	"schedule.failed": "A scheduled task failed",
	"schedule.skipped": "A scheduled task was skipped",
	"disk.low": "A drive is running low on space",
	"panel.update_available": "A new version of GodlyPanel is available",
};

const GIB = 1024 ** 3;
const THROTTLE_MS = 10 * 60_000;
const recent = new Map(); // "type|server" -> last sent ms

const REQUEST_TIMEOUT_MS = 10_000;

function enabledEvents() {
	return new Set(getConfig().notifications.events);
}

// ---- channels ---------------------------------------------------------------

function toDesktop(title, body) {
	if (!getConfig().notifications.desktop || !process.send) return { skipped: true };
	process.send({ type: "notify", title, body });
	return { ok: true };
}

async function toWebhook(title, body, event) {
	const url = getSecrets().alertWebhookUrl;
	if (!url) return { skipped: true };
	// One payload that Discord (`content`), Slack and compatible tools (`text`) and
	// anything that wants the raw facts (the rest) can each read.
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			content: `**${title}**\n${body}`,
			text: `${title}: ${body}`,
			event: event?.type ?? "test",
			server: event?.server ?? null,
			level: event?.level ?? "info",
			time: event?.t ?? new Date().toISOString(),
		}),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!res.ok) throw new Error(`the webhook answered ${res.status}`);
	return { ok: true };
}

async function toEmail(title, body) {
	const email = getConfig().notifications.email;
	if (!email.enabled || !email.host || !email.to) return { skipped: true };
	const nodemailer = (await import("nodemailer")).default;
	const secret = getSecrets().smtpPassword;
	const transport = nodemailer.createTransport({
		host: email.host,
		port: email.port,
		secure: email.secure,
		...(email.user ? { auth: { user: email.user, pass: secret } } : {}),
		connectionTimeout: REQUEST_TIMEOUT_MS,
		greetingTimeout: REQUEST_TIMEOUT_MS,
		socketTimeout: REQUEST_TIMEOUT_MS,
	});
	await transport.sendMail({ from: email.from || email.user || "godlypanel@localhost", to: email.to, subject: title, text: body });
	return { ok: true };
}

async function deliver(title, body, event) {
	const results = {};
	const attempt = async (name, run) => {
		try {
			results[name] = await run();
		} catch (err) {
			results[name] = { ok: false, error: err.message };
			console.warn(`[notify] ${name} failed: ${err.message}`);
		}
	};
	await Promise.all([
		attempt("desktop", async () => toDesktop(title, body)),
		attempt("webhook", () => toWebhook(title, body, event)),
		attempt("email", () => toEmail(title, body)),
	]);
	return results;
}

// ---- events -----------------------------------------------------------------

export function handleEvent(event) {
	if (!enabledEvents().has(event.type)) return;
	const key = `${event.type}|${event.server ?? ""}`;
	const now = Date.now();
	if (now - (recent.get(key) ?? 0) < THROTTLE_MS) return;
	recent.set(key, now);
	const title = event.server ? `GodlyPanel: ${event.server}` : "GodlyPanel";
	deliver(title, event.message, event).catch(() => {});
}

export function startNotifier() {
	onActivity(handleEvent);
}

/** Send a test through every channel that is set up, and say how each went. */
export async function sendTest() {
	return deliver("GodlyPanel test", "If you can read this, notifications from GodlyPanel are working.", null);
}

// ---- low disk ---------------------------------------------------------------

const warnedAt = new Map(); // drive -> ms
const REWARN_MS = 6 * 3600_000;

/** Warn when a drive the panel uses is nearly full. Safe to call often. */
export async function checkDisks() {
	const limit = getConfig().notifications.diskLowGB * GIB;
	if (limit <= 0) return [];
	const config = getConfig();
	const folders = [config.paths.serversRoot, config.backups.dir, paths.dataDir];
	const seen = new Set();
	const low = [];
	for (const folder of folders) {
		const drive = path.parse(path.resolve(folder)).root.toUpperCase();
		if (seen.has(drive)) continue;
		seen.add(drive);
		let free;
		try {
			const info = await fs.statfs(drive);
			free = Number(info.bavail) * Number(info.bsize);
		} catch {
			continue;
		}
		if (free >= limit) {
			warnedAt.delete(drive);
			continue;
		}
		low.push({ drive, freeBytes: free });
		if (Date.now() - (warnedAt.get(drive) ?? 0) < REWARN_MS) continue;
		warnedAt.set(drive, Date.now());
		logActivity({
			type: "disk.low",
			level: "warn",
			message: `Drive ${drive.replace(/\\$/, "")} has only ${(free / GIB).toFixed(1)} GB free. Servers and backups on it may stop working.`,
			data: { drive, freeBytes: free },
		});
	}
	return low;
}

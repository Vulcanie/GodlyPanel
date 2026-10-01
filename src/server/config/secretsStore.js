import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";

// Secrets live in their own file rather than config.json for one practical
// reason: people paste config.json into support threads. Keeping webhooks,
// API keys and password hashes out of it makes that safe by default.
const SECRETS_PATH = path.join(paths.dataDir, "secrets.json");
const enqueue = createWriteQueue();

const EMPTY = {
	jwtSecret: "",
	adminPasswordHash: "",
	guestPasswordHash: "",
	discordWebhookUrl: "",
	discordUpdateWebhookUrl: "",
	curseForgeApiKey: "",
	fixedRconPassword: "",
	// Where alerts are posted (Discord, Slack and similar), and the mail account's password.
	alertWebhookUrl: "",
	smtpPassword: "",
	discordBotToken: "",
	// The token of a tunnel made in the Cloudflare dashboard, for the community view.
	cloudflareTunnelToken: "",
	// Secret access keys of off-machine backup destinations, by destination id.
	destinationKeys: {},
};

let current = null;

/**
 * One-time migration off the Stage 1 bridge: if the user still has a
 * <dataDir>/.env, adopt its values so an existing install keeps working
 * without them re-entering anything.
 */
function readLegacyEnvFile() {
	const envPath = paths.envFile;
	if (!fs.existsSync(envPath)) return null;

	const values = {};
	for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq === -1) continue;
		values[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
	}

	return {
		jwtSecret: values.JWT_SECRET || "",
		adminPasswordHash: values.ADMIN_PASSWORD_HASH || "",
		guestPasswordHash: values.GUEST_PASSWORD_HASH || "",
		discordWebhookUrl: values.DISCORD_WEBHOOK_URL || "",
		discordUpdateWebhookUrl: values.DISCORD_UPDATE_WEBHOOK_URL || "",
		curseForgeApiKey: values.CURSEFORGE_API_KEY || "",
		fixedRconPassword: "",
	};
}

export async function initSecrets() {
	const stored = await readJson(SECRETS_PATH, null);

	if (stored) {
		current = { ...EMPTY, ...stored };
	} else {
		const migrated = readLegacyEnvFile();
		current = { ...EMPTY, ...(migrated ?? {}) };
		if (migrated) {
			console.log("[secrets] Migrated credentials from the legacy .env file.");
		}
	}

	// A signing key must exist and must not be a shipped constant.
	if (!current.jwtSecret) {
		current.jwtSecret = crypto.randomBytes(48).toString("hex");
		console.log("[secrets] Generated a new JWT signing key.");
	}

	// Accounts live in users.json now; the password hashes here exist only so
	// an install upgrading from an older version can be migrated across
	// (see userStore.migrateFromSecrets), after which they're cleared. A
	// fresh install has no account at all and is sent to the setup wizard.
	if (!stored) await persist();

	return current;
}

async function persist() {
	await writeJsonAtomic(SECRETS_PATH, current);
	// Best-effort tightening; on NTFS this is advisory at best, but it costs
	// nothing and signals intent.
	await fs.promises.chmod(SECRETS_PATH, 0o600).catch(() => {});
}

export function getSecrets() {
	if (!current) throw new Error("Secrets accessed before initSecrets().");
	return { ...current };
}

export async function patchSecrets(partial) {
	return enqueue(async () => {
		current = { ...current, ...partial };
		await persist();
		return { ...current };
	});
}

/** Which secrets are set, without revealing them — safe for the settings UI. */
export function describeSecrets() {
	const s = getSecrets();
	return Object.fromEntries(
		Object.keys(EMPTY).filter((k) => typeof EMPTY[k] === "string").map((k) => [k, Boolean(s[k])]),
	);
}

export const secretsPath = SECRETS_PATH;

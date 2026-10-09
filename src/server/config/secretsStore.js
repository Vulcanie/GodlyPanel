import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";
import { lockDownPrivateDir } from "../util/lockDownDataDir.js";

// Secrets live in their own file rather than config.json for one practical
// reason: people paste config.json into support threads. Keeping webhooks,
// API keys and password hashes out of it makes that safe by default.
//
// It also lives outside the data folder, in a hidden folder beside it (see paths.secretsDir), so copying or backing up `data`
// doesn't copy the signing key and every secret with it.
const SECRETS_PATH = path.join(paths.secretsDir, "secrets.json");
const LEGACY_PATH = path.join(paths.dataDir, "secrets.json");
const moved = () => path.resolve(paths.secretsDir) !== path.resolve(paths.dataDir);
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
	// Where every administrator and moderator action is posted as it happens (a Discord channel only the owner reads).
	auditWebhookUrl: "",
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

/**
 * Older versions kept secrets.json in the data folder. Copy it to the secrets folder, check the copy, then remove the original
 * (and the .bak and .tmp beside it, which hold the same secrets). Anything unexpected leaves the original where it was.
 */
async function moveOutOfDataDir() {
	await fs.promises.mkdir(paths.secretsDir, { recursive: true });
	const locked = await lockDownPrivateDir(paths.secretsDir);
	if (locked.error) console.warn(`[secrets] Couldn't make the secrets folder private: ${locked.error}`);

	const old = await readJson(LEGACY_PATH, null, { strict: true });
	if (!old) return;
	if (fs.existsSync(SECRETS_PATH)) {
		console.warn(`[secrets] ${LEGACY_PATH} is left over from an older version and is no longer used. Delete it once you've checked nothing in it is needed.`);
		return;
	}
	await writeJsonAtomic(SECRETS_PATH, old);
	const copy = await readJson(SECRETS_PATH, null, { strict: true });
	if (JSON.stringify(copy) !== JSON.stringify(old)) {
		await fs.promises.rm(SECRETS_PATH, { force: true });
		throw new Error(`GodlyPanel couldn't copy its secrets to ${paths.secretsDir} correctly, so nothing was moved. Check the folder is writable.`);
	}
	for (const leftover of [LEGACY_PATH, `${LEGACY_PATH}.bak`, `${LEGACY_PATH}.tmp`]) await fs.promises.rm(leftover, { force: true });
	console.log("[secrets] Moved secrets.json out of the data folder.");
}

export async function initSecrets() {
	if (moved()) await moveOutOfDataDir();
	const stored = await readJson(SECRETS_PATH, null, { strict: true });

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

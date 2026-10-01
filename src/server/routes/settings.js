import express from "express";
import { FIELD_SPECS } from "../config/configSchema.js";
import { getRawConfig, getConfig, patchConfig, configPath } from "../config/configStore.js";
import { describeSecrets, patchSecrets } from "../config/secretsStore.js";
import { paths } from "../paths.js";
import { isSteamCmdInstalled, ensureSteamCmd } from "../services/steamCmdProvisioner.js";
import {
	previewLegacyImport,
	importLegacyServers,
	scanServersRoot,
} from "../services/importService.js";
import { remove as removeServer, all as allServers } from "../data/serverStore.js";
import { rescan } from "../services/storageService.js";
import { inspectFolder } from "../services/folderCheck.js";
import { EVENT_LABELS, sendTest, checkDisks } from "../services/notifier.js";
import { BackupError } from "../services/backupService.js";
import { panelChecklist, summarise } from "../services/setupChecklist.js";
import { applyBotSettings, botState } from "../services/discordBot.js";
import { lanAddresses } from "../services/firewallCheck.js";
import { tailscaleStatus } from "../services/tailscale.js";
import { listDestinations, saveDestination, removeDestination, testDestination, retryReplication } from "../services/backupDestinations.js";

const router = express.Router();

// Current settings plus the metadata a settings form needs, so the UI never
// has to keep its own copy of what's valid.
router.get("/", (req, res) => {
	res.json({
		config: getRawConfig(),
		resolved: getConfig(),
		fields: FIELD_SPECS,
		secrets: describeSecrets(),
		paths: {
			dataDir: paths.dataDir,
			configFile: configPath,
		},
		steamCmdInstalled: isSteamCmdInstalled(),
		notificationEvents: EVENT_LABELS,
	});
});

// Sends a real test through every channel that is set up, and says how each went.
router.post("/notifications/test", async (req, res) => {
	res.json(await sendTest());
});

// Looks at the drives now rather than waiting for the next check; returns any that are low.
router.post("/notifications/check-disks", async (req, res) => {
	res.json({ low: await checkDisks() });
});

router.post("/check-folder", (req, res) => {
	// On the create page a blank box means "my usual server folder", which is
	// the configured one — not the built-in default the settings box means.
	const blankUsesConfigured = req.body?.blankUsesConfigured === true;
	const typed = String(req.body?.path ?? "").trim();
	res.json(inspectFolder(typed === "" && blankUsesConfigured ? getConfig().paths.serversRoot : typed));
});

router.put("/", async (req, res) => {
	try {
		const newRoot = req.body?.paths?.serversRoot;
		if (typeof newRoot === "string" && newRoot.trim() !== "") {
			const check = inspectFolder(newRoot);
			if (!check.ok) return res.status(400).json({ error: check.errors[0] });
		}
		const result = await patchConfig(req.body ?? {});
		applyBotSettings();
		res.json({ success: true, ...result });
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Separate endpoint so secrets never travel alongside the readable config.
router.put("/secrets", async (req, res) => {
	const allowed = [
		"discordWebhookUrl",
		"discordUpdateWebhookUrl",
		"curseForgeApiKey",
		"fixedRconPassword",
		"alertWebhookUrl",
		"smtpPassword",
		"discordBotToken",
	];
	const patch = {};
	for (const key of allowed) {
		if (typeof req.body?.[key] === "string") patch[key] = req.body[key];
	}
	if (Object.keys(patch).length === 0) {
		return res.status(400).json({ error: "No recognised secret fields supplied." });
	}
	await patchSecrets(patch);
	applyBotSettings();
	res.json({ success: true, secrets: describeSecrets() });
});

// Where the panel itself can be opened from: this PC, the local network, and a mesh VPN (Tailscale, ZeroTier).
const inMesh = (address) => {
	const [a, b] = address.split(".").map(Number);
	return a === 100 && b >= 64 && b <= 127;
};
router.get("/access", async (req, res) => {
	const port = Number(process.env.GHP_PORT) || getConfig().http.port;
	const { bindAll } = getConfig().http;
	const addresses = lanAddresses().map((a) => ({ ...a, url: `http://${a.address}:${port}/`, mesh: inMesh(a.address) }));
	const tailscale = await tailscaleStatus();
	res.json({ port, bindAll, local: `http://127.0.0.1:${port}/`, addresses: bindAll ? addresses : [], allowCgnat: getConfig().network.allowCgnat !== false, tailscale });
});

router.get("/discord-bot", (req, res) => res.json(botState()));

router.get("/checklist", async (req, res) => {
	const items = await panelChecklist();
	res.json({ items, ...summarise(items) });
});

// ---- off-machine backup destinations ------------------------------------------

const destFail = (res, err) => {
	if (err instanceof BackupError || err.status) return res.status(err.status ?? 400).json({ error: err.message, code: err.code });
	console.error("Backup destinations:", err);
	res.status(500).json({ error: err.message });
};

router.get("/backup-destinations", async (req, res) => res.json({ destinations: await listDestinations() }));

router.post("/backup-destinations", async (req, res) => {
	try {
		res.status(201).json(await saveDestination(req.body ?? {}));
	} catch (err) {
		destFail(res, err);
	}
});

// Checks a form's values without saving them ({ id } of a saved one tests it as stored).
router.post("/backup-destinations/test", async (req, res) => {
	try {
		res.json(await testDestination(req.body?.id && Object.keys(req.body).length === 1 ? req.body.id : (req.body ?? {})));
	} catch (err) {
		destFail(res, err);
	}
});

router.post("/backup-destinations/retry", async (req, res) => res.json(await retryReplication()));

router.put("/backup-destinations/:id", async (req, res) => {
	try {
		res.json(await saveDestination(req.body ?? {}, req.params.id));
	} catch (err) {
		destFail(res, err);
	}
});

router.delete("/backup-destinations/:id", async (req, res) => {
	try {
		await removeDestination(req.params.id);
		res.json({ success: true });
	} catch (err) {
		destFail(res, err);
	}
});

router.post("/storage/rescan", async (req, res) => {
	// Returns straight away — a full walk takes a while, and the dashboard
	// reads the cached figure.
	res.status(202).json({ started: true });
	rescan().catch((e) => console.error("[storage] Rescan failed:", e.message));
});

router.post("/steamcmd/install", async (req, res) => {
	try {
		const installedPath = await ensureSteamCmd((msg) => console.log(`[steamcmd] ${msg}`));
		res.json({ success: true, path: installedPath });
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

// --- Importing an existing setup ---

router.post("/import/legacy/preview", async (req, res) => {
	const { filePath } = req.body ?? {};
	if (!filePath) return res.status(400).json({ error: "filePath is required." });
	try {
		res.json(await previewLegacyImport(filePath));
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

router.post("/import/legacy", async (req, res) => {
	const { filePath, only } = req.body ?? {};
	if (!filePath) return res.status(400).json({ error: "filePath is required." });
	try {
		res.json(await importLegacyServers(filePath, Array.isArray(only) ? only : null));
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

router.post("/import/scan", async (req, res) => {
	const dir = req.body?.dir || getConfig().paths.serversRoot;
	try {
		res.json(await scanServersRoot(dir));
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// --- Server list management (finally possible now it isn't source code) ---

router.get("/servers", (req, res) => {
	res.json(allServers());
});

router.delete("/servers/:name", async (req, res) => {
	try {
		await removeServer(req.params.name);
		res.json({ success: true });
	} catch (e) {
		res.status(404).json({ error: e.message });
	}
});

export default router;

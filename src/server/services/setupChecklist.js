import fs from "node:fs";
import { getConfig } from "../config/configStore.js";
import { describeSecrets } from "../config/secretsStore.js";
import { all as allServers } from "../data/serverStore.js";
import { getOptions } from "../data/serverOptions.js";
import { isSteamCmdInstalled } from "./steamCmdProvisioner.js";
import { backupSpecsFor, listBackups } from "./backupService.js";
import { listDestinations } from "./backupDestinations.js";
import { firewallReport } from "./firewallCheck.js";

// A short list of what is worth doing so a server keeps running and people can reach it:
// each line says where it stands ("done", "worth doing", "needs doing") and where to go to
// change it. Nothing here changes anything; it only looks.

const DAY = 86_400_000;

const item = (id, status, title, detail, fix = null) => ({ id, status, title, detail, fix });

/** What to set up for the panel as a whole. */
export async function panelChecklist() {
	const config = getConfig();
	const servers = allServers();
	const items = [];

	items.push(
		servers.length > 0
			? item("servers", "ok", "You have a server", `${servers.length} set up.`)
			: item("servers", "todo", "Add your first server", "Create one from a game's template, or import servers already on this PC.", { to: "create" }),
	);

	if (servers.some((s) => s.updateAppId) || servers.length === 0) {
		items.push(
			isSteamCmdInstalled()
				? item("steamcmd", "ok", "SteamCMD is installed", "Game servers can be installed and updated.")
				: item("steamcmd", "warn", "SteamCMD isn't installed", "It installs and updates most game servers. It is downloaded from Valve once, from Settings.", { to: "settings" }),
		);
	}

	const destinations = (await listDestinations()).filter((d) => d.enabled);
	items.push(
		destinations.length > 0
			? item("offsite", "ok", "Backups are copied off this PC", destinations.map((d) => d.name).join(", "))
			: item("offsite", "warn", "Backups only exist on this PC", "If this drive fails, the backups go with it. Add a folder on another drive, a network share or cloud storage.", { to: "settings" }),
	);

	items.push(
		config.startup.openAtLogin
			? item("startup", "ok", "The panel starts with Windows", "Servers set to start automatically come back after a reboot.")
			: item("startup", "warn", "The panel doesn't start with Windows", "After a reboot or power cut your servers stay off until someone opens the panel.", { to: "settings" }),
	);

	const secrets = describeSecrets();
	const alerts = secrets.alertWebhookUrl || config.notifications.email.enabled || config.notifications.desktop;
	items.push(
		alerts
			? item("alerts", "ok", "You'll be told when something goes wrong", [config.notifications.desktop && "Windows notifications", secrets.alertWebhookUrl && "a webhook", config.notifications.email.enabled && "email"].filter(Boolean).join(", "))
			: item("alerts", "warn", "Nothing will tell you when a server crashes", "Turn on Windows notifications, a Discord/Slack webhook or email.", { to: "settings" }),
	);

	return items;
}

/** What to check for one server. `withFirewall` reads Windows Firewall (a few seconds the first time). */
export async function serverChecklist(server, { withFirewall = true } = {}) {
	const items = [];
	const options = getOptions(server.name);

	const missing = [server.startScriptPath, server.installDir].filter(Boolean).filter((p) => !fs.existsSync(p));
	items.push(
		missing.length === 0
			? item("files", "ok", "Its files are where the panel expects", server.installDir ?? "")
			: item("files", "todo", "Some of its files are missing", missing.join(", "), { tab: "config" }),
	);

	const { specs } = await backupSpecsFor(server).catch(() => ({ specs: [] }));
	if (specs.length === 0) {
		items.push(item("backup-setup", "warn", "No save folders are chosen for backups", "Choose the folders that hold this server's world.", { tab: "backups" }));
	} else {
		const backups = await listBackups(server).catch(() => []);
		const newest = backups[0] ? Date.parse(backups[0].createdAt) : 0;
		items.push(
			!newest
				? item("backup-made", "warn", "It has never been backed up", "Take one now, or schedule them.", { tab: "backups" })
				: Date.now() - newest > 7 * DAY
					? item("backup-made", "warn", "Its last backup is more than a week old", new Date(newest).toLocaleString(), { tab: "backups" })
					: item("backup-made", "ok", "It has a recent backup", new Date(newest).toLocaleString()),
		);
	}

	items.push(
		options.autoRestart
			? item("recovery", "ok", "It restarts itself if it crashes", "")
			: item("recovery", "warn", "It won't restart itself if it crashes", "Turn on crash recovery so a crash at night doesn't keep it down until morning.", { tab: "automation" }),
	);

	if (withFirewall && (server.port || server.queryPort)) {
		const report = await firewallReport(server).catch((err) => ({ readable: false, error: err.message }));
		if (!report.readable) items.push(item("firewall", "info", "Couldn't check Windows Firewall", report.error ?? "", { tab: "network" }));
		else if (report.allOpen) items.push(item("firewall", "ok", "Windows Firewall lets players in", report.ports.map((p) => `${p.port}/${p.protocol}`).join(", "), { tab: "network" }));
		else items.push(item("firewall", "todo", "Windows Firewall may be blocking players", `No rule covers ${report.missing.map((p) => `${p.port}/${p.protocol}`).join(", ")}.`, { tab: "network" }));
	}

	return items;
}

const weight = { ok: 0, info: 0, warn: 1, todo: 2 };

export const summarise = (items) => ({
	done: items.filter((i) => i.status === "ok").length,
	total: items.length,
	worst: items.reduce((w, i) => (weight[i.status] > weight[w] ? i.status : w), "ok"),
});

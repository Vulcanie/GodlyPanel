import { all as allServers } from "../data/serverStore.js";
import { checkForUpdates, markBuildIdSeen } from "./buildTracker.js";
import { updateServer, getUpdateGroup } from "./updateService.js";
import { sendRconCommand } from "./serverControl.js";
import { serverStatus } from "./pollingService.js";
import { sendUpdateAlert } from "./discordService.js";
import { isAutoUpdateEnabled } from "./autoUpdateSettings.js";
import { sleep } from "../util/async.js";

// Minutes-remaining checkpoints for the pre-update warning, plus an
// explicit "now" broadcast right before the update actually starts.
const COUNTDOWN_STEPS = [15, 10, 5];

// appIds currently mid-countdown/update in this process, so a check that
// lands while one is already running doesn't start a second, overlapping
// countdown for the same game.
const inProgress = new Set();

async function filterAsync(items, predicate) {
	const keep = await Promise.all(items.map(predicate));
	return items.filter((_, i) => keep[i]);
}

// Only ARK, Minecraft, and Palworld have a known/tested broadcast command
// here. Games without RCON configured (or without a known broadcast syntax)
// are silently skipped for the in-game warning — they still get updated on
// schedule, just without a heads-up inside the game itself.
function getBroadcastCommand(server, message) {
	switch (server.type) {
		case "ark":
			return `serverchat ${message}`;
		case "minecraft":
			return `say ${message}`;
		case "Palword":
			return `Broadcast ${message}`;
		case "conan":
			return `broadcast ${message}`;
		default:
			return null;
	}
}

async function broadcastToGroup(group, message) {
	for (const server of group) {
		if (!server.rconPort || !server.rconPassword) continue;
		if (!serverStatus[server.name]?.online) continue;

		const command = getBroadcastCommand(server, message);
		if (!command) continue;

		try {
			await sendRconCommand(server, command);
		} catch (e) {
			console.warn(
				`[auto-update] Broadcast failed for ${server.name}: ${e.message}`,
			);
		}
	}
}

// ARK: Survival Ascended's shared install has 9+ maps, so spelling every
// one out in every countdown message ("Ark-Ragnarok, Ark-TheIsland,
// Ark-ScorchedEarth, ...") is just noise — a single "All ASA servers" line
// says the same thing far more readably. Every other game either has one
// server per appId or a short enough list that naming them is still useful.
const ARK_ASA_APP_ID = "2430930";

function describeUpdateTargets(appId, allNames) {
	if (appId === ARK_ASA_APP_ID) return "All ASA servers";
	return allNames.join(", ");
}

// One entry per distinct install location among the given servers (reusing
// the same installDir-based grouping the manual Update button uses, so
// ARK's shared-install siblings are only updated once, together).
function groupByInstall(servers) {
	const groups = [];
	const seenKeys = new Set();

	for (const server of servers) {
		const key = server.installDir ?? server.name;
		if (seenKeys.has(key)) continue;
		seenKeys.add(key);
		groups.push(getUpdateGroup(server));
	}

	return groups;
}

async function runCountdownAndUpdate(appId, oldBuildId, newBuildId) {
	const allForAppId = allServers().filter((s) => s.updateAppId === appId);
	const optedIn = await filterAsync(allForAppId, isAutoUpdateEnabled);

	if (optedIn.length === 0) {
		console.log(
			`[auto-update] Build change detected for appId ${appId} (${oldBuildId} -> ${newBuildId}) but no server has auto-update enabled — skipping.`,
		);
		return;
	}

	const groups = groupByInstall(optedIn);
	const allNames = groups.flat().map((s) => s.name);
	const targetsLabel = describeUpdateTargets(appId, allNames);
	const totalMinutes = COUNTDOWN_STEPS[0];

	await sendUpdateAlert(
		`🔔 **Update detected** (build \`${oldBuildId ?? "unknown"}\` → \`${newBuildId}\`) for: ${targetsLabel}\nAuto-update countdown starting now — restart in ${totalMinutes} minutes.`,
	);

	let remaining = totalMinutes;
	for (const step of COUNTDOWN_STEPS) {
		const waitMs = (remaining - step) * 60_000;
		if (waitMs > 0) await sleep(waitMs);

		const label = `${step} minute${step === 1 ? "" : "s"}`;
		for (const group of groups) {
			await broadcastToGroup(
				group,
				`Server update in ${label} — please find a safe place to log off!`,
			);
		}
		await sendUpdateAlert(`⏳ ${label} until update/restart: ${targetsLabel}`);

		remaining = step;
	}

	await sleep(remaining * 60_000);

	for (const group of groups) {
		await broadcastToGroup(group, "Server updating NOW — see you in a bit!");
	}
	await sendUpdateAlert(`🔧 Updating now: ${targetsLabel}`);

	for (const group of groups) {
		const representative = group[0];
		try {
			// updateServer() defaults to restarting only whatever in the
			// group is actually online right now, which is exactly what we
			// want here too — no need to compute it separately.
			await updateServer(representative, { restart: true });
		} catch (e) {
			await sendUpdateAlert(
				`❌ Failed to start update for ${group.map((s) => s.name).join(", ")}: ${e.message}`,
			);
		}
	}

	await sendUpdateAlert(
		`✅ Update rollout complete for build \`${newBuildId}\` — servers restarting now, may take a few minutes to come back online.`,
	);

	await markBuildIdSeen(appId, newBuildId);
}

export async function checkAndHandleUpdates() {
	let changes;
	try {
		changes = await checkForUpdates(allServers());
	} catch (e) {
		console.error("[auto-update] Build check failed:", e.message);
		return;
	}

	for (const { appId, oldBuildId, newBuildId } of changes) {
		if (inProgress.has(appId)) continue;
		inProgress.add(appId);

		runCountdownAndUpdate(appId, oldBuildId, newBuildId)
			.catch((e) => {
				console.error(`[auto-update] Countdown/update flow failed for appId ${appId}:`, e);
			})
			.finally(() => {
				inProgress.delete(appId);
			});
	}
}

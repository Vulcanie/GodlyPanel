import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { paths } from "../paths.js";
import { resolveSteamCmdFor } from "./steamCmdProvisioner.js";

const STORE_PATH = paths.buildVersionsFile;

async function loadKnownBuildIds() {
	try {
		return JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
	} catch {
		return {};
	}
}

export async function markBuildIdSeen(appId, buildId) {
	const known = await loadKnownBuildIds();
	known[appId] = buildId;
	await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
	await fs.writeFile(STORE_PATH, JSON.stringify(known, null, 2));
}

// app_info_print is a read-only query against Steam's app info cache — it
// does not touch any installed game files (steamcmd's own brief
// self-update-on-launch noise in the output is unrelated housekeeping).
// SteamCMD with no network (or a Steam outage) can sit there for ever. The check runs on a timer, so every hung run would stay
// behind as a process of its own and the next check would start another.
const QUERY_TIMEOUT_MS = 5 * 60_000;

function getRemoteBuildId(steamCmdPath, appId, timeoutMs = QUERY_TIMEOUT_MS) {
	return new Promise((resolve, reject) => {
		let output = "";
		const child = spawn(
			steamCmdPath,
			[
				"+login",
				"anonymous",
				"+app_info_update",
				"1",
				"+app_info_print",
				String(appId),
				"+quit",
			],
			{ windowsHide: true },
		);

		child.stdout?.on("data", (d) => (output += d));
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error(`steamcmd did not answer within ${Math.round(timeoutMs / 60_000)} minutes`));
		}, timeoutMs);
		child.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		child.on("exit", (code) => {
			clearTimeout(timer);
			if (code !== 0) {
				reject(new Error(`steamcmd exited with code ${code}`));
				return;
			}
			resolve(output);
		});
	});
}

// The app_info_print dump nests buildid under branches -> public -> buildid.
// Scoping the search this way (rather than a single global regex) avoids
// matching depot-level buildids or other branches (e.g. public_test_realm)
// that appear elsewhere in the same dump.
function parsePublicBuildId(appInfoOutput) {
	const branchesIdx = appInfoOutput.indexOf('"branches"');
	if (branchesIdx === -1) return null;

	const publicIdx = appInfoOutput.indexOf('"public"', branchesIdx);
	if (publicIdx === -1) return null;

	const match = appInfoOutput
		.slice(publicIdx)
		.match(/"buildid"\s+"(\d+)"/);
	return match ? match[1] : null;
}

// Checks every distinct {appId, steamCmdPath} pair among the given servers
// and returns entries whose remote buildid differs from the last one we
// recorded. Does NOT persist the new buildid — the caller marks it seen
// only once it has successfully acted on the change (see markBuildIdSeen),
// so a mid-countdown restart just means the next check retries cleanly
// instead of silently losing the update.
export async function checkForUpdates(servers) {
	const known = await loadKnownBuildIds();
	const seenAppIds = new Set();
	const changes = [];

	for (const server of servers) {
		if (!server.updateAppId || !server.steamCmdPath) continue;
		if (seenAppIds.has(server.updateAppId)) continue;
		seenAppIds.add(server.updateAppId);

		try {
			const output = await getRemoteBuildId(
				resolveSteamCmdFor(server.steamCmdPath),
				server.updateAppId,
			);
			const buildId = parsePublicBuildId(output);
			if (!buildId) {
				console.warn(
					`[build-tracker] Could not parse buildid for appId ${server.updateAppId} (${server.name})`,
				);
				continue;
			}

			const oldBuildId = known[server.updateAppId] ?? null;
			if (oldBuildId === null) {
				// First time we've ever checked this appId — seed a baseline
				// instead of reporting it as a change (otherwise every server
				// would "update" the moment this feature is turned on).
				await markBuildIdSeen(server.updateAppId, buildId);
			} else if (oldBuildId !== buildId) {
				changes.push({ appId: server.updateAppId, oldBuildId, newBuildId: buildId });
			}
		} catch (e) {
			console.warn(
				`[build-tracker] Failed checking appId ${server.updateAppId} (${server.name}): ${e.message}`,
			);
		}
	}

	return changes;
}

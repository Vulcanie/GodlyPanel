import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";
import { getSecrets, patchSecrets } from "../config/secretsStore.js";
import { portBusy } from "../util/portProbe.js";
import { logActivity } from "./activityLog.js";
import { dropClientsWhere } from "./sseHub.js";
import { startListener, stopListener, listenerPort } from "./communityListener.js";
import { findCloudflared, installCloudflared, isInstalling, detectExistingTunnel, otherConnectors, startTunnel, stopTunnel, tunnelState, validHostname } from "./cloudflared.js";

// The community view: guests outside the house open the panel's guest page at a public address.
// This ties together the small listener (communityListener.js) and the tunnel program that
// publishes it (cloudflared.js), and remembers the owner's choices. Off until the owner sets it up.

const FILE = path.join(paths.dataDir, "state", "community-view.json");
const enqueue = createWriteQueue();
const DEFAULT_PORT = 8766;

const EMPTY = {
	enabled: false,
	mode: "quick", // quick | token | existing
	hostname: "", // the public name, for token and existing tunnels
	port: DEFAULT_PORT, // where the small listener listens on this PC
	existing: null, // { tunnel, credentialsFile } for mode "existing"
	// Whether administrators and moderators may sign in at the public address too. Off until the owner
	// chooses: it puts the whole panel, not just the guest page, within reach of the internet.
	staffSignIn: false,
};
let state = { ...EMPTY };
let lastError = null;
let installLog = [];
let installJob = null;

export async function initCommunityView() {
	state = { ...EMPTY, ...((await readJson(FILE, null)) ?? {}) };
}

const persist = () => writeJsonAtomic(FILE, state);

// What the listener accepts as its own name.
const hostRule = () => {
	if (state.mode === "quick") return { suffix: ".trycloudflare.com" };
	return { exact: state.hostname };
};

/** The address people use, once there is one. */
function publicUrl(tunnel) {
	if (state.mode === "quick") return tunnel.url ? `${tunnel.url}/` : null;
	return state.hostname ? `https://${state.hostname}/` : null;
}

/** What the settings screen shows. Never includes the token. */
export async function communityStatus() {
	const tunnel = tunnelState();
	const found = findCloudflared();
	const existing = detectExistingTunnel();
	const others = state.enabled ? await otherConnectors(tunnel.pid) : [];
	const warnings = [];
	// Two programs serving one tunnel share its visitors between them, so half would land on the wrong one.
	if (state.enabled && state.mode === "existing" && state.existing && others.some((o) => o.command.includes(state.existing.tunnel))) {
		warnings.push({ code: "other-connector", message: `Another cloudflared on this PC is also running the tunnel "${state.existing.tunnel}" (started outside the panel). Stop it, or about half of your visitors will reach it instead of this panel.` });
	}
	return {
		enabled: state.enabled,
		mode: state.mode,
		hostname: state.hostname,
		port: state.port,
		existing: state.existing,
		staffSignIn: state.staffSignIn === true,
		tokenSaved: Boolean(getSecrets().cloudflareTunnelToken),
		cloudflared: { found: Boolean(found), source: found?.source ?? null, installing: isInstalling(), installLog: installLog.slice(-12), installError: installJob?.error ?? null },
		detectedTunnel: existing,
		listener: { running: listenerPort() !== null, port: listenerPort() },
		tunnel,
		publicUrl: state.enabled ? publicUrl(tunnel) : null,
		error: lastError,
		warnings,
	};
}

/** Download cloudflared (the owner has agreed to this in the interface). */
export function downloadCloudflared() {
	if (findCloudflared()) return Promise.resolve();
	installLog = [];
	installJob = { error: null };
	return installCloudflared((m) => installLog.push(m)).catch((err) => {
		installJob = { error: err.message };
		installLog.push(`Failed: ${err.message}`);
		throw err;
	});
}

async function pickPort(wanted) {
	if (Number.isInteger(wanted) && wanted >= 1024 && wanted <= 65535) return wanted;
	return DEFAULT_PORT;
}

/** Change the choices; the view is restarted if it is on. */
export function saveCommunitySettings(patch) {
	return enqueue(async () => {
		const next = { ...state };
		if (patch.mode !== undefined) {
			if (!["quick", "token", "existing"].includes(patch.mode)) throw new Error("Choose a temporary link, a tunnel token or an existing tunnel.");
			next.mode = patch.mode;
		}
		if (patch.hostname !== undefined) {
			const h = String(patch.hostname).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
			if (h !== "" && !validHostname(h)) throw new Error("That isn't a valid web address (use a name such as panel.example.com).");
			next.hostname = h;
		}
		if (patch.port !== undefined) {
			if (!Number.isInteger(patch.port) || patch.port < 1024 || patch.port > 65535) throw new Error("Choose a port from 1024 to 65535.");
			next.port = patch.port;
		}
		if (patch.existing !== undefined) {
			if (patch.existing === null) next.existing = null;
			else {
				const found = detectExistingTunnel();
				if (!found || found.tunnel !== patch.existing.tunnel) throw new Error("That tunnel wasn't found on this PC.");
				if (!found.credentialsFound) throw new Error("That tunnel's credentials file is missing, so it can't be run from here.");
				next.existing = { tunnel: found.tunnel, credentialsFile: found.credentialsFile };
			}
		}
		let staffChanged = null;
		if (patch.staffSignIn !== undefined) {
			if (typeof patch.staffSignIn !== "boolean") throw new Error("Staff sign-in must be on or off.");
			if (patch.staffSignIn !== (state.staffSignIn === true)) staffChanged = patch.staffSignIn;
			next.staffSignIn = patch.staffSignIn;
		}
		if (typeof patch.token === "string" && patch.token.trim()) {
			const token = patch.token.trim();
			if (!/^[A-Za-z0-9+/=_-]{40,}$/.test(token)) throw new Error("That doesn't look like a tunnel token. Copy it whole from the Cloudflare dashboard.");
			await patchSecrets({ cloudflareTunnelToken: token });
		}
		if (patch.clearToken === true) await patchSecrets({ cloudflareTunnelToken: "" });
		state = next;
		await persist();
		if (staffChanged !== null) {
			// Anyone already signed in as staff at the public address is let go at once; their live streams
			// would otherwise keep running until they next reloaded.
			if (!staffChanged) dropClientsWhere((c) => c.group === "community" && c.role !== "guest");
			logActivity({ type: staffChanged ? "community.staff-on" : "community.staff-off", level: staffChanged ? "warn" : "info", message: staffChanged ? "Administrators and moderators can now sign in at the public address." : "Administrators and moderators can no longer sign in at the public address." });
		}
		if (state.enabled) await applyState();
		return communityStatus();
	});
}

/** Turn the community view on or off. */
export function setCommunityEnabled(enabled) {
	return enqueue(async () => {
		if (enabled) assertReady();
		state.enabled = Boolean(enabled);
		await persist();
		try {
			await applyState();
		} catch (err) {
			// It didn't start, so it isn't on: don't leave it asking to start again at every launch.
			state.enabled = false;
			await persist();
			throw err;
		}
		logActivity({ type: enabled ? "community.on" : "community.off", message: enabled ? "The community view was switched on." : "The community view was switched off." });
		return communityStatus();
	});
}

function assertReady() {
	if (!findCloudflared()) throw new Error("cloudflared isn't installed yet. Download it first.");
	if (state.mode === "token" && !getSecrets().cloudflareTunnelToken) throw new Error("Paste the tunnel token first.");
	if (state.mode === "existing" && !state.existing) throw new Error("Choose which existing tunnel to use.");
	if (state.mode !== "quick" && !state.hostname) throw new Error("Enter the public address this tunnel serves.");
}

async function applyState() {
	lastError = null;
	if (!state.enabled) {
		await stopTunnel();
		await stopListener();
		return;
	}
	try {
		assertReady();
		const port = await pickPort(state.port);
		if (listenerPort() !== null && listenerPort() !== port) await stopListener();
		if (listenerPort() === null) {
			if (await portBusy(port)) throw new Error(`Port ${port} is in use by something else. Choose another port for the community view.`);
			await startListener({ port, hostRule, staffSignIn: () => state.staffSignIn === true });
		}
		await startTunnel({ mode: state.mode, port, token: getSecrets().cloudflareTunnelToken, existing: state.existing, hostname: state.hostname });
	} catch (err) {
		lastError = err.message;
		await stopTunnel();
		await stopListener();
		throw err;
	}
}

/** At start-up: bring it back if it was on. A problem is kept for the settings screen rather than stopping the panel. */
export async function resumeCommunityView() {
	if (!state.enabled) return;
	try {
		await applyState();
		console.log("[community] The community view is on.");
	} catch (err) {
		console.warn(`[community] Couldn't start the community view: ${err.message}`);
	}
}

export async function stopCommunityView() {
	await stopTunnel();
	await stopListener();
}

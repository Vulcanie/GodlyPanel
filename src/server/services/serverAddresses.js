import { all as allServers, update as updateServer } from "../data/serverStore.js";
import { getConfig } from "../config/configStore.js";
import { logActivity } from "./activityLog.js";

// The address shown for joining a server is the PC's public address (a setting) and the server's game port, worked out when it is
// shown, so it can't go out of date when a port changes. Servers used to carry a copy of an "ip:port" typed in by hand (in their
// join address, or inside their session name), which nothing updated. Once the public address is set, those copies are removed.

/** "203.0.113.9:7777" for a server with a game port, when the public address is set; otherwise whatever the server carries. */
export function joinAddressFor(server, port, publicAddress = getConfig().network.publicAddress) {
	if (publicAddress && Number.isInteger(port)) return `${publicAddress}:${port}`;
	return server.joinAddress;
}

// An IPv4 address or a dotted name, then a port: "50.82.40.142:25569", "play.example.com:7777".
const ADDRESS = String.raw`(?:\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+):\d{1,5}`;
const WHOLE = new RegExp(`^\\s*${ADDRESS}\\s*$`);
const EMBEDDED = new RegExp(String.raw`\s*\(?\s*${ADDRESS}\s*\)?`, "g");

/**
 * A session name without an address typed into it: "GodlyHeroes( 50.82.40.142:7777 )" is "GodlyHeroes", and a session name that
 * is only an address is nothing. Null when there was no address to take out.
 */
export function withoutAddress(sessionName) {
	if (typeof sessionName !== "string") return null;
	if (WHOLE.test(sessionName)) return "";
	const cleaned = sessionName.replace(EMBEDDED, "").trim();
	return cleaned !== sessionName.trim() ? cleaned : null;
}

/**
 * Remove the hand-typed addresses from every server's stored session name and join address. Does nothing until the public address
 * is set, since until then the stored text is the only address there is. Safe to run again.
 * @returns {Promise<string[]>}  the servers that were changed
 */
export async function tidyStoredAddresses() {
	if (!getConfig().network.publicAddress) return [];
	const changed = [];
	for (const server of allServers()) {
		const patch = {};
		const session = withoutAddress(server.sessionName);
		if (session !== null) patch.sessionName = session;
		if (typeof server.joinAddress === "string" && WHOLE.test(server.joinAddress)) patch.joinAddress = "";
		if (Object.keys(patch).length === 0) continue;
		await updateServer(server.name, patch);
		changed.push(server.name);
	}
	if (changed.length > 0) {
		logActivity({
			type: "server.addresses_updated",
			message: `Addresses now follow the public address (${getConfig().network.publicAddress}) and each server's game port: updated ${changed.join(", ")}.`,
			data: { servers: changed },
		});
	}
	return changed;
}

// Decisions for the mods panel's "Share with players" section: whether the link is usable, the three addresses players get, and the
// addresses the admin downloads from. Kept out of the component so they can be tested without a render setup. Every function accepts
// bad input without throwing, since the data comes from the server and the community view, and either can be missing fields.

const PACK_PREFIX = "/api/pack/";
const FILES = { manifest: "manifest.json", zip: "mod-pack.zip", list: "mod-list.txt" };

/**
 * The state of the share link and, when it is ready, the three player addresses.
 * "off": nothing is shared. "no_address": it is shared, but players have no address they can reach (the community view is off).
 */
export function packLinks(share, community) {
	if (!share || typeof share !== "object" || share.enabled !== true) return { state: "off" };
	// A path that is not in the expected shape would build broken links, so it counts as not shared.
	const path = share.path;
	if (typeof path !== "string" || !path.startsWith(PACK_PREFIX) || !path.endsWith("/")) return { state: "off" };

	// Players can only reach the pack through the community view's public address, so that has to be on and a real web address.
	const enabled = Boolean(community) && typeof community === "object" && community.enabled === true;
	const origin = enabled && typeof community.publicUrl === "string" ? community.publicUrl.replace(/\/+$/, "") : "";
	if (!/^https?:\/\/[^/]/i.test(origin)) return { state: "no_address" };

	return {
		state: "ready",
		links: {
			manifest: origin + path + FILES.manifest,
			zip: origin + path + FILES.zip,
			list: origin + path + FILES.list,
		},
	};
}

/** The admin's download addresses for the server's pack. They use the panel's own login cookie, so a plain link works. */
export function adminPackDownloads(serverName) {
	const base = `/api/server/${encodeURIComponent(typeof serverName === "string" ? serverName : "")}/mods`;
	return {
		zip: `${base}/client-pack?format=zip`,
		list: `${base}/client-pack?format=list`,
		manifest: `${base}/manifest`,
	};
}

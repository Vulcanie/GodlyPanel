import { ModError } from "../modService.js";
import { detectSource } from "./index.js";

// A direct link to a file (a .zip, .jar and so on). The address is checked here, the same way a pasted one is checked when it's
// read; the download itself goes through the guarded fetch, which refuses a redirect to any other host.
//
// This file imports index.js, and index.js registers this provider. So index.js has to be the one that loads first: import the
// registry, not this file, in anything new, or the registration runs before this provider exists.

// The file name a link gives, decoded, or "download" when it has none. installUpload checks the name before anything is written.
function fileNameOf(link) {
	const last = new URL(link).pathname.split("/").filter(Boolean).pop() ?? "";
	try {
		return decodeURIComponent(last) || "download";
	} catch {
		return "download";
	}
}

export const urlProvider = {
	id: "url",
	label: "Direct link",
	// Empty here on purpose: the list of hosts depends on the link, so hostsFor gives it.
	hosts: [],

	async resolve(ref, ctx = {}) {
		// Pasting a link is not a yes to downloading from it. The person has to confirm the address first.
		if (ctx.trusted !== true) throw new ModError("Confirm you trust this address before installing from it.", "untrusted_address", 400);
		const found = detectSource(ref);
		if (!found || found.source !== "url") throw new ModError("That isn't a direct download link the panel will use.", "bad_ref");
		const link = found.ref;
		const name = fileNameOf(link);
		// No checksum comes with a bare link, so the installer lists the file as unverified.
		return { source: "url", ref: link, name, version: "", side: "both", files: [{ url: link, name }], dependencies: [] };
	},

	// Only the link's own host may be asked, and a redirect to another host is refused. An address that doesn't read as a
	// direct link gets no hosts at all, so the guard refuses everything for it.
	hostsFor(ref) {
		const found = detectSource(ref);
		if (!found || found.source !== "url") return [];
		return [new URL(found.ref).hostname];
	},
};

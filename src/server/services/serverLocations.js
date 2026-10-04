import fs from "node:fs";
import path from "node:path";
import { all as allServers } from "../data/serverStore.js";
import { getConfig } from "../config/configStore.js";
import { getStorage, folderOf } from "./storageService.js";

// Where each server's files are right now. The "Server install folder" setting only says where servers created
// from now on will go; servers made earlier, or added by hand, can be anywhere. This reads each server's recorded
// folder and sets it beside the folder sizes the storage scan has already measured.

const norm = (p) => path.resolve(String(p)).replace(/[\\/]+$/, "");
const lower = (p) => norm(p).toLowerCase();
const within = (child, parent) => lower(child) === lower(parent) || lower(child).startsWith(lower(parent) + path.sep);

/**
 * @returns {{ newServersFolder: string, servers: Array<{
 *   name: string, type: string, folder: string|null, drive: string|null, exists: boolean, createdByPanel: boolean,
 *   inNewServersFolder: boolean, sharedWith: string[],
 *   bytes: number|null, bytesScope: "folder"|"shared"|"larger"|null }> }}
 */
export function serverLocations() {
	const newServersFolder = getConfig().paths.serversRoot;
	const storage = getStorage();
	const measured = storage.roots ?? [];
	const own = storage.folders ?? [];
	const entries = allServers().map((server) => ({ server, folder: folderOf(server) }));

	const servers = entries.map(({ server, folder }) => {
		const base = { name: server.name, type: server.type, createdByPanel: server.source === "created" };
		if (!folder) return { ...base, folder: null, drive: null, exists: false, inNewServersFolder: false, sharedWith: [], bytes: null, bytesScope: null };

		const sharedWith = entries.filter((other) => other.server.name !== server.name && other.folder && lower(other.folder) === lower(folder)).map((other) => other.server.name);
		// The storage scan measures each distinct folder once (servers sharing an install are one folder), and the
		// smallest measured folder that holds this one is the figure that belongs to it.
		// A figure measured for this very folder wins; otherwise the smallest measured folder that holds it.
		const holding = own.find((f) => f.path && lower(f.path) === lower(folder)) ?? measured.filter((root) => root.path && within(folder, root.path)).sort((a, b) => b.path.length - a.path.length)[0];
		let bytesScope = null;
		if (holding) bytesScope = sharedWith.length > 0 ? "shared" : lower(holding.path) === lower(folder) ? "folder" : "larger";

		return {
			...base,
			folder,
			drive: path.parse(folder).root || null,
			exists: fs.existsSync(folder),
			inNewServersFolder: within(folder, newServersFolder),
			sharedWith,
			bytes: holding ? holding.bytes : null,
			bytesScope,
		};
	});

	servers.sort((a, b) => (a.folder ?? "").toLowerCase().localeCompare((b.folder ?? "").toLowerCase()) || a.name.localeCompare(b.name));
	return { newServersFolder, servers };
}

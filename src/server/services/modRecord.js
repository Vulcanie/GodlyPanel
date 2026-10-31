import { removeMod } from "./modService.js";
import * as modLock from "./modLock.js";

// Writes the mod lock for what one install put in the mods folder. Lives apart from the routes so the update path can use it too.

/**
 * Records each mod an install put in the folder, in the lock. A mod whose record can't be written takes back everything this install
 * put there, and the records already written: a mod the panel can't account for is worse than none.
 *
 * A dependency that was already in the folder is reported as skipped with the mod that needed it. Its record gains that mod as a
 * parent, so a dependency two mods share keeps both and is not later called an orphan.
 */
export async function recordInstalled(server, dir, result) {
	const earlier = new Map((await modLock.read(server.name)).mods.map((m) => [m.id, m]));
	const touched = new Map(); // id -> the entry it replaced, or null when it was new
	const remember = (id) => {
		if (!touched.has(id)) touched.set(id, earlier.get(id) ?? null);
	};
	try {
		for (const mod of result.mods) {
			// A mod whose names are not in the folder (a Thunderstore package is installed under its own name, not this one) has nothing to keep.
			const names = await modLock.presentNames(dir, mod.installed);
			if (names.length === 0) continue;
			const id = modLock.idOf(mod.source, mod.ref);
			remember(id);
			// A mod asked for directly is no one's dependency. A dependency keeps every parent it has been installed for.
			const parents = new Set(mod.dependencyOf ? [...(earlier.get(id)?.dependencyOf ?? []), modLock.idOfKey(mod.dependencyOf)] : []);
			await modLock.add(server.name, {
				id,
				source: mod.source,
				ref: mod.ref,
				version: mod.version ?? "",
				side: mod.side,
				names,
				files: await modLock.hashEntry(dir, names),
				dependencyOf: [...parents],
				installedAt: new Date().toISOString(),
			});
		}
		for (const skip of result.skipped ?? []) {
			if (skip.reason !== "already_installed" || typeof skip.dependencyOf !== "string") continue;
			const id = modLock.idOf(skip.source, skip.ref);
			// Only a dependency the record already knows gets a new parent. One it doesn't know is not ours to record.
			const current = (await modLock.read(server.name)).mods.find((m) => m.id === id);
			if (!current) continue;
			const parent = modLock.idOfKey(skip.dependencyOf);
			if (current.dependencyOf.includes(parent)) continue;
			remember(id);
			await modLock.add(server.name, { ...current, dependencyOf: [...current.dependencyOf, parent] });
		}
	} catch (err) {
		for (const [id, was] of touched) {
			if (was) await modLock.add(server.name, was).catch(() => {});
			else await modLock.remove(server.name, id).catch(() => {});
		}
		for (const name of [...result.installed].reverse()) await removeMod(server, name).catch(() => {});
		throw err;
	}
}

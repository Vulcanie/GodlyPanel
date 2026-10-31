import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ModError, installUpload, removeMod } from "../modService.js";
import { downloadVerified } from "../../util/downloadVerified.js";
import { getProvider } from "./index.js";
import { guardedFetch } from "./netGuard.js";

// Installs a mod from any source: its required dependencies first, then each of its files, each one downloaded through the guard
// and checked against its checksum before it is handed to installUpload. Anything that fails takes back what this call installed,
// so a half-installed mod is never left behind.

const MAX_DEPTH = 6;
// Counts the mod itself too: a mod and up to 24 of its dependencies.
const MAX_MODS = 25;
const MAX_FILES = 8;
const MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;

async function installFile(server, provider, hosts, file, index, ctx, state) {
	const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "gp-modsrc-"));
	try {
		const dest = path.join(dir, `${index}.bin`);
		const sha512 = file.sha512 ?? null;
		const sha256 = file.sha256 ?? null;
		const sha1 = file.sha1 ?? null;
		await downloadVerified({
			url: file.url,
			dest,
			sha512,
			sha256,
			sha1,
			size: file.size ?? null,
			maxBytes: ctx.maxBytes ?? MAX_DOWNLOAD_BYTES,
			checksumSource: `${provider.label} listing`,
			fetchImpl: guardedFetch({ hosts, fetchImpl: ctx.fetchImpl ?? fetch }),
		});
		// A file with no checksum can't be checked, so the caller is told it is unverified.
		if (!sha512 && !sha256 && !sha1) state.unverified.push(file.name);
		// The name is only ever used here, where installUpload checks it. The URL was used only by the guarded download.
		const { installed } = await installUpload(server, file.name, dest);
		state.installed.push(...installed);
	} finally {
		await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
	}
}

// parentKey is the "source:ref" of the mod that asked for this one, or null for the mod that was asked for.
async function installOne(server, source, ref, ctx, state, depth, parentKey = null) {
	const provider = getProvider(source);
	if (!provider) throw new ModError("Unknown mod source.", "bad_source");
	// A mod that is already in this install is skipped, so a cycle of dependencies ends.
	const key = `${source}:${ref}`;
	if (state.seen.has(key)) return;
	state.seen.add(key);
	if (depth > MAX_DEPTH || state.seen.size > MAX_MODS) throw new ModError("This mod pulls in too many other mods.", "too_many_dependencies");

	// A provider that installs for itself (Steam Workshop, Thunderstore) is asked to do so, and it has no dependencies of its own here.
	if (provider.install) {
		const result = await provider.install(server, ref, ctx);
		state.installed.push(...result.installed);
		state.mods.push({ source, ref, name: ref, version: null, side: "both", installed: [...result.installed], dependencyOf: parentKey });
		return;
	}

	const resolved = await provider.resolve(ref, ctx);
	// A mod for players only is for the player's game, not the server. Asked for directly it is refused. As a dependency it is skipped
	// along with its own dependencies, which were only wanted for it.
	if (resolved.side === "client") {
		if (depth === 0) throw new ModError("This mod is for players only, so it isn't installed on the server.", "client_only", 409);
		state.skipped.push({ source, ref, reason: "client_only" });
		return;
	}

	for (const dep of resolved.dependencies ?? []) {
		await installOne(server, dep.source, dep.ref, ctx, state, depth + 1, key);
	}

	const files = Array.isArray(resolved.files) ? resolved.files : [];
	if (files.length > MAX_FILES) throw new ModError("This mod has too many files.", "too_many_files");
	const hosts = provider.hostsFor ? provider.hostsFor(ref) : provider.hosts;
	// Dependencies are installed before this mod's own files, so the names from here on are this mod's alone.
	const startAt = state.installed.length;
	for (const [index, file] of files.entries()) {
		await installFile(server, provider, hosts, file, index, ctx, state);
	}
	state.mods.push({
		source,
		ref,
		name: resolved.name ?? ref,
		version: resolved.version ?? null,
		side: resolved.side ?? "both",
		installed: state.installed.slice(startAt),
		dependencyOf: parentKey,
	});
}

/**
 * Install a mod from a source.
 * @returns {Promise<{ installed: string[], unverified: string[], mods: object[], skipped: object[] }>}
 *   mods: one entry per mod installed, dependencies first, with the names it put in the mods folder and the parent it was installed for.
 *   skipped: dependencies left out (for players only), with the reason.
 */
export async function installFromSource(server, source, ref, ctx = {}) {
	const provider = getProvider(source);
	if (!provider) throw new ModError("Unknown mod source.", "bad_source");
	if (provider.install) {
		const result = await provider.install(server, ref, ctx);
		return {
			...result,
			unverified: [],
			mods: [{ source, ref, name: ref, version: null, side: "both", installed: [...result.installed], dependencyOf: null }],
			skipped: [],
		};
	}

	const state = { seen: new Set(), installed: [], unverified: [], mods: [], skipped: [] };
	try {
		await installOne(server, source, ref, ctx, state, 0);
	} catch (err) {
		// Newest first. Each name is one this call installed, so only those are taken back out.
		for (const name of state.installed.reverse()) await removeMod(server, name).catch(() => {});
		throw err;
	}
	return { installed: state.installed, unverified: state.unverified, mods: state.mods, skipped: state.skipped };
}

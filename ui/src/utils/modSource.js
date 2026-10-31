// Decisions for the mods panel's pasted-address box, updates and drift notices. Kept out of the components so they can be tested
// without a render setup: the components only draw what these return, and every function here accepts bad input without throwing,
// since the data comes from the server and an older server may leave fields out.

const ASSET_LIMIT = 25;
const NAME_LIMIT = 5;
const NOTHING_NEW = "Nothing new was installed.";

const textOnly = (list) => (Array.isArray(list) ? list.filter((item) => typeof item === "string") : []);

/** What an install says: the names it added, and a warning for each thing the person should know about. */
export function describeInstall(result) {
	const installed = textOnly(result?.installed);
	const warnings = [];
	for (const name of textOnly(result?.unverified)) {
		warnings.push(`${name} had no checksum to check it against.`);
	}
	const skipped = Array.isArray(result?.skipped) ? result.skipped : [];
	for (const entry of skipped) {
		if (!entry || typeof entry !== "object") continue;
		// A skip with no ref has nothing to name, so the line falls back to a generic word rather than "undefined".
		const ref = typeof entry.ref === "string" && entry.ref !== "" ? entry.ref : "A mod";
		if (entry.reason === "client_only") warnings.push(`${ref} is for players only, so it was left out.`);
		else if (entry.reason === "already_installed") warnings.push(`${ref} was already installed, so it was left as it is.`);
		else warnings.push(`${ref} was skipped.`);
	}
	return {
		message: installed.length > 0 ? `Installed: ${installed.join(", ")}` : NOTHING_NEW,
		warnings,
	};
}

/**
 * What the box should do with a failed install. A trust error asks for a tick, a choose error lists the files to pick from (only text
 * names, at most 25, so a long list cannot flood the page), and anything else is just shown as its message.
 */
export function installErrorAction(err) {
	const message = typeof err?.message === "string" && err.message !== "" ? err.message : "Something went wrong.";
	if (err?.code === "untrusted_address") return { kind: "trust", message };
	if (err?.code === "choose_asset") {
		const assets = textOnly(err.details?.assets).slice(0, ASSET_LIMIT);
		if (assets.length > 0) return { kind: "choose", message, assets };
	}
	return { kind: "message", message };
}

/** The rows that have a newer version, in the order the server sent them. Manual, current and failed rows are left out. */
export function pendingUpdates(updates) {
	if (!Array.isArray(updates)) return [];
	return updates.filter((entry) => entry?.status === "update");
}

/** The text for one row of the updates list. */
export function updateLabel(entry) {
	if (!entry) return "";
	if (entry.status === "update") return `${entry.current} -> ${entry.latest}`;
	if (entry.status === "current") return "Up to date";
	if (entry.status === "manual") return "Check this one by hand";
	if (entry.status === "error") {
		const reason = entry.error?.message;
		return typeof reason === "string" && reason !== "" ? `Couldn't check: ${reason}` : "Couldn't check";
	}
	return "";
}

// A long list of names would push the notice off the panel, so only the first few are written out.
function listOf(names) {
	const shown = names.slice(0, NAME_LIMIT).join(", ");
	return names.length > NAME_LIMIT ? `${shown}, and ${names.length - NAME_LIMIT} more` : shown;
}

/**
 * Warnings about the mods folder not matching what the panel recorded. Changed or missing files are warnings; files the panel did not
 * install, and mods left behind by something removed, are only notes. Orphans are named by their lock name where the lock has it.
 */
export function driftNotices(lock) {
	if (!lock || typeof lock !== "object") return [];
	const drift = lock.drift && typeof lock.drift === "object" ? lock.drift : {};
	const notices = [];
	const changed = textOnly(drift.changed);
	if (changed.length > 0) {
		notices.push({ severity: "warning", text: `${changed.length} mod file(s) were changed outside the panel: ${listOf(changed)}` });
	}
	const missing = textOnly(drift.missing);
	if (missing.length > 0) {
		notices.push({ severity: "warning", text: `${missing.length} mod file(s) are missing: ${listOf(missing)}` });
	}
	const untracked = textOnly(drift.untracked);
	if (untracked.length > 0) {
		notices.push({ severity: "info", text: `${untracked.length} file(s) in the mods folder weren't installed by the panel: ${listOf(untracked)}` });
	}
	const entries = Array.isArray(lock.entries) ? lock.entries : [];
	const orphanNames = textOnly(lock.orphans).map((id) => {
		const entry = entries.find((e) => e?.id === id);
		return textOnly(entry?.names)[0] ?? id;
	});
	if (orphanNames.length > 0) {
		notices.push({ severity: "info", text: `${orphanNames.length} mod(s) were installed only for something that was removed: ${listOf(orphanNames)}` });
	}
	return notices;
}

/** Whether the paste box is shown: the game has to be supported and take mods from at least one kind of address. */
export function canUseAddress(data) {
	return Boolean(data?.supported) && Array.isArray(data.sources) && data.sources.length > 0;
}

/**
 * The lock entry that holds a mod's name, so a row can show its version. A turned-off mod's name ends in ".disabled", which is removed
 * first. Names are compared without case. Null when nothing matches.
 */
export function lockEntryForMod(modName, entries) {
	if (typeof modName !== "string" || !Array.isArray(entries)) return null;
	const wanted = modName.replace(/\.disabled$/i, "").toLowerCase();
	return entries.find((entry) => textOnly(entry?.names).some((name) => name.toLowerCase() === wanted)) ?? null;
}

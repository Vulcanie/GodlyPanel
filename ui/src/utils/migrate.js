// Decisions for the bundle cards: "Move to another PC" (export) and "Import a server file". Which export choices to offer, what
// the working text says, the sentences the person reads about passwords and results, and the checks on an import's plan and
// ports. Kept out of the components so they can be tested without a render setup. Every function accepts bad input without
// throwing, since the job and plan data come from the server and the live stream.

import { formatBytes } from "./format";

export const EXPORT_CHOICES = [
	{
		value: "saves",
		label: "Saves and settings (small)",
		hint: "The world, settings, mods and schedules. The game itself is downloaded again on the new PC.",
	},
	{
		value: "all",
		label: "Everything (large)",
		hint: "The whole server folder, game files included. Works with any game.",
	},
];

// The phases the server reports while it works, in the words the person sees. A phase we don't know yet gets the generic text.
const PHASE_TEXT = {
	measuring: "Measuring the server…",
	copying: "Copying the files…",
	archiving: "Packing the bundle…",
	done: "Finishing…",
};

/** The choices the card can offer. A server with no known game-update id can't be cut down to saves, so only "everything" is left. */
export function exportChoicesFor(canSaves) {
	return canSaves === false ? EXPORT_CHOICES.filter((c) => c.value === "all") : EXPORT_CHOICES;
}

/** True while the export is still running. A missing job is not working. */
export function isWorking(job) {
	return Boolean(job) && job.status === "exporting";
}

/** What the card says while an export runs. Falls back to a generic line when the phase is missing or unknown. */
export function phaseText(job) {
	const phase = job?.phase;
	return (typeof phase === "string" && Object.hasOwn(PHASE_TEXT, phase) ? PHASE_TEXT[phase] : null) ?? "Working…";
}

/** The one-line result of a finished export: where it stands when ready, the reason when it failed, and nothing otherwise. */
export function exportSummary(job) {
	if (!job) return "";
	if (job.status === "ready") return `${job.name} is ready (${formatBytes(job.bytes)}).`;
	if (job.status === "failed") return job.error ?? "";
	return "";
}

/** The address the card downloads the finished file from. The file can only be taken once. */
export function exportDownloadUrl(jobId) {
	return `/api/export-jobs/${encodeURIComponent(typeof jobId === "string" ? jobId : "")}/download`;
}

/** The warning under the passwords checkbox. Turning passwords on is the one choice that puts secrets in the file, so it says so. */
export function secretsWarning(secrets) {
	return secrets === true
		? "The file will contain this server's passwords in plain text. Keep it private and delete it after the move."
		: "Passwords are left out. New ones are made when the server is set up on the other PC. A password stored inside a save or mod file is not removed.";
}

/** Applies a live progress event to the job it belongs to. An event for another job is ignored. */
export function mergeEvent(job, e) {
	if (!job || !e || e.jobId !== job.id) return job;
	return { ...job, ...e };
}

// The note shown when a server file holds passwords. The card checks for this exact text to show it as a warning.
export const SECRETS_NOTE = "This file contains the old server's passwords.";

const isObject = (v) => Boolean(v) && typeof v === "object";
const isText = (v) => typeof v === "string" && v.trim() !== "";

/** One sentence about a server file: the game, what it holds, and its size. Empty when the plan is not usable. */
export function bundleSummary(plan) {
	if (!isObject(plan) || !isText(plan.gameName) || !isText(plan.sourceName)) return "";
	const what = plan.include === "saves" ? "saves and settings" : "the whole server";
	// formatBytes cannot show a size that is not a whole number of bytes, so those read as unknown.
	const size = Number.isSafeInteger(plan.bytes) && plan.bytes >= 0 ? plan.bytes : null;
	return `${plan.gameName} server "${plan.sourceName}", ${what}, ${formatBytes(size)}.`;
}

/** The notes under an import plan, in the order the person should read them. Each is a plain sentence. */
export function planNotes(plan) {
	if (!isObject(plan)) return [];
	const notes = [];
	if (plan.needsGameDownload === true) notes.push("The game is downloaded again after the import.");
	if (plan.nameTaken === true) notes.push(`You already have a server called "${plan.sourceName}", so the new one is named "${plan.name}". You can change it.`);
	if (plan.secretsIncluded === true) notes.push(SECRETS_NOTE);
	if (Array.isArray(plan.portConflicts)) {
		for (const c of plan.portConflicts) {
			if (!isObject(c)) continue;
			// The plan already holds the replacement port, so the note says which one was picked.
			const picked = isObject(plan.ports) ? plan.ports[c.key] : undefined;
			const tail = Number.isInteger(picked) ? `picked ${picked} instead` : "picked a different port";
			notes.push(`The old PC used port ${c.port} for ${c.key}, but ${c.owner} uses it here, so the panel ${tail}.`);
		}
	}
	if (Array.isArray(plan.warnings)) {
		for (const w of plan.warnings) if (isText(w)) notes.push(w.trim());
	}
	return notes;
}

/** Problems with the ports the person is about to import with: a value that is not a port number, or two ports on one number. */
export function portProblems(ports) {
	if (!isObject(ports)) return [];
	const problems = [];
	// Maps each port number already seen to the key that uses it, so a clash can name both.
	const owners = new Map();
	for (const key of Object.keys(ports)) {
		const n = ports[key];
		if (!Number.isInteger(n) || n < 1 || n > 65535) {
			problems.push(`${key} must be a whole number from 1 to 65535.`);
		} else if (owners.has(n)) {
			problems.push(`${key} and ${owners.get(n)} cannot use the same port (${n}).`);
		} else {
			owners.set(n, key);
		}
	}
	return problems;
}

const IMPORT_ERROR_TEXT = {
	name_taken: "A server with that name already exists. Pick another name.",
	disk_full: "There is not enough free space for this server.",
	import_busy: "Another import is running. Wait for it to finish.",
	no_such_upload: "The uploaded file is gone. Choose it again.",
	not_a_bundle: "That is not a GodlyPanel server file.",
	bad_file: "That is not a GodlyPanel server file.",
	newer_bundle: "That file was made by a newer GodlyPanel. Update this one first.",
	unsafe_bundle: "That file was refused because it is not safe to open.",
};

/** The words the person sees for an import error code. Codes we have no words for show the server's message. */
export function importErrorText(code, message) {
	if (typeof code === "string" && Object.hasOwn(IMPORT_ERROR_TEXT, code)) return IMPORT_ERROR_TEXT[code];
	return isText(message) ? message : "The import failed.";
}

const IMPORT_PHASE_TEXT = {
	checking: "Checking the file…",
	extracting: "Unpacking the files…",
	registering: "Setting up the server…",
	done: "Finishing…",
};

/** What the card says while an import runs. Falls back to a generic line when the phase is missing or unknown. */
export function importPhaseText(job) {
	const phase = job?.phase;
	return (typeof phase === "string" && Object.hasOwn(IMPORT_PHASE_TEXT, phase) ? IMPORT_PHASE_TEXT[phase] : null) ?? "Working…";
}

/** The one-line result of a finished import: the server's name when ready, the reason when it failed, and nothing otherwise. */
export function importSummary(job) {
	if (!isObject(job)) return "";
	if (job.status === "ready") {
		const server = isText(job.server) ? job.server : "The server";
		return job.installing ? `${server} was imported. The game is downloading now.` : `${server} was imported.`;
	}
	if (job.status === "failed") return importErrorText(job.code, job.error);
	return "";
}

/** True while the import is still running. A missing job is not importing. */
export function isImporting(job) {
	return isObject(job) && job.status === "importing";
}

/** Applies a live progress event to the import job it belongs to. An event for another job is ignored. */
export function mergeImportEvent(job, e) {
	if (!isObject(job) || !isObject(e) || e.jobId !== job.id) return job;
	return { ...job, ...e };
}

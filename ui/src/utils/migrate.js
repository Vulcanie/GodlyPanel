// Decisions for the "Move to another PC" card: which export choices to offer, what the working text says, and the sentences the
// person reads about passwords and the result. Kept out of the component so they can be tested without a render setup. Every
// function accepts bad input without throwing, since the job data comes from the server and the live stream.

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

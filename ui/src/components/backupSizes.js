// Pure helpers for the backups panel: how big a backup is compared with its original, which backups a recompress would rewrite, and
// turning the settings form into the body the server expects. Kept free of React so the rules can be tested on their own.
import { t } from "../i18n";

// Only the three formats the server writes. Own-property lookup, so a stray value such as "__proto__" gives null, not an object.
const FORMAT_NAMES = { zip: "ZIP", zstd: "ZSTD", xz: "XZ" };

/** Upper-case name of a backup format, for display. Unknown formats give null. */
export function formatName(format) {
	return Object.hasOwn(FORMAT_NAMES, format) ? FORMAT_NAMES[format] : null;
}

/** Short name shown as a chip on a backup row. */
export function formatLabel(backup) {
	return formatName(backup?.format);
}

/** Plain-words name of a compression level. Unknown levels give null. */
export function levelName(level) {
	if (level === "fast") return t("backups.level.fast");
	if (level === "balanced") return t("backups.level.balanced");
	if (level === "max") return t("backups.level.max");
	return null;
}

/** "41% of original" for a backup that knows how big it was before compressing. Older backups do not, so they get no text. */
export function ratioText(backup) {
	const before = backup?.bytesBefore;
	if (typeof before !== "number" || !(before > 0) || typeof backup.sizeBytes !== "number") return null;
	const percent = Math.round((backup.sizeBytes / before) * 100);
	return t("backups.ratio", { percent });
}

/**
 * Ids of the backups a recompress to `format` at `level` would rewrite: every backup that is not already in that format at that level.
 * A backup with no recorded level never counts as matching, so it is rewritten too.
 */
export function recompressTargets(backups, format, level) {
	return (backups ?? [])
		.filter((b) => !(b.format === format && b.level != null && b.level === level))
		.map((b) => b.id);
}

// Turns a form string into a whole number, or null for "follow the panel". A blank field is null, never 0. Text that is not a number is
// passed on as written, so the server refuses it with its own error instead of it quietly becoming "follow the panel".
function numberOrNull(value) {
	const text = String(value ?? "").trim();
	if (text === "") return null;
	const n = Number(text);
	return Number.isNaN(n) ? text : n;
}

/** Gigabytes typed in the form to bytes. 1.5 GB is 1610612736 bytes. Blank is null (no limit). */
export function bytesFromGB(gb) {
	const text = String(gb ?? "").trim();
	if (text === "") return null;
	const n = Number(text);
	return Number.isNaN(n) ? text : Math.round(n * 1024 ** 3);
}

/** Bytes to the text shown in the form: whole or two-decimal gigabytes with no trailing zeros. Null (no limit) is blank. */
export function limitGBFromBytes(bytes) {
	if (bytes == null) return "";
	return String(Math.round((Number(bytes) / 1024 ** 3) * 100) / 100);
}

/**
 * The override body for PUT .../backups/settings, from the settings form state. A blank field sends null, which means "follow the panel
 * setting", so clearing a box really clears the override.
 */
export function settingsBody(form) {
	const skip = form.skipUnchanged === "yes" ? true : form.skipUnchanged === "no" ? false : null;
	return {
		format: form.format || null,
		level: form.level || null,
		keepDaily: numberOrNull(form.keepDaily),
		keepWeekly: numberOrNull(form.keepWeekly),
		keepMonthly: numberOrNull(form.keepMonthly),
		keepManual: numberOrNull(form.keepManual),
		skipUnchanged: skip,
		maxTotalBytes: bytesFromGB(form.limitGB),
	};
}

/** The message to show for an error from the API. A bad size limit gets plain words; a refused budget already reads plainly. */
export function friendlyError(e) {
	if (e?.code === "bad_number" && /maxTotalBytes/.test(e.message ?? "")) return t("backups.error.limit");
	if (e?.code === "over_budget") return e.message;
	return e?.message;
}

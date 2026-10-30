// Pure helpers for the Game updates panel: how an update record reads on screen, when Rollback is offered, when the "update without a
// backup" question is asked, and the bodies sent to the server. Kept free of React so the rules can be tested on their own.
import { t } from "../i18n";

// Own-property lookup throughout, so a stray outcome such as "__proto__" or "constructor" gives the default, never an inherited value.
const OUTCOME_LABEL_KEYS = {
	updated: "update.outcome.updated",
	checking: "update.outcome.checking",
	ok: "update.outcome.ok",
	failed: "update.outcome.failed",
	rolled_back: "update.outcome.rolled_back",
};

const OUTCOME_COLORS = { ok: "success", failed: "error", checking: "warning", rolled_back: "info", updated: "default" };

/** Plain words for an update's outcome. Unknown or missing outcomes give null. */
export function outcomeLabel(outcome) {
	return Object.hasOwn(OUTCOME_LABEL_KEYS, outcome) ? t(OUTCOME_LABEL_KEYS[outcome]) : null;
}

/** The MUI chip colour for an update's outcome. Anything unknown gets the neutral colour. */
export function outcomeColor(outcome) {
	return Object.hasOwn(OUTCOME_COLORS, outcome) ? OUTCOME_COLORS[outcome] : "default";
}

/**
 * "4567 → 4890" for an update record. When the old build was not recorded, only the new one is shown. With no new build there is
 * nothing useful to say, so it gives null.
 */
export function buildChange(record) {
	const to = record?.toBuild;
	if (to == null || to === "") return null;
	const from = record?.fromBuild;
	if (from == null || from === "") return t("update.changeNow", { to });
	return t("update.change", { from, to });
}

/**
 * Why a rollback is not possible, in plain words, or null when one is available. The server writes the reason itself, so it is shown
 * as it comes. Missing rollback information says there is nothing to roll back.
 */
export function rollbackHint(rollback) {
	if (rollback?.available) return null;
	if (typeof rollback?.reason === "string" && rollback.reason !== "") return rollback.reason;
	return t("update.nothingToRollBack");
}

/** True only when the server refused an update because the backup before it failed. Every other error gets the normal message. */
export function needsBackupOverride(err) {
	return err?.code === "backup_failed";
}

/**
 * The body for an update that goes ahead without a backup. Only the literal true asks for that, so nothing is sent unless the user
 * has confirmed it. Anything else gives undefined, which sends no body.
 */
export function updateBody(proceedWithoutBackup) {
	return proceedWithoutBackup === true ? { proceedWithoutBackup: true } : undefined;
}

/** The body for a rollback. Only the literal true restarts the server afterwards; anything else leaves it stopped. */
export function rollbackBody(restart) {
	return { restart: restart === true };
}

/** Keep asking for the status while an update is still waiting to be seen to come back online. */
export function shouldPoll(latest) {
	return latest?.outcome === "checking";
}

import { describe, it, expect, beforeAll } from "vitest";
import { setLocale } from "../i18n/index.js";
import { outcomeLabel, outcomeColor, buildChange, rollbackHint, needsBackupOverride, updateBody, rollbackBody, shouldPoll } from "../components/updatePanel.js";

// The Game updates panel's rules: how an update record reads on screen, when Rollback is offered, when the "update without a backup"
// question is asked, and the exact bodies sent to the server. Only literal true turns a flag on, so nothing is sent by accident.

describe("updatePanel", () => {
	beforeAll(async () => {
		await setLocale("en");
	});

	describe("outcomeLabel", () => {
		it("gives plain words for each outcome", () => {
			expect(outcomeLabel("updated")).toBe("Updated");
			expect(outcomeLabel("checking")).toBe("Waiting for it to come back");
			expect(outcomeLabel("ok")).toBe("Came back online");
			expect(outcomeLabel("failed")).toBe("Did not come back");
			expect(outcomeLabel("rolled_back")).toBe("Rolled back");
		});

		it("gives null for an unknown or missing outcome", () => {
			expect(outcomeLabel("exploded")).toBeNull();
			expect(outcomeLabel(undefined)).toBeNull();
			expect(outcomeLabel(null)).toBeNull();
		});

		it("does not read inherited names, so __proto__ gives null", () => {
			expect(outcomeLabel("__proto__")).toBeNull();
			expect(outcomeLabel("constructor")).toBeNull();
		});
	});

	describe("outcomeColor", () => {
		it("maps each outcome to a chip colour", () => {
			expect(outcomeColor("ok")).toBe("success");
			expect(outcomeColor("failed")).toBe("error");
			expect(outcomeColor("checking")).toBe("warning");
			expect(outcomeColor("rolled_back")).toBe("info");
			expect(outcomeColor("updated")).toBe("default");
		});

		it("gives the default colour for an unknown or missing outcome", () => {
			expect(outcomeColor("exploded")).toBe("default");
			expect(outcomeColor(undefined)).toBe("default");
			expect(outcomeColor("__proto__")).toBe("default");
		});
	});

	describe("buildChange", () => {
		it("shows the old and new build with an arrow", () => {
			expect(buildChange({ fromBuild: "4567", toBuild: "4890" })).toBe("4567 → 4890");
		});

		it("says 'now' when only the new build is known", () => {
			expect(buildChange({ toBuild: "4890" })).toBe("now 4890");
			expect(buildChange({ fromBuild: null, toBuild: "4890" })).toBe("now 4890");
		});

		it("gives null when the new build is missing", () => {
			expect(buildChange({ fromBuild: "4567" })).toBeNull();
			expect(buildChange({})).toBeNull();
			expect(buildChange(undefined)).toBeNull();
		});
	});

	describe("rollbackHint", () => {
		it("gives null when a rollback is available", () => {
			expect(rollbackHint({ available: true, reason: null })).toBeNull();
		});

		it("gives the server's reason when a rollback is not available", () => {
			expect(rollbackHint({ available: false, reason: "No backup was taken before the last update." })).toBe("No backup was taken before the last update.");
		});

		it("says nothing to roll back when there is no rollback information", () => {
			expect(rollbackHint(undefined)).toBe("Nothing to roll back.");
			expect(rollbackHint({ available: false })).toBe("Nothing to roll back.");
		});
	});

	describe("needsBackupOverride", () => {
		it("is true only for the backup_failed code", () => {
			expect(needsBackupOverride({ code: "backup_failed", message: "Backup failed." })).toBe(true);
		});

		it("is false for any other error, or none", () => {
			expect(needsBackupOverride({ code: "server_running" })).toBe(false);
			expect(needsBackupOverride(new Error("boom"))).toBe(false);
			expect(needsBackupOverride(undefined)).toBe(false);
			expect(needsBackupOverride(null)).toBe(false);
		});
	});

	describe("updateBody", () => {
		it("asks to proceed without a backup only for the literal true", () => {
			expect(updateBody(true)).toEqual({ proceedWithoutBackup: true });
		});

		it("sends nothing for anything else", () => {
			expect(updateBody(false)).toBeUndefined();
			expect(updateBody(undefined)).toBeUndefined();
			expect(updateBody("true")).toBeUndefined();
			expect(updateBody(1)).toBeUndefined();
		});
	});

	describe("rollbackBody", () => {
		it("restarts only for the literal true", () => {
			expect(rollbackBody(true)).toEqual({ restart: true });
		});

		it("sends restart false for anything else", () => {
			expect(rollbackBody(false)).toEqual({ restart: false });
			expect(rollbackBody(undefined)).toEqual({ restart: false });
			expect(rollbackBody("true")).toEqual({ restart: false });
			expect(rollbackBody(1)).toEqual({ restart: false });
		});
	});

	describe("shouldPoll", () => {
		it("polls while the newest update is still checking", () => {
			expect(shouldPoll({ outcome: "checking" })).toBe(true);
		});

		it("stops polling once the outcome is known", () => {
			expect(shouldPoll({ outcome: "ok" })).toBe(false);
			expect(shouldPoll({ outcome: "failed" })).toBe(false);
		});

		it("does not poll when there is no update", () => {
			expect(shouldPoll(null)).toBe(false);
			expect(shouldPoll(undefined)).toBe(false);
			expect(shouldPoll({})).toBe(false);
		});
	});
});

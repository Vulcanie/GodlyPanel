import { describe, it, expect } from "vitest";
import { EXPORT_CHOICES, exportChoicesFor, isWorking, phaseText, exportSummary, exportDownloadUrl, secretsWarning, mergeEvent } from "./migrate.js";

// The "Move to another PC" card: which export choices it offers, the working and result text, the password warning, and how live
// progress is applied. The card only draws what these return, so they must accept whatever the server sends, without throwing.

describe("migrate", () => {
	describe("EXPORT_CHOICES", () => {
		it("offers saves first, then everything", () => {
			expect(EXPORT_CHOICES.map((c) => c.value)).toEqual(["saves", "all"]);
			expect(EXPORT_CHOICES[0].label).toBe("Saves and settings (small)");
			expect(EXPORT_CHOICES[1].label).toBe("Everything (large)");
		});
	});

	describe("exportChoicesFor", () => {
		it("offers both choices when saves are supported", () => {
			expect(exportChoicesFor(true).map((c) => c.value)).toEqual(["saves", "all"]);
		});

		it("offers both choices when it is not told either way", () => {
			expect(exportChoicesFor().map((c) => c.value)).toEqual(["saves", "all"]);
		});

		it("offers only everything when saves are not supported", () => {
			expect(exportChoicesFor(false).map((c) => c.value)).toEqual(["all"]);
		});
	});

	describe("isWorking", () => {
		it("is true while the job is exporting", () => {
			expect(isWorking({ id: "a", status: "exporting" })).toBe(true);
		});

		it("is false once the job is ready or failed", () => {
			expect(isWorking({ id: "a", status: "ready" })).toBe(false);
			expect(isWorking({ id: "a", status: "failed" })).toBe(false);
		});

		it("is false with no job", () => {
			expect(isWorking(null)).toBe(false);
			expect(isWorking(undefined)).toBe(false);
		});
	});

	describe("phaseText", () => {
		it("says what each known phase is doing", () => {
			expect(phaseText({ phase: "measuring" })).toBe("Measuring the server…");
			expect(phaseText({ phase: "copying" })).toBe("Copying the files…");
			expect(phaseText({ phase: "archiving" })).toBe("Packing the bundle…");
			expect(phaseText({ phase: "done" })).toBe("Finishing…");
		});

		it("falls back to a generic line for an unknown phase", () => {
			expect(phaseText({ phase: "dancing" })).toBe("Working…");
			expect(phaseText({ phase: "constructor" })).toBe("Working…");
		});

		it("falls back to a generic line when there is no phase yet or no job", () => {
			expect(phaseText({ id: "a", status: "exporting" })).toBe("Working…");
			expect(phaseText({ phase: 3 })).toBe("Working…");
			expect(phaseText(null)).toBe("Working…");
		});
	});

	describe("exportSummary", () => {
		it("says the name and size when ready", () => {
			expect(exportSummary({ status: "ready", name: "survival", bytes: 2048 })).toBe("survival is ready (2.0 KB).");
		});

		it("gives the reason when failed", () => {
			expect(exportSummary({ status: "failed", error: "Not enough room." })).toBe("Not enough room.");
		});

		it("is empty for a failed job with no reason", () => {
			expect(exportSummary({ status: "failed", error: null })).toBe("");
		});

		it("is empty while exporting, and with no job", () => {
			expect(exportSummary({ status: "exporting" })).toBe("");
			expect(exportSummary(null)).toBe("");
		});
	});

	describe("exportDownloadUrl", () => {
		it("points at the one-time download of the job", () => {
			expect(exportDownloadUrl("3f2c1a9e-0000-4000-8000-000000000001")).toBe("/api/export-jobs/3f2c1a9e-0000-4000-8000-000000000001/download");
		});

		it("never throws on a missing id", () => {
			expect(exportDownloadUrl(undefined)).toBe("/api/export-jobs//download");
		});
	});

	describe("secretsWarning", () => {
		it("says passwords are left out when the box is off", () => {
			expect(secretsWarning(false)).toBe(
				"Passwords are left out. New ones are made when the server is set up on the other PC. A password stored inside a save or mod file is not removed.",
			);
		});

		it("warns that passwords are in plain text when the box is on", () => {
			expect(secretsWarning(true)).toBe("The file will contain this server's passwords in plain text. Keep it private and delete it after the move.");
		});

		it("treats anything but true as off", () => {
			expect(secretsWarning("yes")).toBe(secretsWarning(false));
		});
	});

	describe("mergeEvent", () => {
		it("adds the event's fields to the job it belongs to", () => {
			expect(mergeEvent({ id: "a", status: "exporting" }, { jobId: "a", phase: "copying" })).toEqual({
				id: "a",
				status: "exporting",
				jobId: "a",
				phase: "copying",
			});
		});

		it("ignores an event for a different job", () => {
			const job = { id: "a", status: "exporting" };
			expect(mergeEvent(job, { jobId: "b", phase: "copying" })).toBe(job);
		});

		it("does nothing with no job, or no event", () => {
			expect(mergeEvent(null, { jobId: "a", phase: "copying" })).toBe(null);
			const job = { id: "a", status: "exporting" };
			expect(mergeEvent(job, null)).toBe(job);
		});
	});
});

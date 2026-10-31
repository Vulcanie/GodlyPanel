import { describe, it, expect } from "vitest";
import {
	EXPORT_CHOICES,
	exportChoicesFor,
	isWorking,
	phaseText,
	exportSummary,
	exportDownloadUrl,
	secretsWarning,
	mergeEvent,
	bundleSummary,
	planNotes,
	portProblems,
	importErrorText,
	importPhaseText,
	importSummary,
	isImporting,
	mergeImportEvent,
	SECRETS_NOTE,
} from "./migrate.js";

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

	// The "Import a server file" card: the plan the panel reads from a file, the ports, and the progress and result of an import.
	describe("import", () => {
		describe("bundleSummary", () => {
			it("says the game, the file, what it holds and its size", () => {
				expect(bundleSummary({ gameName: "Valheim", sourceName: "survival", include: "saves", bytes: 2048 })).toBe(
					'Valheim server "survival", saves and settings, 2.0 KB.',
				);
			});

			it("says the whole server when the file holds everything", () => {
				expect(bundleSummary({ gameName: "Valheim", sourceName: "survival", include: "all", bytes: 0 })).toBe(
					'Valheim server "survival", the whole server, 0 B.',
				);
			});

			it("says the size is unknown when it is missing or not a whole number", () => {
				expect(bundleSummary({ gameName: "Valheim", sourceName: "survival", include: "saves" })).toMatch(/, unknown\.$/);
				expect(bundleSummary({ gameName: "Valheim", sourceName: "survival", include: "saves", bytes: -4 })).toMatch(/, unknown\.$/);
			});

			it("is empty for a plan without a game or a name, and for garbage", () => {
				expect(bundleSummary({ sourceName: "survival", include: "saves", bytes: 1 })).toBe("");
				expect(bundleSummary({ gameName: "Valheim", include: "saves", bytes: 1 })).toBe("");
				expect(bundleSummary({ gameName: "  ", sourceName: "x" })).toBe("");
				expect(bundleSummary(null)).toBe("");
				expect(bundleSummary("valheim")).toBe("");
			});
		});

		describe("planNotes", () => {
			it("lists the notes in order: download, name, passwords, port picks, then warnings", () => {
				const notes = planNotes({
					needsGameDownload: true,
					nameTaken: true,
					name: "survival 2",
					sourceName: "survival",
					secretsIncluded: true,
					ports: { port: 8212, queryPort: 27015 },
					portConflicts: [{ key: "port", port: 8211, owner: "Another server" }],
					warnings: ["  Two mods were left out.  ", "", "   ", 42],
				});
				expect(notes).toEqual([
					"The game is downloaded again after the import.",
					'You already have a server called "survival", so the new one is named "survival 2". You can change it.',
					"This file contains the old server's passwords.",
					"The old PC used port 8211 for port, but Another server uses it here, so the panel picked 8212 instead.",
					"Two mods were left out.",
				]);
			});

			it("uses the shared passwords text, so the card can tell it apart", () => {
				expect(planNotes({ secretsIncluded: true })).toEqual([SECRETS_NOTE]);
			});

			it("says a different port was picked when the plan has no number for it", () => {
				expect(planNotes({ portConflicts: [{ key: "port", port: 8211, owner: "Another server" }] })).toEqual([
					"The old PC used port 8211 for port, but Another server uses it here, so the panel picked a different port.",
				]);
			});

			it("gives no notes for a plan with nothing to say, and for garbage", () => {
				expect(planNotes({ needsGameDownload: false, nameTaken: false, secretsIncluded: false })).toEqual([]);
				expect(planNotes(null)).toEqual([]);
				expect(planNotes("plan")).toEqual([]);
				expect(planNotes({ portConflicts: [null, "x"], warnings: "nope" })).toEqual([]);
			});
		});

		describe("portProblems", () => {
			it("is empty for good, separate ports", () => {
				expect(portProblems({ port: 8211, queryPort: 27015, rconPort: 25575 })).toEqual([]);
			});

			it("names each port that is not a whole number from 1 to 65535", () => {
				expect(portProblems({ port: 0, queryPort: 65536, rconPort: 1.5, webPort: "8080", tcpPort: NaN, udpPort: null })).toEqual([
					"port must be a whole number from 1 to 65535.",
					"queryPort must be a whole number from 1 to 65535.",
					"rconPort must be a whole number from 1 to 65535.",
					"webPort must be a whole number from 1 to 65535.",
					"tcpPort must be a whole number from 1 to 65535.",
					"udpPort must be a whole number from 1 to 65535.",
				]);
			});

			it("names both keys when two ports share a number", () => {
				expect(portProblems({ port: 8211, queryPort: 8211 })).toEqual(["queryPort and port cannot use the same port (8211)."]);
			});

			it("accepts the edges 1 and 65535", () => {
				expect(portProblems({ a: 1, b: 65535 })).toEqual([]);
			});

			it("does not throw on garbage", () => {
				expect(portProblems(null)).toEqual([]);
				expect(portProblems(undefined)).toEqual([]);
				expect(portProblems("8211")).toEqual([]);
				expect(portProblems([])).toEqual([]);
			});
		});

		describe("importErrorText", () => {
			it("has words for the codes the person can fix", () => {
				expect(importErrorText("name_taken", "x")).toBe("A server with that name already exists. Pick another name.");
				expect(importErrorText("disk_full", "x")).toBe("There is not enough free space for this server.");
				expect(importErrorText("import_busy", "x")).toBe("Another import is running. Wait for it to finish.");
				expect(importErrorText("no_such_upload", "x")).toBe("The uploaded file is gone. Choose it again.");
				expect(importErrorText("newer_bundle", "x")).toBe("That file was made by a newer GodlyPanel. Update this one first.");
				expect(importErrorText("unsafe_bundle", "x")).toBe("That file was refused because it is not safe to open.");
			});

			it("uses the same words for a file that is not a bundle", () => {
				expect(importErrorText("not_a_bundle")).toBe("That is not a GodlyPanel server file.");
				expect(importErrorText("bad_file")).toBe("That is not a GodlyPanel server file.");
			});

			it("shows the server's message for any other code", () => {
				expect(importErrorText("bad_ports", "Port 80 is reserved.")).toBe("Port 80 is reserved.");
			});

			it("falls back to a generic line with no usable message, and does not throw on a made-up code", () => {
				expect(importErrorText(undefined, undefined)).toBe("The import failed.");
				expect(importErrorText("constructor", "  ")).toBe("The import failed.");
				expect(importErrorText("toString", null)).toBe("The import failed.");
			});
		});

		describe("importPhaseText", () => {
			it("says what each known phase is doing", () => {
				expect(importPhaseText({ phase: "checking" })).toBe("Checking the file…");
				expect(importPhaseText({ phase: "extracting" })).toBe("Unpacking the files…");
				expect(importPhaseText({ phase: "registering" })).toBe("Setting up the server…");
				expect(importPhaseText({ phase: "done" })).toBe("Finishing…");
			});

			it("falls back to a generic line for an unknown phase, a missing one, or no job", () => {
				expect(importPhaseText({ phase: "dancing" })).toBe("Working…");
				expect(importPhaseText({ phase: "hasOwnProperty" })).toBe("Working…");
				expect(importPhaseText({ id: "a", status: "importing" })).toBe("Working…");
				expect(importPhaseText({ phase: 3 })).toBe("Working…");
				expect(importPhaseText(null)).toBe("Working…");
			});
		});

		describe("importSummary", () => {
			it("says the server was imported when ready", () => {
				expect(importSummary({ status: "ready", server: "survival", installing: false })).toBe("survival was imported.");
				expect(importSummary({ status: "ready", server: "survival" })).toBe("survival was imported.");
			});

			it("says the game is downloading when the server still needs it", () => {
				expect(importSummary({ status: "ready", server: "survival", installing: true })).toBe("survival was imported. The game is downloading now.");
			});

			it("uses a plain name when the server's name is missing", () => {
				expect(importSummary({ status: "ready" })).toBe("The server was imported.");
			});

			it("gives the friendly reason when failed", () => {
				expect(importSummary({ status: "failed", code: "disk_full", error: "No space" })).toBe("There is not enough free space for this server.");
				expect(importSummary({ status: "failed", code: "bad_ports", error: "Port 80 is reserved." })).toBe("Port 80 is reserved.");
			});

			it("is empty while importing, and with no job or garbage", () => {
				expect(importSummary({ status: "importing" })).toBe("");
				expect(importSummary(null)).toBe("");
				expect(importSummary("ready")).toBe("");
			});
		});

		describe("isImporting", () => {
			it("is true only while the job is importing", () => {
				expect(isImporting({ id: "a", status: "importing" })).toBe(true);
				expect(isImporting({ id: "a", status: "ready" })).toBe(false);
				expect(isImporting({ id: "a", status: "failed" })).toBe(false);
			});

			it("is false with no job or garbage", () => {
				expect(isImporting(null)).toBe(false);
				expect(isImporting(undefined)).toBe(false);
				expect(isImporting("importing")).toBe(false);
			});
		});

		describe("mergeImportEvent", () => {
			it("adds the event's fields to the job it belongs to", () => {
				expect(mergeImportEvent({ id: "a", status: "importing" }, { jobId: "a", phase: "extracting" })).toEqual({
					id: "a",
					status: "importing",
					jobId: "a",
					phase: "extracting",
				});
			});

			it("ignores an event for a different job", () => {
				const job = { id: "a", status: "importing" };
				expect(mergeImportEvent(job, { jobId: "b", phase: "extracting" })).toBe(job);
			});

			it("does nothing with no job, no event, or garbage", () => {
				expect(mergeImportEvent(null, { jobId: "a", phase: "extracting" })).toBe(null);
				const job = { id: "a", status: "importing" };
				expect(mergeImportEvent(job, null)).toBe(job);
				expect(mergeImportEvent(job, "a")).toBe(job);
			});
		});
	});
});

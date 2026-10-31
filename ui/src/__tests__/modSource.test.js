import { describe, it, expect } from "vitest";
import { describeInstall, installErrorAction, pendingUpdates, updateLabel, driftNotices, canUseAddress, lockEntryForMod } from "../utils/modSource.js";

// The mods panel's rules for a pasted address: what an install reports, what an error asks the person to do, which updates can be
// applied, how drift is worded, and when the paste box is shown. The panel itself only draws what these return.

describe("modSource", () => {
	describe("describeInstall", () => {
		it("names what was installed", () => {
			expect(describeInstall({ installed: ["A.jar", "B.jar"], unverified: [], skipped: [] })).toEqual({
				message: "Installed: A.jar, B.jar",
				warnings: [],
			});
		});

		it("says nothing new was installed when the list is empty", () => {
			expect(describeInstall({ installed: [], unverified: [], skipped: [] }).message).toBe("Nothing new was installed.");
		});

		it("warns for each file with no checksum to check against", () => {
			const { warnings } = describeInstall({ installed: ["A.jar"], unverified: ["A.jar"], skipped: [] });
			expect(warnings).toEqual(["A.jar had no checksum to check it against."]);
		});

		it("explains a player-only skip and an already-installed skip", () => {
			const { warnings } = describeInstall({
				installed: [],
				unverified: [],
				skipped: [
					{ source: "modrinth", ref: "client-thing", reason: "client_only" },
					{ source: "modrinth", ref: "lib", reason: "already_installed" },
				],
			});
			expect(warnings).toEqual([
				"client-thing is for players only, so it was left out.",
				"lib was already installed, so it was left as it is.",
			]);
		});

		it("gives a generic line for a skip reason it does not know", () => {
			const { warnings } = describeInstall({ installed: [], unverified: [], skipped: [{ ref: "odd", reason: "something_new" }] });
			expect(warnings).toEqual(["odd was skipped."]);
		});

		it("tolerates a missing or garbage result", () => {
			expect(describeInstall(null)).toEqual({ message: "Nothing new was installed.", warnings: [] });
			expect(describeInstall({})).toEqual({ message: "Nothing new was installed.", warnings: [] });
			expect(describeInstall({ installed: "A.jar", unverified: 5, skipped: {} })).toEqual({
				message: "Nothing new was installed.",
				warnings: [],
			});
		});

		it("drops entries it cannot read rather than writing a warning about them", () => {
			const { warnings } = describeInstall({ unverified: [null, 3], skipped: [null, "x"] });
			expect(warnings).toEqual([]);
		});
	});

	describe("installErrorAction", () => {
		it("asks for trust when the address is not a known site", () => {
			expect(installErrorAction({ code: "untrusted_address", message: "Not trusted" })).toEqual({ kind: "trust", message: "Not trusted" });
		});

		it("asks the person to choose when there are several files", () => {
			const err = { code: "choose_asset", message: "Pick one", details: { assets: ["a.zip", "b.zip"] } };
			expect(installErrorAction(err)).toEqual({ kind: "choose", message: "Pick one", assets: ["a.zip", "b.zip"] });
		});

		it("keeps only text names and at most 25 of them", () => {
			const many = Array.from({ length: 30 }, (_, i) => `f${i}.zip`);
			const action = installErrorAction({ code: "choose_asset", message: "Pick", details: { assets: [1, null, ...many] } });
			expect(action.kind).toBe("choose");
			expect(action.assets).toHaveLength(25);
			expect(action.assets.every((n) => typeof n === "string")).toBe(true);
		});

		it("shows the message when the list of files is empty or missing", () => {
			expect(installErrorAction({ code: "choose_asset", message: "Pick", details: { assets: [] } })).toEqual({ kind: "message", message: "Pick" });
			expect(installErrorAction({ code: "choose_asset", message: "Pick" })).toEqual({ kind: "message", message: "Pick" });
		});

		it("shows the message for every other error, and copes with nothing", () => {
			expect(installErrorAction({ code: "unrecognised", message: "I don't recognise that link." })).toEqual({
				kind: "message",
				message: "I don't recognise that link.",
			});
			expect(installErrorAction(undefined).kind).toBe("message");
		});
	});

	describe("pendingUpdates", () => {
		it("keeps only the entries that have a newer version, in their order", () => {
			const updates = [{ id: "1", status: "current" }, { id: "2", status: "update" }, { id: "3", status: "manual" }, { id: "4", status: "update" }];
			expect(pendingUpdates(updates).map((u) => u.id)).toEqual(["2", "4"]);
		});

		it("gives an empty list for something that is not a list", () => {
			expect(pendingUpdates(undefined)).toEqual([]);
			expect(pendingUpdates({ status: "update" })).toEqual([]);
		});
	});

	describe("updateLabel", () => {
		it("shows the version change for an update", () => {
			expect(updateLabel({ status: "update", current: "1.2", latest: "1.3" })).toBe("1.2 -> 1.3");
		});

		it("says when a mod is up to date, or must be checked by hand", () => {
			expect(updateLabel({ status: "current" })).toBe("Up to date");
			expect(updateLabel({ status: "manual" })).toBe("Check this one by hand");
		});

		it("shows the reason a check failed, or a plain line when there is no reason", () => {
			expect(updateLabel({ status: "error", error: { code: "x", message: "Source is down" } })).toBe("Couldn't check: Source is down");
			expect(updateLabel({ status: "error", error: {} })).toBe("Couldn't check");
			expect(updateLabel({ status: "error" })).toBe("Couldn't check");
		});

		it("gives an empty label for a status it does not know, or no entry", () => {
			expect(updateLabel({ status: "weird" })).toBe("");
			expect(updateLabel(null)).toBe("");
		});
	});

	describe("driftNotices", () => {
		it("gives nothing when the lock has no problems", () => {
			expect(driftNotices({ entries: [], drift: { changed: [], missing: [], untracked: [] }, orphans: [] })).toEqual([]);
		});

		it("warns about files changed outside the panel", () => {
			expect(driftNotices({ drift: { changed: ["a.jar", "b.jar"], missing: [], untracked: [] }, orphans: [] })).toEqual([
				{ severity: "warning", text: "2 mod file(s) were changed outside the panel: a.jar, b.jar" },
			]);
		});

		it("warns about missing files", () => {
			expect(driftNotices({ drift: { changed: [], missing: ["c.jar"], untracked: [] }, orphans: [] })).toEqual([
				{ severity: "warning", text: "1 mod file(s) are missing: c.jar" },
			]);
		});

		it("notes files the panel did not install", () => {
			expect(driftNotices({ drift: { changed: [], missing: [], untracked: ["x.dll"] }, orphans: [] })).toEqual([
				{ severity: "info", text: "1 file(s) in the mods folder weren't installed by the panel: x.dll" },
			]);
		});

		it("names orphaned mods by their name in the lock, or by id when it is not there", () => {
			const lock = { entries: [{ id: "m1", names: ["Lib.jar"] }], drift: {}, orphans: ["m1", "gone"] };
			expect(driftNotices(lock)).toEqual([
				{ severity: "info", text: "2 mod(s) were installed only for something that was removed: Lib.jar, gone" },
			]);
		});

		it("lists at most five names and says how many more there are", () => {
			const names = ["a", "b", "c", "d", "e", "f", "g"];
			const [notice] = driftNotices({ drift: { changed: names, missing: [], untracked: [] }, orphans: [] });
			expect(notice.text).toBe("7 mod file(s) were changed outside the panel: a, b, c, d, e, and 2 more");
		});

		it("does not add 'and more' for exactly five names", () => {
			const [notice] = driftNotices({ drift: { changed: ["a", "b", "c", "d", "e"], missing: [], untracked: [] }, orphans: [] });
			expect(notice.text.endsWith("a, b, c, d, e")).toBe(true);
		});

		it("gives nothing for bad input and never throws", () => {
			expect(driftNotices(null)).toEqual([]);
			expect(driftNotices("lock")).toEqual([]);
			expect(driftNotices({ drift: "nope", orphans: "nope" })).toEqual([]);
			expect(driftNotices({ drift: { changed: [null, 4] } })).toEqual([]);
		});
	});

	describe("canUseAddress", () => {
		it("is true for a supported game that takes sources", () => {
			expect(canUseAddress({ supported: true, sources: ["modrinth"] })).toBe(true);
		});

		it("is false when the game takes no sources, or the sources are empty or missing", () => {
			expect(canUseAddress({ supported: true, sources: [] })).toBe(false);
			expect(canUseAddress({ supported: true })).toBe(false);
			expect(canUseAddress({ supported: true, sources: "modrinth" })).toBe(false);
		});

		it("is false when the game is not supported, or there is no data yet", () => {
			expect(canUseAddress({ supported: false, sources: ["modrinth"] })).toBe(false);
			expect(canUseAddress(null)).toBe(false);
			expect(canUseAddress(undefined)).toBe(false);
		});
	});

	describe("lockEntryForMod", () => {
		const entries = [
			{ id: "a", version: "1.2", names: ["ModA.jar"] },
			{ id: "b", version: "2.0", names: ["Folder Mod"] },
		];

		it("finds the entry whose names hold the mod's name, ignoring case", () => {
			expect(lockEntryForMod("modA.JAR", entries)?.id).toBe("a");
		});

		it("strips a turned-off mod's .disabled ending before matching", () => {
			expect(lockEntryForMod("ModA.jar.disabled", entries)?.id).toBe("a");
		});

		it("gives null when nothing matches, or the input is garbage", () => {
			expect(lockEntryForMod("Unknown.jar", entries)).toBeNull();
			expect(lockEntryForMod(undefined, entries)).toBeNull();
			expect(lockEntryForMod("ModA.jar", undefined)).toBeNull();
		});

		it("does not match a name that only contains the lock name", () => {
			expect(lockEntryForMod("ModA.jar.bak", entries)).toBeNull();
		});
	});
});

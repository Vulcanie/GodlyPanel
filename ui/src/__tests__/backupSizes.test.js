import { describe, it, expect, beforeAll } from "vitest";
import { setLocale } from "../i18n/index.js";
import { ratioText, formatLabel, levelName, recompressTargets, settingsBody, limitGBFromBytes, friendlyError } from "../components/backupSizes.js";

// The backups panel's size rules: the ratio text, the format chip, which backups a recompress rewrites, and the settings body that is
// sent to the server. A blank form field has to mean "follow the panel", never 0.

const GB = 1024 ** 3;

describe("backupSizes", () => {
	beforeAll(async () => {
		await setLocale("en");
	});

	describe("ratioText", () => {
		it("gives the share of the original size", () => {
			expect(ratioText({ sizeBytes: 410, bytesBefore: 1000 })).toBe("41% of original");
		});

		it("gives null for an older backup that has no original size", () => {
			expect(ratioText({ sizeBytes: 410, bytesBefore: null })).toBeNull();
			expect(ratioText({ sizeBytes: 410 })).toBeNull();
		});

		it("gives null when the original size is zero, so it never divides by zero", () => {
			expect(ratioText({ sizeBytes: 410, bytesBefore: 0 })).toBeNull();
		});

		it("gives null when the stored size is missing", () => {
			expect(ratioText({ sizeBytes: null, bytesBefore: 1000 })).toBeNull();
		});
	});

	describe("formatLabel", () => {
		it("names each format in upper case", () => {
			expect(formatLabel({ format: "zip" })).toBe("ZIP");
			expect(formatLabel({ format: "zstd" })).toBe("ZSTD");
			expect(formatLabel({ format: "xz" })).toBe("XZ");
		});

		it("gives null for a format it does not know, or none", () => {
			expect(formatLabel({ format: "rar" })).toBeNull();
			expect(formatLabel({})).toBeNull();
			expect(formatLabel({ format: "__proto__" })).toBeNull();
		});
	});

	describe("levelName", () => {
		it("names the three levels in words", () => {
			expect(levelName("fast")).toBe("Fast");
			expect(levelName("balanced")).toBe("Balanced");
			expect(levelName("max")).toBe("Maximum");
			expect(levelName(null)).toBeNull();
		});
	});

	describe("recompressTargets", () => {
		const backups = [
			{ id: "a", format: "zip", level: "balanced" },
			{ id: "b", format: "zstd", level: "max" },
			{ id: "c", format: "zstd", level: null },
			{ id: "d", format: "zip", level: null },
			{ id: "e", format: "zstd", level: "fast" },
		];

		it("returns the backups not already in that format at that level", () => {
			expect(recompressTargets(backups, "zstd", "max")).toEqual(["a", "c", "d", "e"]);
		});

		it("counts a backup with no recorded level as not matching", () => {
			expect(recompressTargets([{ id: "x", format: "zstd", level: null }], "zstd", null)).toEqual(["x"]);
		});

		it("gives an empty list when every backup already matches", () => {
			expect(recompressTargets([{ id: "y", format: "xz", level: "max" }], "xz", "max")).toEqual([]);
		});

		it("gives an empty list for no backups", () => {
			expect(recompressTargets(undefined, "zip", "fast")).toEqual([]);
		});
	});

	describe("settingsBody", () => {
		const blank = {
			format: "",
			level: "",
			keepDaily: "",
			keepWeekly: "",
			keepMonthly: "",
			keepManual: "",
			skipUnchanged: "",
			limitGB: "",
		};

		it("sends null for every blank field, so the panel setting is followed", () => {
			expect(settingsBody(blank)).toEqual({
				format: null,
				level: null,
				keepDaily: null,
				keepWeekly: null,
				keepMonthly: null,
				keepManual: null,
				skipUnchanged: null,
				maxTotalBytes: null,
			});
		});

		it("never turns a blank number into 0", () => {
			expect(settingsBody({ ...blank, keepDaily: "" }).keepDaily).toBeNull();
			expect(settingsBody({ ...blank, keepDaily: "   " }).keepDaily).toBeNull();
		});

		it("keeps a typed 0 as 0", () => {
			expect(settingsBody({ ...blank, keepDaily: "0" }).keepDaily).toBe(0);
		});

		it("turns typed counts into numbers", () => {
			const body = settingsBody({ ...blank, keepWeekly: "4", keepMonthly: "12", keepManual: "3" });
			expect(body.keepWeekly).toBe(4);
			expect(body.keepMonthly).toBe(12);
			expect(body.keepManual).toBe(3);
		});

		it("passes text that is not a number on, so the server refuses it instead of it becoming 'follow the panel'", () => {
			expect(settingsBody({ ...blank, keepDaily: "abc" }).keepDaily).toBe("abc");
		});

		it("sends the format and level as typed, or null when blank", () => {
			const body = settingsBody({ ...blank, format: "zstd", level: "max" });
			expect(body.format).toBe("zstd");
			expect(body.level).toBe("max");
		});

		it("maps the skip choice to true, false or null", () => {
			expect(settingsBody({ ...blank, skipUnchanged: "yes" }).skipUnchanged).toBe(true);
			expect(settingsBody({ ...blank, skipUnchanged: "no" }).skipUnchanged).toBe(false);
			expect(settingsBody({ ...blank, skipUnchanged: "" }).skipUnchanged).toBeNull();
			expect(settingsBody({ ...blank, skipUnchanged: "constructor" }).skipUnchanged).toBeNull();
		});

		it("turns gigabytes into bytes, so 1.5 GB is 1610612736", () => {
			expect(settingsBody({ ...blank, limitGB: "1.5" }).maxTotalBytes).toBe(1610612736);
			expect(settingsBody({ ...blank, limitGB: "2" }).maxTotalBytes).toBe(2 * GB);
		});

		it("sends null for a blank limit, which means no limit", () => {
			expect(settingsBody({ ...blank, limitGB: "" }).maxTotalBytes).toBeNull();
		});

		it("returns only the override keys", () => {
			expect(Object.keys(settingsBody({ ...blank, keepDaily: "1", extra: "x" })).sort()).toEqual(
				["format", "keepDaily", "keepManual", "keepMonthly", "keepWeekly", "level", "maxTotalBytes", "skipUnchanged"].sort(),
			);
		});
	});

	describe("limitGBFromBytes", () => {
		it("gives blank for no limit", () => {
			expect(limitGBFromBytes(null)).toBe("");
			expect(limitGBFromBytes(undefined)).toBe("");
		});

		it("gives gigabytes with no trailing zeros", () => {
			expect(limitGBFromBytes(1610612736)).toBe("1.5");
			expect(limitGBFromBytes(2 * GB)).toBe("2");
		});

		it("round-trips a limit typed in gigabytes", () => {
			for (const gb of ["1.5", "2", "0.25", "10.75"]) {
				const bytes = settingsBody({ limitGB: gb }).maxTotalBytes;
				expect(limitGBFromBytes(bytes)).toBe(gb);
			}
		});
	});

	describe("friendlyError", () => {
		it("gives plain words for a size limit the server cannot read", () => {
			const e = { code: "bad_number", message: "maxTotalBytes must be a whole number" };
			expect(friendlyError(e)).toBe("The size limit has to be a number of GB, or blank for no limit.");
		});

		it("keeps other bad-number messages as the server wrote them", () => {
			expect(friendlyError({ code: "bad_number", message: "keepDaily must be a whole number" })).toBe("keepDaily must be a whole number");
		});

		it("keeps the budget message unchanged", () => {
			expect(friendlyError({ code: "over_budget", message: "Not enough room under the limit." })).toBe("Not enough room under the limit.");
		});

		it("shows the message for any other error", () => {
			expect(friendlyError(new Error("Request failed (500)"))).toBe("Request failed (500)");
		});
	});
});

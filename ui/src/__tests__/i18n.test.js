import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { t, tn, setLocale, registerLocale, formatBytes, formatDate, errorText, LANGUAGES } from "../i18n/index.js";

// The panel's words come from locale files, and a missing or broken word must never blank the screen: the English text is the fallback,
// and a key nothing defines shows the key itself.

describe("t()", () => {
	beforeAll(async () => {
		await setLocale("en");
	});

	afterEach(async () => {
		await setLocale("en");
	});

	it("returns the English string for a key", () => {
		expect(t("common.cancel")).toBe("Cancel");
	});

	it("replaces {name} with the value given", () => {
		registerLocale("test", { hello: "Hello {name}" });
		return setLocale("test").then(() => {
			expect(t("hello", { name: "Ann" })).toBe("Hello Ann");
		});
	});

	it("falls back to English for a key the active locale does not have", async () => {
		registerLocale("es", { "common.cancel": "Cancelar" });
		await setLocale("es");
		expect(t("common.cancel")).toBe("Cancelar");
		expect(t("app.loading")).toBe("Loading…");
	});

	it("returns the key itself when nothing defines it", () => {
		expect(t("no.such.key")).toBe("no.such.key");
	});

	it("does not throw on an unmatched brace in a value", () => {
		registerLocale("broken", { oops: "Bad { value {name" });
		return setLocale("broken").then(() => {
			expect(() => t("oops", { name: "x" })).not.toThrow();
			expect(t("oops", { name: "x" })).toBe("Bad { value {name");
		});
	});
});

describe("tn()", () => {
	beforeAll(async () => {
		await setLocale("en");
	});

	it("picks the singular form for one", () => {
		expect(tn("files", 1)).toBe("1 file");
	});

	it("picks the plural form for two", () => {
		expect(tn("files", 2)).toBe("2 files");
	});
});

describe("formatting and languages", () => {
	beforeAll(async () => {
		await setLocale("en");
	});

	it("formats bytes with the active locale's Intl rules", () => {
		expect(formatBytes(1536)).toMatch(/1\.5/);
		expect(formatBytes(512)).toMatch(/512/);
	});

	it("shows 'unknown' for an invalid date instead of throwing", () => {
		expect(formatDate("not a date")).toBe("unknown");
	});

	it("falls back to English for a language code the panel does not ship", async () => {
		expect(await setLocale("../../etc/passwd")).toBe("en");
		expect(await setLocale("__proto__")).toBe("en");
	});

	it("lists English and the pseudo-locale", () => {
		expect(LANGUAGES).toEqual([
			{ code: "en", label: "English" },
			{ code: "en-XA", label: "Pseudo (test)" },
		]);
	});
});

describe("errorText()", () => {
	beforeAll(async () => {
		await setLocale("en");
	});

	it("uses the panel's words for a code it knows", () => {
		expect(errorText({ code: "name_taken", message: "raw" })).toBe("A server with that name already exists. Pick another name.");
	});

	it("falls back to the server's message for an unknown code", () => {
		expect(errorText({ code: "weird_thing", message: "Server said no." })).toBe("Server said no.");
	});

	it("uses the fallback for garbage and never throws", () => {
		for (const bad of [null, undefined, 5, "x", {}, { code: 7 }, { code: "a.b", message: "" }]) {
			expect(() => errorText(bad, "Failed.")).not.toThrow();
		}
		expect(errorText(null, "Failed.")).toBe("Failed.");
		expect(errorText({ code: "toString" }, "Failed.")).toBe("Failed.");
	});
});

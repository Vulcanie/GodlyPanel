import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { t, tn, setLocale, registerLocale, formatBytes, LANGUAGES } from "../i18n/index.js";

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

	it("lists English and the pseudo-locale", () => {
		expect(LANGUAGES).toEqual([
			{ code: "en", label: "English" },
			{ code: "en-XA", label: "Pseudo (test)" },
		]);
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../api/client";
import { accountLanguage } from "../utils/preferences";
import { applyLanguageChoice } from "../components/LanguagePicker";
import { t, setLocale, getLocale, languageFromBrowser } from "../i18n";
import xa from "../locales/en-XA.json";

// The render environment here has no DOM, so these tests exercise the logic the language picker and the session use, not the
// components themselves.

vi.mock("../api/client", () => ({ api: { get: vi.fn(), put: vi.fn() } }));

describe("choosing a language in the settings", () => {
	afterEach(async () => {
		await setLocale("en");
	});

	it("saves the pseudo-language on the account and switches the panel to it", async () => {
		const save = vi.fn(async (patch) => patch);
		await applyLanguageChoice("en-XA", save);
		expect(save).toHaveBeenCalledWith({ language: "en-XA" });
		expect(getLocale()).toBe("en-XA");
		expect(t("common.cancel")).toBe(xa["common.cancel"]);
	});

	it("clears the saved language for Automatic and goes back to the browser's language", async () => {
		await applyLanguageChoice("en-XA", vi.fn());
		const save = vi.fn(async (patch) => patch);
		await applyLanguageChoice("", save);
		expect(save).toHaveBeenCalledWith({ language: null });
		expect(getLocale()).toBe(languageFromBrowser());
	});
});

describe("the language the panel opens in", () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
	});

	it("is the language saved on the signed-in person's account", async () => {
		vi.mocked(api.get).mockResolvedValue({ prefs: { language: "en-XA" } });
		expect(await accountLanguage()).toBe("en-XA");
		expect(api.get).toHaveBeenCalledWith("/api/auth/preferences");
	});

	it("is the browser's language when the account has none", async () => {
		vi.mocked(api.get).mockResolvedValue({ prefs: {} });
		expect(await accountLanguage()).toBe(languageFromBrowser());
	});

	it("falls back to the browser's language when the preferences cannot be read, without throwing", async () => {
		vi.mocked(api.get).mockRejectedValue(new Error("network down"));
		await expect(accountLanguage()).resolves.toBe(languageFromBrowser());
	});
});

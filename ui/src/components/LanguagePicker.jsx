import React from "react";
import { MenuItem, TextField } from "@mui/material";
import SectionCard from "./ui/SectionCard";
import { LANGUAGES, languageFromBrowser, setLocale } from "../i18n";
import { usePreferences } from "../utils/preferences";
import { t, useT } from "../i18n";

/**
 * Applies a language choice: saves it on the person's account (null clears it, so the browser's language applies again) and switches
 * the panel to it straight away.
 */
export function applyLanguageChoice(value, save) {
	save({ language: value || null });
	return setLocale(value || languageFromBrowser());
}

/** The panel's language, kept on the person's account so it follows them to every browser. */
export default function LanguagePicker() {
	// Re-renders this picker when the language changes, so the t() text below switches with it.
	useT();
	const [prefs, save] = usePreferences();
	const loaded = prefs !== null;
	const automatic = { code: "", label: t("language.automatic") };

	return (
		<SectionCard title={t("common.language")}>
			<TextField
				select
				size="small"
				label={t("common.language")}
				value={LANGUAGES.some((l) => l.code === prefs?.language) ? prefs.language : ""}
				disabled={!loaded}
				onChange={(e) => applyLanguageChoice(e.target.value, save)}
				sx={{ minWidth: 220 }}
			>
				{[automatic, ...LANGUAGES].map((l) => (
					<MenuItem key={l.code || "auto"} value={l.code}>
						{l.label}
					</MenuItem>
				))}
			</TextField>
		</SectionCard>
	);
}

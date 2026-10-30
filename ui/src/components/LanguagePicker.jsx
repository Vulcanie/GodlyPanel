import React from "react";
import { MenuItem, TextField } from "@mui/material";
import SectionCard from "./ui/SectionCard";
import { LANGUAGES, languageFromBrowser, setLocale } from "../i18n";
import { usePreferences } from "../utils/preferences";

const AUTOMATIC = { code: "", label: "Automatic (browser)" };

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
	const [prefs, save] = usePreferences();
	const loaded = prefs !== null;

	return (
		<SectionCard title="Language">
			<TextField
				select
				size="small"
				label="Language"
				value={LANGUAGES.some((l) => l.code === prefs?.language) ? prefs.language : ""}
				disabled={!loaded}
				onChange={(e) => applyLanguageChoice(e.target.value, save)}
				sx={{ minWidth: 220 }}
			>
				{[AUTOMATIC, ...LANGUAGES].map((l) => (
					<MenuItem key={l.code || "auto"} value={l.code}>
						{l.label}
					</MenuItem>
				))}
			</TextField>
		</SectionCard>
	);
}

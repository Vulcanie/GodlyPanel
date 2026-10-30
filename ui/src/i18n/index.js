import React from "react";

// The panel's words live in ui/src/locales/<code>.json, one file per language. English is always loaded because it is the fallback:
// a key the chosen language lacks shows the English text, and a key nothing defines shows the key itself. Nothing here throws, so a
// missing word can never blank a screen.

export const LANGUAGES = [
	{ code: "en", label: "English" },
	{ code: "en-XA", label: "Pseudo (test)" },
];

// Each language is its own chunk, fetched only when it is chosen.
const LOADERS = {
	en: () => import("../locales/en.json"),
	"en-XA": () => import("../locales/en-XA.json"),
};

const catalogs = new Map(); // code -> { key: text }
const listeners = new Set();
let current = "en";
let latest = 0; // so a slow load can't overwrite a choice made after it

/** Makes a language's words available under `code`. The locale files use this; tests use it for languages that are not shipped. */
export function registerLocale(code, words) {
	catalogs.set(code, words);
}

function wordFor(code, key) {
	const words = catalogs.get(code);
	return words && Object.hasOwn(words, key) ? words[key] : undefined;
}

function fill(template, vars) {
	if (!vars) return template;
	// Only {name} with a value supplied is replaced; anything else, including a stray brace, is left exactly as written.
	return template.replace(/\{(\w+)\}/g, (whole, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : whole));
}

/** The text for `key` in the active language, with {name} placeholders filled from `vars`. */
export function t(key, vars) {
	const word = wordFor(current, key) ?? wordFor("en", key);
	return typeof word === "string" ? fill(word, vars) : key;
}

/** Plural text: looks up `key.one` or `key.other` for `count`, with `count` available as {count}. */
export function tn(key, count, vars) {
	let form = "other";
	try {
		form = new Intl.PluralRules(current).select(count);
	} catch {
		// An unusual language tag: the plural form falls back to "other".
	}
	const all = { count, ...vars };
	const word = wordFor(current, `${key}.${form}`) ?? wordFor("en", `${key}.${form}`) ?? wordFor(current, `${key}.other`) ?? wordFor("en", `${key}.other`);
	return typeof word === "string" ? fill(word, all) : key;
}

export function formatDate(date) {
	return new Intl.DateTimeFormat(current, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function formatNumber(n) {
	return new Intl.NumberFormat(current).format(n);
}

const BYTE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"];

export function formatBytes(n) {
	if (n == null) return t("common.unknown");
	let value = Number(n) || 0;
	let i = 0;
	while (Math.abs(value) >= 1024 && i < BYTE_UNITS.length - 1) {
		value /= 1024;
		i++;
	}
	return new Intl.NumberFormat(current, {
		style: "unit",
		unit: BYTE_UNITS[i],
		unitDisplay: "narrow",
		maximumFractionDigits: i === 0 ? 0 : 1,
	}).format(value);
}

export function getLocale() {
	return current;
}

function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

async function loadWords(code) {
	if (catalogs.has(code)) return true;
	if (!Object.hasOwn(LOADERS, code)) return false;
	try {
		registerLocale(code, (await LOADERS[code]()).default);
		return true;
	} catch {
		return false; // the file could not be fetched; English will show
	}
}

/** Switches the panel's language. An unknown or unloadable code falls back to English. Resolves to the code now in use. */
export async function setLocale(code) {
	const seq = ++latest;
	await loadWords("en");
	let target = (await loadWords(code)) ? code : "en";
	if (seq !== latest) return current;
	current = target;
	for (const listener of listeners) listener();
	return current;
}

/** The browser's language if the panel ships it, otherwise English. Matches "en-GB" to "en". */
export function languageFromBrowser(browserLanguages = navigator.languages ?? [navigator.language]) {
	for (const wanted of browserLanguages) {
		const exact = LANGUAGES.find((l) => l.code.toLowerCase() === String(wanted).toLowerCase());
		if (exact) return exact.code;
		const primary = String(wanted).split("-")[0].toLowerCase();
		const family = LANGUAGES.find((l) => l.code.split("-")[0].toLowerCase() === primary);
		if (family) return family.code;
	}
	return "en";
}

const I18nContext = React.createContext(null);

/** Shows the children once the chosen language is loaded, so the first screen is never blank or untranslated by accident. */
export function I18nProvider({ children }) {
	const locale = React.useSyncExternalStore(subscribe, getLocale, getLocale);
	const [ready, setReady] = React.useState(false);

	React.useEffect(() => {
		let alive = true;
		setLocale(languageFromBrowser()).finally(() => alive && setReady(true));
		return () => {
			alive = false;
		};
	}, []);

	const value = React.useMemo(() => ({ t, tn, locale, setLocale }), [locale]);
	if (!ready) return null;
	return React.createElement(I18nContext.Provider, { value }, children);
}

/** { t, tn, locale, setLocale } for the component using it. Re-renders the component when the language changes. */
export function useT() {
	const ctx = React.useContext(I18nContext);
	return ctx ?? { t, tn, locale: current, setLocale };
}

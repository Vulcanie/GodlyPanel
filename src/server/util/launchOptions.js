// Reading values out of a start script's launch line and out of a .properties file: pure functions with no side effects (no
// files, no network), so a test can import them without loading the panel's stores. Used by services/backupService.js.

/** The value a start script gives a flag (`-savedir "x"`, `-UserDataFolder=x`, `"-UserDataFolder=x"`), or null. */
export function flagValue(text, flag) {
	const name = flag.replace(/=$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const quotedWhole = new RegExp(`"${name}=([^"]*)"`, "i").exec(text);
	if (quotedWhole) return quotedWhole[1];
	const m = new RegExp(`(?:^|\\s)${name}(?:=|\\s+)(?:"([^"]*)"|(\\S+))`, "i").exec(text);
	return m ? (m[1] ?? m[2]) : null;
}

/** The value a launch line gives a `?Name=value` option (ARK's way), or null. */
export function optionValue(text, name) {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const m = new RegExp(`[?&]${escaped}=([^?&\\s"]+)`, "i").exec(text);
	return m ? m[1] : null;
}

/** A `key=value` line's value from a .properties file's text, or null. */
export function propertyValue(text, key) {
	for (const line of String(text).split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
		const at = trimmed.indexOf("=");
		if (at > 0 && trimmed.slice(0, at).trim() === key) return trimmed.slice(at + 1).trim();
	}
	return null;
}

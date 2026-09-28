// Shared value-shape detection used by ConfigForm (which control to render)
// and ConfigPage (how to coerce an edited string back to the right JS type
// before it goes into a JSON file's edits map).

export function detectSettingType(value) {
	const v = String(value).trim();
	if (/^(true|false)$/i.test(v)) return "boolean";
	if (v !== "" && /^-?\d+(\.\d+)?$/.test(v)) return "number";
	return "text";
}

// Ark/Conan/etc. mix "True"/"False" and "true"/"false" casing across
// different sections. Keep whichever casing style the original value used.
export function toBoolString(newBool, originalValue) {
	const original = String(originalValue).trim();
	const isCapitalized = original.charAt(0) === original.charAt(0).toUpperCase();
	const word = newBool ? "true" : "false";
	return isCapitalized ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

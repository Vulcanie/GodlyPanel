// Helpers for writing a game's settings catalog compactly.
//
// A catalog entry is { label, description, group, options?, allowCustom? }:
//   options      the choices, for a setting that has only a few. The form shows a dropdown instead of a text box.
//   allowCustom  the dropdown also accepts a typed value (for a list that grows with game updates or mods)

/** @typedef {{ value: string, label: string }} Choice */

/** ["easy", "hard"] or [["0", "Off"], ["1", "On"]] -> [{ value, label }] */
export function choices(list) {
	return list.map((item) => (Array.isArray(item) ? { value: String(item[0]), label: item[1] ?? String(item[0]) } : { value: String(item), label: String(item) }));
}

/** @param {Array<[string, string, string, string]>} list  [key, label, description, group] */
export function rows(list) {
	const map = {};
	for (const [key, label, description, group] of list) map[key] = { label, description, group };
	return map;
}

/**
 * Give some of a catalog's settings a list of choices. A key that isn't in the catalog is ignored, so a list can be shared by games
 * that name a setting the same way.
 * @param {Record<string, object>} settings
 * @param {Record<string, Array<string | [string, string]> | { choices: Array<string | [string, string]>, allowCustom?: boolean }>} table
 */
export function withChoices(settings, table) {
	for (const [key, spec] of Object.entries(table)) {
		const meta = settings[key];
		if (!meta) continue;
		const list = Array.isArray(spec) ? spec : spec.choices;
		meta.options = choices(list);
		if (!Array.isArray(spec) && spec.allowCustom) meta.allowCustom = true;
	}
	return settings;
}

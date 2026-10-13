// Looks an explanation up by its id. Kept apart from the registry's text so components import only this small module.
import { PANEL_HELP } from "./panelHelp.js";

/** @returns {{ guide: string, section: string, title: string, text: string, details?: string } | null} */
export function findHelp(id) {
	return PANEL_HELP[id] ?? null;
}

import { parseLineKV, serializeLineKV } from "./lineKV";

export function parseIni(text) {
	return parseLineKV(text, { sectioned: true });
}

export function serializeIni(parsed, edits) {
	return serializeLineKV(parsed, edits);
}

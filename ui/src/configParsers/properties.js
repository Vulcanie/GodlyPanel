import { parseLineKV, serializeLineKV } from "./lineKV";

export function parseProperties(text) {
	return parseLineKV(text, { sectioned: false });
}

export function serializeProperties(parsed, edits) {
	return serializeLineKV(parsed, edits);
}

// Shared by the providers that read an answer from an API. A provider's answer is small, and whatever arrives is attacker-controlled
// as far as size goes, so every read stops at a cap.

export const TIMEOUT_MS = 20_000;
// A project's answer is a few kilobytes. Anything this big is not one, so it is not read on.
export const MAX_ANSWER_BYTES = 5 * 1024 * 1024;

// Reads the body but stops at the cap, so a server that sends more than it declared still can't fill memory. `tooBig` makes the error
// for the caller's own provider.
export async function readCapped(res, { max = MAX_ANSWER_BYTES, tooBig }) {
	if (Number(res.headers.get("content-length")) > max) throw tooBig();
	const chunks = [];
	let total = 0;
	for await (const chunk of res.body ?? []) {
		total += chunk.length;
		if (total > max) throw tooBig();
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString("utf8");
}

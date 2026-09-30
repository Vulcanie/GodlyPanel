import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";

// Whether each server is meant to be running. The panel records it every time it
// starts or stops one. That is the difference between "it crashed" (meant to be
// running, isn't) and "someone stopped it" (meant to be stopped), which is what
// crash auto-restart needs to tell apart. Kept on disk so a panel restart, or a
// reboot, doesn't lose it.

const FILE = path.join(paths.dataDir, "state", "server-intent.json");
const enqueue = createWriteQueue();
let intent = {};

export async function initServerIntent() {
	intent = (await readJson(FILE, {})) ?? {};
}

export function getIntent(name) {
	return intent[name]?.desired ?? null;
}

export function intentSince(name) {
	return intent[name]?.at ?? null;
}

/** @param {"running"|"stopped"} desired */
export function setIntent(name, desired) {
	if (intent[name]?.desired === desired) return;
	intent = { ...intent, [name]: { desired, at: Date.now() } };
	enqueue(() => writeJsonAtomic(FILE, intent)).catch(() => {});
}

export function forgetIntent(name) {
	if (!(name in intent)) return;
	const { [name]: _gone, ...rest } = intent;
	intent = rest;
	enqueue(() => writeJsonAtomic(FILE, intent)).catch(() => {});
}

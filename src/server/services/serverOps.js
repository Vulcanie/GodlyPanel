import { broadcastSseEvent } from "./sseHub.js";

// One job at a time per server. A backup, a restart, an update and a delete all
// touch the same files and processes, and two of them at once is how a world gets
// corrupted: a restore while a backup is being read, a delete during an update.
//
// Interactive requests are refused when the server is busy (the person can just
// try again); scheduled work waits its turn.

const active = new Map(); // server name -> { op, since }
const waiting = new Map(); // server name -> [() => void]

export class BusyError extends Error {
	constructor(name, op) {
		super(`${name} is busy (${op}). Try again when it has finished.`);
		this.status = 409;
		this.code = "server_busy";
		this.op = op;
	}
}

function announce(name) {
	broadcastSseEvent({ type: "server_operation", serverName: name, operation: active.get(name)?.op ?? null });
}

/** The operation running on a server right now (e.g. "backup", "restart"), or null. */
export function currentOperation(name) {
	return active.get(name)?.op ?? null;
}

export function allOperations() {
	return Object.fromEntries([...active].map(([name, { op, since }]) => [name, { op, since }]));
}

/**
 * Run `fn` holding the server's lock.
 * @param {object} [options]
 * @param {boolean} [options.wait]  queue behind whatever is running instead of refusing
 */
export async function runOperation(name, op, fn, { wait = false } = {}) {
	while (active.has(name)) {
		if (!wait) throw new BusyError(name, active.get(name).op);
		await new Promise((resolve) => {
			const queue = waiting.get(name) ?? [];
			queue.push(resolve);
			waiting.set(name, queue);
		});
	}
	active.set(name, { op, since: Date.now() });
	announce(name);
	try {
		return await fn();
	} finally {
		active.delete(name);
		announce(name);
		const next = waiting.get(name)?.shift();
		if (next) next();
	}
}

/** Change what the lock holder is described as (e.g. "stopping" -> "backup"), without releasing it. */
export function setOperationLabel(name, op) {
	const entry = active.get(name);
	if (!entry || entry.op === op) return;
	entry.op = op;
	announce(name);
}

/**
 * Like runOperation, for work that should answer the caller early and carry on:
 * `work` receives a `report(value)` function; the returned promise settles with
 * the first reported value (or `work`'s result if it never reports) and the lock
 * is held until `work` finishes. Refuses immediately if the server is busy.
 */
export function runDetached(name, op, work) {
	if (active.has(name)) throw new BusyError(name, active.get(name).op);
	active.set(name, { op, since: Date.now() });
	announce(name);
	return new Promise((resolve, reject) => {
		let answered = false;
		const report = (value) => {
			if (answered) return;
			answered = true;
			resolve(value);
		};
		Promise.resolve()
			.then(() => work(report))
			.then(report, (err) => {
				if (!answered) {
					answered = true;
					reject(err);
				} else {
					console.warn(`[ops] ${name} ${op} finished with an error: ${err.message}`);
				}
			})
			.finally(() => {
				active.delete(name);
				announce(name);
				waiting.get(name)?.shift()?.();
			});
	});
}

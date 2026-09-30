// The live stream from the panel (server-sent events) is opened once, in App. This
// lets any component listen for one kind of event without opening its own
// connection or threading props down to it.

const listeners = new Map();

/** Call `fn(event)` for each live event of `type`. Returns a function that stops listening. */
export function onLive(type, fn) {
	if (!listeners.has(type)) listeners.set(type, new Set());
	listeners.get(type).add(fn);
	return () => listeners.get(type)?.delete(fn);
}

export function emitLive(type, event) {
	for (const fn of listeners.get(type) ?? []) {
		try {
			fn(event);
		} catch (err) {
			console.error(`Live event handler for ${type} failed:`, err);
		}
	}
}

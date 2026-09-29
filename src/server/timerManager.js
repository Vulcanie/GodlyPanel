// The original API scheduled its four pollers with bare setInterval calls
// inside the app.listen callback. That made "poll intervals are configurable"
// impossible to implement — there was nothing to reschedule and no handle to
// clear on shutdown. Timers are registered here instead, with their interval
// read from config each time they're (re)scheduled.

const timers = new Map();

/**
 * @param {string} name
 * @param {() => void} fn
 * @param {(config: object) => number} intervalFor  ms, read from live config
 * @param {(config: object) => boolean} [enabledFor]
 */
export function registerTimer(name, fn, intervalFor, enabledFor = () => true) {
	timers.set(name, { fn, intervalFor, enabledFor, handle: null });
}

function scheduleOne(entry, name, config) {
	if (entry.handle) {
		clearInterval(entry.handle);
		entry.handle = null;
	}
	if (!entry.enabledFor(config)) {
		console.log(`[timers] ${name}: disabled`);
		return;
	}
	const ms = entry.intervalFor(config);
	entry.handle = setInterval(entry.fn, ms);
	console.log(`[timers] ${name}: every ${ms}ms`);
}

export function scheduleAll(config) {
	for (const [name, entry] of timers) scheduleOne(entry, name, config);
}

/** Re-read intervals after a config change. Safe to call on every change. */
export function rescheduleAll(config) {
	scheduleAll(config);
}

export function stopAll() {
	for (const entry of timers.values()) {
		if (entry.handle) clearInterval(entry.handle);
		entry.handle = null;
	}
}

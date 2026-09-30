// When does a server count as crashed, and when should the panel stop trying?
// A pure function so every case can be tested without a game or a clock.
//
// The panel only judges a server it has watched come online: a server that was
// never up (the panel just started, or it was started and failed to load) isn't a
// "crash", and restarting it in a loop would only hide a real problem. Whether it
// should start with the panel at all is a separate per-server setting.

export const initialState = () => ({
	up: false,
	downSince: null,
	pendingSince: null,
	restarts: [],
	gaveUp: false,
	unresponsive: false,
});

/**
 * @param {object} state  from initialState() or a previous call
 * @param {{ online: boolean, alive: boolean|null, now: number }} seen
 *   `alive` is whether the program is still running when that can be told (null = can't tell)
 * @param {{ graceMs: number, maxRestarts: number, windowMs: number, startupGraceMs: number, hangRestartMs?: number|null }} cfg
 *   `hangRestartMs`: restart a program that is running but has not answered for this long (null = never)
 * @returns {{ state: object, action: null|"recovered"|"restart"|"give_up"|"unresponsive", reason?: "crashed"|"start_timeout"|"hung" }}
 */
export function step(state, { online, alive, now }, cfg) {
	const restarts = state.restarts.filter((t) => now - t < cfg.windowMs);
	const next = { ...state, restarts };

	if (online) {
		return {
			state: { ...next, up: true, downSince: null, pendingSince: null, unresponsive: false },
			action: state.pendingSince ? "recovered" : null,
		};
	}
	if (next.gaveUp) return { state: next, action: null };
	if (!next.up && !next.pendingSince) return { state: next, action: null };

	next.downSince ??= now;
	if (now - next.downSince < cfg.graceMs) return { state: next, action: null };
	// A restart the panel started is given time to load before it is judged, but only
	// while the program is still there: one that has already gone isn't loading.
	if (next.pendingSince && alive !== false && now - next.pendingSince < cfg.startupGraceMs) return { state: next, action: null };

	// Still running but not answering: a hang, or a slow load. Restarting would kill a
	// world that may be mid-save, so by default say so and leave it. A server set to
	// restart when unresponsive is given the configured time first.
	let reason = next.pendingSince ? "start_timeout" : "crashed";
	if (alive === true) {
		const limit = cfg.hangRestartMs ?? null;
		if (limit === null || now - next.downSince < limit) {
			return { state: { ...next, unresponsive: true }, action: next.unresponsive ? null : "unresponsive" };
		}
		reason = "hung";
	}

	if (restarts.length >= cfg.maxRestarts) return { state: { ...next, gaveUp: true }, action: "give_up", reason };
	return {
		state: { ...next, restarts: [...restarts, now], pendingSince: now, downSince: now },
		action: "restart",
		reason,
	};
}

// The rule every game gets: the port right after the game port is kept free.
//
// Many games quietly hold that port for themselves (Conan's raw socket, ARK's,
// Valheim's, 7 Days to Die's), and the ones that don't are hard to be sure about,
// so a query or RCON port there is refused for every game. A template can list
// the ports its game is known to take (`implicitPorts`, as offsets from the game
// port); anything it doesn't cover at offset 1 is reserved as a precaution.

const COMPANION = { offset: 1, label: "a companion port", precaution: true };

/** Ports kept free next to the game port: the game's known ones, plus offset 1. */
export function implicitPortsOf(template) {
	const known = template?.implicitPorts ?? [];
	const all = known.some((i) => i.offset === 1) ? known : [COMPANION, ...known];
	return [...all].sort((a, b) => a.offset - b.offset);
}

/** "…which Conan Exiles uses for its raw UDP socket" / "…may use for a companion port". */
export function usageOf(gameName, implicit) {
	return implicit.precaution ? `${gameName} may use for a companion port, so it's kept free` : `${gameName} uses for ${implicit.label}`;
}

/** The lowest port above the game port and everything held next to it. */
export function firstSafePort(gamePort, implicit) {
	return gamePort + Math.max(...implicit.map((i) => i.offset)) + 1;
}

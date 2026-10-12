// The launch-line flags that carry each port. -publicport follows the game port
// (Palworld passes the same number twice).
export const SCRIPT_FLAGS = {
	port: ["port", "publicport", "serverport"],
	queryPort: ["queryport", "reliableport"],
	rconPort: ["rconport"],
};

/** Ports a start script sets, for the games whose entry doesn't record them (ARK). */
export function detectFromScript(text) {
	const found = {};
	for (const key of Object.keys(SCRIPT_FLAGS)) {
		// String.raw: in a plain template literal \s, \? and \d lose their backslash and the pattern silently stops matching.
		const match = text.match(new RegExp(String.raw`(?:(?:^|\s)-|\?)(?:${SCRIPT_FLAGS[key].join("|")})(?:=|\s+)(\d+)`, "im"));
		if (match) found[key] = Number(match[1]);
	}
	return found;
}

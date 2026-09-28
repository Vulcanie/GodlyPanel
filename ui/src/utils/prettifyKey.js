// Turns a raw config key into a readable label when we don't have a
// hand-written one in the catalog, e.g. "bJoinNotifications" -> "Join
// Notifications", "max-players" -> "Max Players", "RCONPort" -> "RCON Port".
export function prettifyKey(key) {
	let s = key;

	if (/^b[A-Z]/.test(s)) s = s.slice(1);

	s = s.replace(/[-_]+/g, " ");
	s = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
	s = s.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
	s = s.replace(/\s+/g, " ").trim();

	return s
		.split(" ")
		.map((w) => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
		.join(" ");
}

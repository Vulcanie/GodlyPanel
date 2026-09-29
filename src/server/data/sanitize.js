// What a guest is allowed to see of a server's status.
//
// The status payload carries each server's join password, and previously went
// in full to every caller — including unauthenticated ones, since every GET
// was public. Guests get enough to see what's running and how to join;
// anything that amounts to a credential stays admin-only.
const GUEST_FIELDS = [
	"type",
	"online",
	"playerCount",
	"playerList",
	"maxplayers",
	"ping",
	"sessionName",
	"joinAddress",
];

export function sanitizeServerStatus(status, role) {
	if (role === "admin") return status;
	const entry = {};
	for (const field of GUEST_FIELDS) {
		if (status?.[field] !== undefined) entry[field] = status[field];
	}
	return entry;
}

export function sanitizeStatusMap(statusMap, role) {
	if (role === "admin") return statusMap;
	const out = {};
	for (const [name, value] of Object.entries(statusMap)) {
		out[name] = sanitizeServerStatus(value, role);
	}
	return out;
}

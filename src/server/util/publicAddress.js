// The address people outside use to reach this PC's game servers: a public IPv4 address or a domain name, typed by the owner.
// People paste what they have ("http://50.82.40.142:8765/", "Play.Example.com "), so this keeps just the host.

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/**
 * The host in whatever was typed, or "" for nothing, or null when it isn't an address.
 * @param {unknown} text
 * @returns {string | null}
 */
export function normalisePublicAddress(text) {
	let value = String(text ?? "").trim().toLowerCase();
	if (value === "") return "";
	value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // a scheme
	value = value.replace(/[/?#].*$/, ""); // a path
	value = value.replace(/:\d{1,5}$/, ""); // a port: each server's own is added
	if (IPV4.test(value)) return value.split(".").every((part) => Number(part) <= 255) ? value : null;
	return HOSTNAME.test(value) ? value : null;
}

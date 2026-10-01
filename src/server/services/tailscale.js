import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setOwnMeshNames } from "../middleware/lanOnly.js";

// Is Tailscale on this PC, is it connected, and what are this PC's addresses on it? Read from
// Tailscale's own command line (`tailscale status --json`), which only reports; nothing here
// changes Tailscale.

const CANDIDATES = [
	path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Tailscale", "tailscale.exe"),
	path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Tailscale", "tailscale.exe"),
];

const exeFound = () => CANDIDATES.find((p) => fs.existsSync(p)) ?? null;

/** What `tailscale status --json` said, in the few fields the panel uses. Pure, for testing. */
export function parseTailscale(json) {
	const self = json?.Self ?? {};
	const ips = (self.TailscaleIPs ?? json?.TailscaleIPs ?? []).filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
	const dnsName = String(self.DNSName ?? "").replace(/\.$/, "").toLowerCase();
	const state = String(json?.BackendState ?? "Unknown");
	return {
		state, // Running, NeedsLogin, Stopped, Starting, NoState...
		running: state === "Running",
		ips,
		dnsName: dnsName || null,
		shortName: dnsName ? dnsName.split(".")[0] : null,
		tailnet: json?.CurrentTailnet?.Name ?? null,
		peers: Object.keys(json?.Peer ?? {}).length,
	};
}

let cache = { at: 0, value: null };

/** `{ installed: false }`, or `{ installed: true, ...parseTailscale }`. Cached for a short while. */
export function tailscaleStatus({ force = false } = {}) {
	if (!force && cache.value && Date.now() - cache.at < 15_000) return Promise.resolve(cache.value);
	const exe = exeFound();
	if (!exe) {
		cache = { at: Date.now(), value: { installed: false } };
		setOwnMeshNames([]);
		return Promise.resolve(cache.value);
	}
	return new Promise((resolve) => {
		execFile(exe, ["status", "--json"], { windowsHide: true, timeout: 8000, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
			let value;
			try {
				value = { installed: true, ...parseTailscale(JSON.parse(stdout)) };
			} catch {
				// Installed but not answering: the service is stopped, or it's still starting.
				value = { installed: true, running: false, state: "Unavailable", ips: [], dnsName: null, shortName: null, tailnet: null, peers: 0, error: error?.message?.split("\n")[0] ?? "no answer" };
			}
			setOwnMeshNames([value.dnsName, value.shortName].filter(Boolean));
			cache = { at: Date.now(), value };
			resolve(value);
		});
	});
}

import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { resolveResource } from "../../shared/resources.js";
import { findServerProcesses } from "./serverProcesses.js";
import { describePorts } from "./serverPorts.js";
import { templateOfServer } from "./serverCreationService.js";
import { implicitPortsOf } from "../data/portRules.js";

// "Can my friends actually join?" The usual reasons they can't are a closed firewall, a
// closed router, and a wrong address. The panel can look at the first directly (Windows
// Firewall's own rule list, read-only) and the third (this PC's addresses); the router it
// can only describe, since nothing on this PC can see through it.
//
// A port is "open" here when an enabled inbound allow rule covers it: a rule for the port
// and protocol, or a rule for the game's program (what Windows creates when someone clicks
// "Allow access" on its prompt).

const SCRIPT = resolveResource("scripts/firewall-rules.ps1");
const CACHE_MS = 30_000;
let cache = null;

// A filter field that isn't limiting anything: blank, "Any" or "*".
const UNSET = /^(any|\*)?$/i;

const expandEnv =(text) => String(text ?? "").replace(/%([^%]+)%/g, (whole, key) => process.env[key] ?? whole);
const samePath = (a, b) => path.resolve(expandEnv(a)).toLowerCase() === path.resolve(expandEnv(b)).toLowerCase();

/** Every enabled inbound allow rule. Throws if Windows Firewall can't be read. */
export function readFirewallRules({ force = false } = {}) {
	if (!force && cache && Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.rules);
	return new Promise((resolve, reject) => {
		execFile("powershell", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", SCRIPT], { windowsHide: true, timeout: 45_000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
			if (error && !stdout) return reject(new Error(`Couldn't read Windows Firewall: ${error.message}`));
			try {
				const parsed = JSON.parse(stdout);
				const rules = (Array.isArray(parsed) ? parsed : [parsed]).filter(Boolean);
				cache = { at: Date.now(), rules };
				resolve(rules);
			} catch {
				reject(new Error("Couldn't understand what Windows Firewall returned."));
			}
		});
	});
}

export const forgetFirewallCache = () => {
	cache = null;
};

// ---- matching (pure) -------------------------------------------------------------

/** Does a rule's port list ("Any", "8892", "8892-8895", "1,2") include this port? */
export function portCovered(specs, port) {
	const list = Array.isArray(specs) ? specs : [specs];
	if (list.length === 0) return true; // no port limit on the rule
	return list.some((spec) =>
		String(spec ?? "")
			.split(",")
			.some((part) => {
				const p = part.trim();
				if (p === "" || /^any$/i.test(p)) return true;
				const range = /^(\d+)-(\d+)$/.exec(p);
				if (range) return port >= Number(range[1]) && port <= Number(range[2]);
				return /^\d+$/.test(p) && Number(p) === port;
			}),
	);
}

const protocolCovered = (ruleProtocol, wanted) => {
	const p = String(ruleProtocol ?? "").toUpperCase();
	return p === "ANY" || p === "" || p === wanted || (wanted === "TCP" && p === "6") || (wanted === "UDP" && p === "17");
};

const profilesOf = (rule) => {
	const p = String(rule.profile ?? "Any");
	return /any|all/i.test(p) ? "all networks" : p.replace(/,\s*/g, " and ");
};

/**
 * For each port a server needs, whether a rule lets it in.
 * @param {{ port: number, protocol: "TCP"|"UDP", label?: string }[]} needs
 * @param {string[]} programs  full paths of the game's program(s)
 * @param {object[]} rules     from readFirewallRules
 */
export function evaluateFirewall(needs, programs, rules) {
	return needs.map((need) => {
		const hit = rules.find((rule) => {
			// A rule for one user, one Store app or one service says nothing about a game server.
			if (rule.restricted) return false;
			if (rule.service && !UNSET.test(String(rule.service))) return false;
			if (rule.package && !UNSET.test(String(rule.package))) return false;
			if (!protocolCovered(rule.protocol, need.protocol)) return false;
			const program = String(rule.program ?? "Any");
			const programMatches = /^any$/i.test(program) || programs.some((exe) => samePath(program, exe));
			if (!programMatches) return false;
			const portsAny = portCovered(rule.localPort, need.port);
			// A rule limited to a program and any port covers it; a rule for other ports doesn't.
			return portsAny;
		});
		const remote = (Array.isArray(hit?.remote) ? hit.remote : [hit?.remote]).filter(Boolean).map(String);
		const lanOnly = Boolean(hit) && remote.length > 0 && !remote.some((r) => /^any$/i.test(r) || r === "*");
		return { ...need, open: Boolean(hit), lanOnly, rule: hit?.name ?? null, networks: hit ? profilesOf(hit) : null, publicToo: hit ? /any|public/i.test(String(hit.profile)) : false };
	});
}

// ---- what a server needs -------------------------------------------------------------

/** The ports other people need to reach to join this server, with the protocol each uses. */
export async function portsPlayersNeed(server) {
	const { current } = await describePorts(server);
	const template = templateOfServer(server);
	const needs = [];
	const add = (port, protocol, label) => {
		if (Number.isInteger(port) && port > 0 && !needs.some((n) => n.port === port && n.protocol === protocol)) needs.push({ port, protocol, label });
	};

	if (server.type === "minecraft") {
		add(current.port ?? server.port, "TCP", "Game port");
		return needs;
	}
	if (server.type === "7days") {
		add(current.port, "TCP", "Game port");
		for (const offset of [0, 1, 2]) add((current.port ?? 0) + offset, "UDP", "Game port");
		return needs;
	}
	add(current.port, "UDP", "Game port");
	// Palworld's "query" port is its REST API, which only the panel uses (TCP, on this PC).
	if (server.type === "Palword") return needs;
	for (const i of implicitPortsOf(template)) if (!i.precaution && current.port) add(current.port + i.offset, "UDP", i.label);
	// The query port is what server browsers and most clients ask first.
	if (current.queryPort && current.queryPort !== current.port) add(current.queryPort, "UDP", "Query port");
	return needs;
}

async function programsOf(server) {
	const found = await findServerProcesses(server).catch(() => ({ owned: [] }));
	const programs = found.owned.map((p) => p.path).filter(Boolean);
	if (server.processName && server.installDir) programs.push(path.join(server.workingDir || server.installDir, server.processName));
	if (server.launch?.exe) programs.push(server.launch.exe);
	return [...new Set(programs)];
}

/** This PC's own addresses on the local network, for telling friends on it how to join. */
export function lanAddresses() {
	const out = [];
	for (const [name, list] of Object.entries(os.networkInterfaces())) {
		for (const a of list ?? []) {
			if (a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254.")) out.push({ name, address: a.address });
		}
	}
	return out;
}

export async function firewallReport(server, { force = false } = {}) {
	const needs = await portsPlayersNeed(server);
	let rules;
	try {
		rules = await readFirewallRules({ force });
	} catch (err) {
		return { readable: false, error: err.message, needs, ports: needs.map((n) => ({ ...n, open: null })) };
	}
	const ports = evaluateFirewall(needs, await programsOf(server), rules);
	return { readable: true, needs, ports, allOpen: ports.length > 0 && ports.every((p) => p.open), missing: ports.filter((p) => !p.open) };
}

// ---- adding a rule ---------------------------------------------------------------------

const ruleNameFor = (server) => `GodlyPanel - ${String(server.name).replace(/[^A-Za-z0-9 ._-]/g, "").trim().slice(0, 60) || "server"}`;

/**
 * The commands that would open a server's ports. Nothing here runs them: adding a rule needs
 * administrator rights, so `runElevated` (below) asks Windows for them with its normal prompt.
 */
export function ruleCommands(server, ports, { publicNetworks = false } = {}) {
	const name = ruleNameFor(server);
	const profile = publicNetworks ? "Any" : "Private,Domain";
	const by = { TCP: [], UDP: [] };
	for (const p of ports) {
		if (!Number.isInteger(p.port) || p.port < 1 || p.port > 65535) throw new Error("A port in that list isn't valid.");
		if (p.protocol in by && !by[p.protocol].includes(p.port)) by[p.protocol].push(p.port);
	}
	const commands = [];
	for (const [protocol, list] of Object.entries(by)) {
		if (list.length === 0) continue;
		commands.push(`New-NetFirewallRule -DisplayName '${name} (${protocol})' -Direction Inbound -Action Allow -Protocol ${protocol} -LocalPort ${list.sort((a, b) => a - b).join(",")} -Profile ${profile} | Out-Null`);
	}
	return { name, profile, commands };
}

/** Run those commands with administrator rights; Windows shows its usual permission prompt. */
export function runElevated(commands) {
	const script = commands.join("; ");
	const encoded = Buffer.from(script, "utf16le").toString("base64");
	return new Promise((resolve, reject) => {
		execFile(
			"powershell",
			["-NoProfile", "-NonInteractive", "-Command", `Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile','-EncodedCommand','${encoded}'`],
			{ windowsHide: true, timeout: 120_000 },
			(error, _stdout, stderr) => {
				forgetFirewallCache();
				if (error) reject(new Error(/canceled|cancelled/i.test(stderr) ? "The permission prompt was declined, so nothing was changed." : `Couldn't add the rule: ${stderr || error.message}`));
				else resolve();
			},
		);
	});
}

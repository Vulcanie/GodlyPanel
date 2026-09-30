import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { portCovered, evaluateFirewall, ruleCommands } from "../../src/server/services/firewallCheck.js";

describe("firewall rule matching", () => {
	it("reads Windows' port lists: any, one, a range, a list", () => {
		assert.equal(portCovered(["Any"], 8892), true);
		assert.equal(portCovered([], 8892), true, "no port limit means all");
		assert.equal(portCovered(["8892"], 8892), true);
		assert.equal(portCovered(["8892"], 8893), false);
		assert.equal(portCovered(["8892-8895"], 8894), true);
		assert.equal(portCovered(["8892-8895"], 8896), false);
		assert.equal(portCovered(["80,443,8892"], 8892), true);
		assert.equal(portCovered(["80", "8892-8895"], 8893), true);
		assert.equal(portCovered(["RPC"], 135), false, "named groups aren't numbers");
	});

	const rule = (over) => ({ name: "r", profile: "Any", protocol: "UDP", localPort: ["Any"], program: "Any", ...over });
	const need = (port, protocol = "UDP") => ({ port, protocol, label: "Game port" });
	const exe = "C:\\Servers\\valheim\\valheim_server.exe";

	it("finds a rule for the port and protocol", () => {
		const [r] = evaluateFirewall([need(2456)], [exe], [rule({ name: "Valheim", localPort: ["2456-2458"] })]);
		assert.equal(r.open, true);
		assert.equal(r.rule, "Valheim");
		assert.equal(r.networks, "all networks");
	});

	it("doesn't count a rule for the wrong protocol or port", () => {
		assert.equal(evaluateFirewall([need(2456)], [exe], [rule({ protocol: "TCP", localPort: ["2456"] })])[0].open, false);
		assert.equal(evaluateFirewall([need(2456)], [exe], [rule({ localPort: ["2457"] })])[0].open, false);
		assert.equal(evaluateFirewall([need(2456)], [exe], [])[0].open, false);
	});

	it("counts a rule for the game's program, which is what Windows creates when 'Allow access' is clicked", () => {
		const r = evaluateFirewall([need(2456), need(2457)], [exe], [rule({ protocol: "Any", program: "c:\\servers\\VALHEIM\\valheim_server.exe", profile: "Private" })]);
		assert.ok(r.every((x) => x.open));
		assert.equal(r[0].networks, "Private");
		assert.equal(r[0].publicToo, false);
	});

	it("ignores a rule for some other program", () => {
		assert.equal(evaluateFirewall([need(2456)], [exe], [rule({ protocol: "Any", program: "C:\\Other\\game.exe" })])[0].open, false);
		assert.equal(evaluateFirewall([need(2456)], [exe], [rule({ program: "C:\\Other\\game.exe", localPort: ["2456"] })])[0].open, false);
	});

	it("understands protocol numbers and environment variables in paths", () => {
		assert.equal(evaluateFirewall([need(25565, "TCP")], [], [rule({ protocol: "6", localPort: ["25565"] })])[0].open, true);
		assert.equal(evaluateFirewall([need(1, "UDP")], [], [rule({ protocol: "17" })])[0].open, true);
		const sys = `${process.env.SystemRoot}\\system32\\svchost.exe`;
		assert.equal(evaluateFirewall([need(7680)], [sys], [rule({ program: "%SystemRoot%\\system32\\svchost.exe", localPort: ["7680"] })])[0].open, true);
	});
});

describe("the rule the panel would add", () => {
	const server = { name: "My Server: 1!" };

	it("groups ports by protocol, sorted, for private and domain networks by default", () => {
		const plan = ruleCommands(server, [{ port: 8893, protocol: "UDP" }, { port: 8892, protocol: "UDP" }, { port: 25565, protocol: "TCP" }, { port: 8892, protocol: "UDP" }]);
		assert.equal(plan.profile, "Private,Domain");
		assert.equal(plan.commands.length, 2);
		assert.match(plan.commands[0], /-Protocol TCP -LocalPort 25565 -Profile Private,Domain/);
		assert.match(plan.commands[1], /-Protocol UDP -LocalPort 8892,8893 /);
		assert.match(plan.commands[1], /-DisplayName 'GodlyPanel - My Server 1 \(UDP\)'/);
		assert.match(plan.commands[1], /-Direction Inbound -Action Allow/);
	});

	it("includes public networks only when asked", () => {
		assert.match(ruleCommands(server, [{ port: 1000, protocol: "UDP" }], { publicNetworks: true }).commands[0], /-Profile Any/);
	});

	it("refuses anything that isn't a port number, so a value can't become part of a command", () => {
		for (const port of ["8892; calc", 0, 65536, -1, 1.5, null, "x"]) {
			assert.throws(() => ruleCommands(server, [{ port, protocol: "UDP" }]), /isn't valid/);
		}
	});

	it("can't be talked into a name that breaks the command", () => {
		const plan = ruleCommands({ name: "a'; Remove-Item C:\\ -Recurse; '" }, [{ port: 1000, protocol: "UDP" }]);
		// Only plain characters reach the quoted name, so there is no quote to break out of.
		assert.match(plan.commands[0], /^New-NetFirewallRule -DisplayName '[A-Za-z0-9 ._()-]+' -Direction/);
	});
});

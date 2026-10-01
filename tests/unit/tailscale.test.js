import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTailscale } from "../../src/server/services/tailscale.js";
import { isAllowed, isExpectedHost, setOwnMeshNames } from "../../src/server/middleware/lanOnly.js";

describe("reading what Tailscale reports", () => {
	const running = {
		BackendState: "Running",
		Self: { DNSName: "Godly-PC.tail1234.ts.net.", TailscaleIPs: ["100.101.102.103", "fd7a:115c:a1e0::1"] },
		CurrentTailnet: { Name: "someone@example.com" },
		Peer: { a: {}, b: {}, c: {} },
	};

	it("picks out the address, name and state", () => {
		const t = parseTailscale(running);
		assert.equal(t.running, true);
		assert.deepEqual(t.ips, ["100.101.102.103"]);
		assert.equal(t.dnsName, "godly-pc.tail1234.ts.net");
		assert.equal(t.shortName, "godly-pc");
		assert.equal(t.peers, 3);
	});

	it("says when it needs signing in or is stopped", () => {
		assert.equal(parseTailscale({ BackendState: "NeedsLogin" }).running, false);
		assert.equal(parseTailscale({ BackendState: "Stopped", Self: {} }).state, "Stopped");
		assert.deepEqual(parseTailscale({}).ips, []);
	});
});

describe("opening the panel through Tailscale", () => {
	it("accepts a person's Tailscale address (from their own device or a shared one)", () => {
		assert.equal(isAllowed("100.88.12.9", { allowCgnat: true }), true);
		assert.equal(isAllowed("100.88.12.9", { allowCgnat: false }), false);
		// An address outside Tailscale's range is still refused.
		assert.equal(isAllowed("100.200.1.1", { allowCgnat: true }), false);
		assert.equal(isAllowed("8.8.8.8", { allowCgnat: true }), false);
	});

	it("accepts this PC's own Tailscale name, and no other name", () => {
		assert.equal(isExpectedHost("godly-pc.tail1234.ts.net:8765"), false, "not before Tailscale has told the panel its name");
		setOwnMeshNames(["godly-pc.tail1234.ts.net", "godly-pc"]);
		try {
			assert.equal(isExpectedHost("godly-pc.tail1234.ts.net:8765"), true);
			assert.equal(isExpectedHost("GODLY-PC.tail1234.ts.net"), true);
			assert.equal(isExpectedHost("someone-else.tail1234.ts.net:8765"), false);
			assert.equal(isExpectedHost("evil.example.com:8765"), false);
		} finally {
			setOwnMeshNames([]);
		}
	});
});

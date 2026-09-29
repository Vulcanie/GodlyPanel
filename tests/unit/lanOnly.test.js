import { describe, it } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { isAllowed, isExpectedHost } from "../../src/server/middleware/lanOnly.js";
import { normaliseIp } from "../../src/server/middleware/auth.js";

describe("LAN-only address filter", () => {
	it("accepts loopback and the private IPv4 ranges", () => {
		for (const ip of ["127.0.0.1", "10.0.0.5", "10.255.255.254", "172.16.0.1", "172.31.255.255", "192.168.1.20"]) {
			assert.equal(isAllowed(ip), true, ip);
		}
	});

	it("refuses public IPv4, including the addresses just outside the private ranges", () => {
		for (const ip of ["8.8.8.8", "1.1.1.1", "172.15.255.255", "172.32.0.1", "192.167.1.1", "11.0.0.1", "203.0.113.9"]) {
			assert.equal(isAllowed(ip), false, ip);
		}
	});

	it("treats Tailscale-style CGNAT addresses as a toggle", () => {
		assert.equal(isAllowed("100.64.1.1", {}), true, "on by default");
		assert.equal(isAllowed("100.64.1.1", { allowCgnat: false }), false);
		assert.equal(isAllowed("100.128.0.1", {}), false, "just past the 100.64/10 block");
	});

	it("treats link-local addresses as a toggle", () => {
		assert.equal(isAllowed("169.254.10.10", {}), true);
		assert.equal(isAllowed("169.254.10.10", { allowLinkLocal: false }), false);
	});

	it("honours extra allowed networks and single addresses", () => {
		assert.equal(isAllowed("10.8.0.4", { extraAllowedCidrs: ["10.8.0.0/24"] }), true);
		assert.equal(isAllowed("203.0.113.9", { extraAllowedCidrs: ["203.0.113.9"] }), true);
		assert.equal(isAllowed("203.0.113.10", { extraAllowedCidrs: ["203.0.113.9"] }), false);
		assert.equal(isAllowed("8.8.8.8", { extraAllowedCidrs: ["not-a-cidr", "999.1.1.1/8"] }), false);
	});

	it("allows local IPv6 but refuses globally routable addresses", () => {
		assert.equal(isAllowed("::1"), true);
		assert.equal(isAllowed("fd12:3456:789a::1"), true);
		assert.equal(isAllowed("fe80::1"), true);
		assert.equal(isAllowed("2001:4860:4860::8888"), false, "a public IPv6 address is the realistic accidental exposure");
	});

	it("refuses an address it can't read", () => {
		assert.equal(isAllowed(""), false);
		assert.equal(isAllowed(undefined), false);
	});

	it("unwraps IPv4-mapped IPv6 addresses before deciding", () => {
		assert.equal(normaliseIp("::ffff:192.168.1.5"), "192.168.1.5");
		assert.equal(isAllowed(normaliseIp("::ffff:192.168.1.5")), true);
		assert.equal(isAllowed(normaliseIp("::ffff:8.8.8.8")), false);
		assert.equal(normaliseIp("fe80::1%12"), "fe80::1", "scope id stripped");
	});
});

describe("Host header check (DNS rebinding)", () => {
	it("accepts an IP address, localhost, and this computer's own name", () => {
		assert.equal(isExpectedHost("192.168.1.10:8765"), true);
		assert.equal(isExpectedHost("127.0.0.1:8765"), true);
		assert.equal(isExpectedHost("localhost:8765"), true);
		assert.equal(isExpectedHost("[::1]:8765"), true);
		assert.equal(isExpectedHost(`${os.hostname().toLowerCase()}:8765`), true);
		assert.equal(isExpectedHost(`${os.hostname().toUpperCase()}.local`), true);
	});

	it("refuses a name someone else controls", () => {
		assert.equal(isExpectedHost("evil.example.com"), false);
		assert.equal(isExpectedHost("evil.example.com:8765"), false);
		assert.equal(isExpectedHost("192.168.1.10.evil.example.com"), false);
		assert.equal(isExpectedHost(""), false);
		assert.equal(isExpectedHost(undefined), false);
	});

	it("accepts a name the owner has listed", () => {
		assert.equal(isExpectedHost("panel.home.arpa", { extraAllowedHosts: ["Panel.Home.Arpa"] }), true);
		assert.equal(isExpectedHost("other.home.arpa", { extraAllowedHosts: ["panel.home.arpa"] }), false);
	});
});

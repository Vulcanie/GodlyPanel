import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalisePublicAddress } from "../../src/server/util/publicAddress.js";
import { withoutAddress } from "../../src/server/services/serverAddresses.js";

// The public address is whatever the owner pastes; only the host is kept. And the addresses that used to be typed into servers'
// session text are taken out of it (the values are the ones found on a real install).

describe("the public address setting", () => {
	it("accepts an IPv4 address or a domain name", () => {
		assert.equal(normalisePublicAddress("50.82.40.142"), "50.82.40.142");
		assert.equal(normalisePublicAddress("play.example.com"), "play.example.com");
		assert.equal(normalisePublicAddress("API.GodlyHeroes-API.com"), "api.godlyheroes-api.com");
	});

	it("keeps only the host of what was pasted", () => {
		assert.equal(normalisePublicAddress("  50.82.40.142 "), "50.82.40.142");
		assert.equal(normalisePublicAddress("http://50.82.40.142:8765/"), "50.82.40.142");
		assert.equal(normalisePublicAddress("https://Play.Example.com/some/path?x=1"), "play.example.com");
		assert.equal(normalisePublicAddress("50.82.40.142:25565"), "50.82.40.142");
	});

	it("means nothing for blank", () => {
		assert.equal(normalisePublicAddress(""), "");
		assert.equal(normalisePublicAddress("   "), "");
		assert.equal(normalisePublicAddress(undefined), "");
	});

	it("refuses what isn't an address", () => {
		for (const bad of ["999.1.1.1", "50.82.40", "not an address", "localhost", "a b.com", "-bad.com", "exa_mple.com", "50.82.40.142.5", "<script>.com", "::1"]) {
			assert.equal(normalisePublicAddress(bad), null, bad);
		}
	});
});

describe("taking a hand-typed address out of a session name", () => {
	it("empties a session name that is only an address", () => {
		assert.equal(withoutAddress("50.82.40.142:25569"), "");
		assert.equal(withoutAddress("  play.example.com:7777 "), "");
	});

	it("keeps the name from one with an address added to it", () => {
		assert.equal(withoutAddress("GodlyHeroes( 50.82.40.142:7777 )"), "GodlyHeroes");
		assert.equal(withoutAddress("GodlyHeroes (50.82.40.142:7777)"), "GodlyHeroes");
		assert.equal(withoutAddress("Godly Heroes 50.82.40.142:7777"), "Godly Heroes");
	});

	it("leaves a real session name alone", () => {
		for (const name of ["GodlyRagnarok", "GodlyHeroes", "Server: 5 players", "Raid at 10:30", "Tier 2: Hard", "v1.2.3:beta", ""]) {
			assert.equal(withoutAddress(name), null, name);
		}
		assert.equal(withoutAddress(undefined), null);
	});
});

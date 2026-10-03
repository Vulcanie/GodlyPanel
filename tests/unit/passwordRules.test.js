import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { passwordProblem, MAX_BYTES } from "../../src/server/util/passwordRules.js";

describe("password rules", () => {
	it("accepts ordinary good passwords, passphrases and symbols", () => {
		for (const ok of ["TestAdmin!2345", "correct horse battery staple", "Zx9$kQ2#mL", "a-long-but-plain-passphrase", "пароль-длинный-123"]) {
			assert.equal(passwordProblem(ok, "someone"), null, ok);
		}
	});

	it("asks for at least 8 characters, in words a person can act on", () => {
		for (const bad of ["", "short", "1234567", undefined, null, 12345678, {}]) {
			assert.match(passwordProblem(bad), /at least 8 characters/, String(bad));
		}
	});

	it("refuses what bcrypt would silently cut short, saying so", () => {
		const longest = "a1".repeat(MAX_BYTES / 2);
		assert.equal(Buffer.byteLength(longest), MAX_BYTES);
		assert.equal(passwordProblem(longest), null, "exactly the limit is fine");
		assert.match(passwordProblem(`${longest}x`), /too long/);
		// The limit is in bytes, not letters: multi-byte characters use more of it.
		assert.match(passwordProblem("é".repeat(37)), /too long/);
	});

	it("refuses the passwords everyone tries first, whatever the capitals", () => {
		for (const bad of ["password", "Password123", "12345678", "QWERTYUIOP", "iloveyou", "aaaaaaaa", "00000000", "GodlyPanel"]) {
			assert.match(passwordProblem(bad), /most common/, bad);
		}
	});

	it("refuses a password that is just the username", () => {
		assert.match(passwordProblem("Vulcanus8", "vulcanus8"), /same as the username/);
		assert.match(passwordProblem("john.smith.1", "John_Smith_1"), /same as the username/, "punctuation and capitals don't count as different");
		assert.match(passwordProblem("Vulcanus8!", "vulcanus8"), /same as the username/, "the name plus a symbol is still the name");
		assert.equal(passwordProblem("Vulcanus8-and-dragons", "vulcanus8"), null);
	});
});

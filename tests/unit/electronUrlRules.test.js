import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { isOurOrigin, externalLink } = createRequire(import.meta.url)("../../electron/main/urlRules.cjs");

// The desktop window may only stay on the panel's own address; everything else goes to the browser, and
// only if it is an ordinary web link.

describe("the desktop window's address rules", () => {
	const own = "http://127.0.0.1:8765";

	it("stays on pages of its own address", () => {
		assert.equal(isOurOrigin("http://127.0.0.1:8765/", own), true);
		assert.equal(isOurOrigin("http://127.0.0.1:8765/settings?x=1#y", own), true);
	});

	it("does not mistake an address that merely starts the same way for its own", () => {
		// A plain "starts with" check would let all of these through.
		assert.equal(isOurOrigin("http://127.0.0.1:8765.evil.example/", own), false);
		assert.equal(isOurOrigin("http://127.0.0.1:87650/", own), false);
		assert.equal(isOurOrigin("http://127.0.0.1:80/", "http://127.0.0.1:8"), false);
		assert.equal(isOurOrigin("http://127.0.0.1:8765@evil.example/", own), false);
		assert.equal(isOurOrigin("https://127.0.0.1:8765/", own), false, "another scheme is another origin");
		assert.equal(isOurOrigin("http://localhost:8765/", own), false);
	});

	it("treats anything that isn't a readable address as foreign", () => {
		for (const bad of ["", "not a url", "javascript:alert(1)", "file:///C:/Windows/win.ini", undefined, null]) {
			assert.equal(isOurOrigin(bad, own), false, String(bad));
		}
	});

	it("hands only ordinary web links to the browser", () => {
		assert.equal(externalLink("https://github.com/Vulcanie/GodlyPanel"), "https://github.com/Vulcanie/GodlyPanel");
		assert.equal(externalLink("http://example.com/a b"), "http://example.com/a%20b");
		for (const bad of ["file:///C:/Windows/System32/calc.exe", "javascript:alert(1)", "ms-msdt:/id", "vbscript:x", "\\\\server\\share", "", "no scheme", undefined]) {
			assert.equal(externalLink(bad), null, String(bad));
		}
	});
});

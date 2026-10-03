import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sameOriginOnly } from "../../src/server/middleware/sameOrigin.js";

// Changing requests are refused when the browser says another page started them, including a page on another
// port of this same PC; everything that isn't a browser, and everything that only reads, is untouched.

function run({ method = "POST", headers = {} }) {
	const out = { passed: false };
	const res = {
		setHeader() {},
		status(code) {
			out.status = code;
			return this;
		},
		json(body) {
			out.json = body;
			return this;
		},
	};
	sameOriginOnly({ method, headers: { host: "192.168.1.9:8765", ...headers } }, res, () => (out.passed = true));
	return out;
}

describe("requests started by another page", () => {
	afterEach(() => delete process.env.GHP_ALLOW_ORIGINS);

	it("lets the panel's own page through, and typed or pasted requests", () => {
		assert.equal(run({ headers: { "sec-fetch-site": "same-origin", origin: "http://192.168.1.9:8765" } }).passed, true);
		assert.equal(run({ headers: { "sec-fetch-site": "none" } }).passed, true);
	});

	it("refuses a page from another site, and a page from another port on the same PC", () => {
		const other = run({ headers: { "sec-fetch-site": "cross-site", origin: "https://evil.example" } });
		assert.equal(other.passed, false);
		assert.equal(other.status, 403);
		assert.equal(other.json.code, "cross_origin");
		const sameSite = run({ method: "DELETE", headers: { "sec-fetch-site": "same-site", origin: "http://192.168.1.9:8080" } });
		assert.equal(sameSite.status, 403, "SameSite cookies would have been sent here; this is the gap being closed");
	});

	it("falls back to comparing addresses when a browser doesn't send the label", () => {
		assert.equal(run({ headers: { origin: "http://192.168.1.9:8765" } }).passed, true);
		assert.equal(run({ headers: { origin: "http://192.168.1.9:8080" } }).status, 403);
		assert.equal(run({ headers: { origin: "null" } }).status, 403);
		assert.equal(run({ headers: { origin: "not a url" } }).status, 403);
	});

	it("does not touch requests that only read, or that aren't from a browser", () => {
		assert.equal(run({ method: "GET", headers: { "sec-fetch-site": "cross-site" } }).passed, true);
		assert.equal(run({ method: "HEAD", headers: { origin: "https://evil.example" } }).passed, true);
		assert.equal(run({ method: "POST", headers: {} }).passed, true, "a script or the test suite sends neither header");
	});

	it("can be told about the interface's own development address", () => {
		process.env.GHP_ALLOW_ORIGINS = "http://localhost:3000, http://127.0.0.1:3000";
		assert.equal(run({ headers: { "sec-fetch-site": "cross-site", origin: "http://localhost:3000" } }).passed, true);
		assert.equal(run({ headers: { "sec-fetch-site": "cross-site", origin: "https://evil.example" } }).passed, false);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluate, seriousAdvisories } from "../../scripts/audit-prod.mjs";

// The dependency check fails on a serious vulnerability in what the app ships unless it is listed, with a reason, and not expired.

const advisory = (name, severity, ghsa) => ({ name, severity, title: `${name} problem`, url: `https://github.com/advisories/${ghsa}`, source: 1 });
// Shaped like npm's report: the advisory sits on the package that has it; the packages above it name it by string.
const report = {
	vulnerabilities: {
		"http-cache-semantics": { via: [advisory("http-cache-semantics", "high", "GHSA-aaaa-bbbb-cccc")] },
		got: { via: ["cacheable-request"] },
		gamedig: { via: ["got"] },
		"some-lib": { via: [advisory("some-lib", "moderate", "GHSA-1111-2222-3333")] },
	},
};
const allowed = { id: "GHSA-aaaa-bbbb-cccc", package: "http-cache-semantics", reason: "not used", expires: "2027-01-12" };
const NOW = new Date("2026-10-12");

describe("the check on what the app ships", () => {
	it("looks at the advisory itself, not the packages that merely depend on it, and ignores the minor ones", () => {
		assert.deepEqual(seriousAdvisories(report).map((a) => a.id), ["GHSA-aaaa-bbbb-cccc"]);
	});

	it("fails on a serious advisory that isn't listed", () => {
		const r = evaluate(report, [], NOW);
		assert.equal(r.failures.length, 1);
		assert.match(r.failures[0], /HIGH: http-cache-semantics/);
	});

	it("passes one that is listed, and says until when", () => {
		const r = evaluate(report, [allowed], NOW);
		assert.deepEqual(r.failures, []);
		assert.match(r.notes[0], /Allowed until 2027-01-12/);
	});

	it("fails once the exception has expired", () => {
		const r = evaluate(report, [allowed], new Date("2027-02-01"));
		assert.match(r.failures[0], /expired on 2027-01-12/);
	});

	it("refuses an exception with no reason or expiry", () => {
		assert.match(evaluate(report, [{ id: allowed.id }], NOW).failures[0], /without a reason and an expiry/);
		assert.match(evaluate(report, [{ ...allowed, expires: "someday" }], NOW).failures[0], /without a reason and an expiry/);
	});

	it("still fails on a different, new advisory", () => {
		const worse = { vulnerabilities: { ...report.vulnerabilities, other: { via: [advisory("other", "critical", "GHSA-9999-8888-7777")] } } };
		const r = evaluate(worse, [allowed], NOW);
		assert.equal(r.failures.length, 1);
		assert.match(r.failures[0], /CRITICAL: other/);
	});

	it("says when an exception is no longer needed", () => {
		const r = evaluate({ vulnerabilities: {} }, [allowed], NOW);
		assert.deepEqual(r.failures, []);
		assert.match(r.notes[0], /no longer reported/);
	});
});

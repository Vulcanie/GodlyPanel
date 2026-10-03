import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

// The guides link to each other, to the README and to headings inside one another. A renamed file or heading would
// leave a link that goes nowhere, so this runs the link checker (scripts/check-doc-links.mjs) as part of the tests.

describe("the documentation", () => {
	it("has no broken links or heading anchors", () => {
		const run = spawnSync(process.execPath, [path.resolve(import.meta.dirname, "..", "..", "scripts", "check-doc-links.mjs")], { encoding: "utf8" });
		assert.equal(run.status, 0, `${run.stderr}${run.stdout}`);
	});
});

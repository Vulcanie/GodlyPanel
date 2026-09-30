import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// The interface's line comparison is plain code; load it from its file and check it.
const source = fs.readFileSync(new URL("../../ui/src/utils/lineDiff.js", import.meta.url), "utf8");
const { diffLines, summarise } = await import(`data:text/javascript,${encodeURIComponent(source)}`);

const show = (d) => d.map((x) => (x.type === "same" ? " " : x.type === "add" ? "+" : "-") + x.text).join("|");

describe("comparing two versions of a file", () => {
	it("shows nothing changed as all the same", () => {
		assert.equal(show(diffLines("a\nb\n", "a\nb\n")), " a| b");
	});

	it("finds a changed line, an added line and a removed line", () => {
		assert.equal(show(diffLines("a\nb\nc", "a\nB\nc")), " a|-b|+B| c");
		assert.equal(show(diffLines("a\nc", "a\nb\nc")), " a|+b| c");
		assert.equal(show(diffLines("a\nb\nc", "a\nc")), " a|-b| c");
	});

	it("handles windows line endings and a missing final newline the same", () => {
		assert.deepEqual(summarise(diffLines("a\r\nb\r\n", "a\nb")), { added: 0, removed: 0 });
	});

	it("handles empty on either side", () => {
		assert.deepEqual(summarise(diffLines("", "x\ny")), { added: 2, removed: 1 }, "an empty file counts as one empty line");
		assert.deepEqual(summarise(diffLines("x\ny", "")), { added: 1, removed: 2 });
	});

	it("keeps unrelated changes apart", () => {
		const before = ["[A]", "x=1", "y=2", "[B]", "z=3", "w=4"].join("\n");
		const after = ["[A]", "x=9", "y=2", "[B]", "z=3", "w=5"].join("\n");
		assert.deepEqual(summarise(diffLines(before, after)), { added: 2, removed: 2 });
		assert.equal(show(diffLines(before, after)), " [A]|-x=1|+x=9| y=2| [B]| z=3|-w=4|+w=5");
	});

	it("copes with very large files by replacing the middle rather than hanging", () => {
		const a = Array.from({ length: 3000 }, (_, i) => `a${i}`).join("\n");
		const b = Array.from({ length: 3000 }, (_, i) => `b${i}`).join("\n");
		const t0 = Date.now();
		const d = diffLines(a, b);
		assert.ok(Date.now() - t0 < 2000);
		assert.deepEqual(summarise(d), { added: 3000, removed: 3000 });
	});
});

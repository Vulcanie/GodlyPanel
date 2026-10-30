import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeResults } from "../../scripts/measure-compression.mjs";

describe("describeResults", () => {
	it("shows the archive as a percentage of the raw folder size", () => {
		const lines = describeResults([{ variant: "zip level 6", bytes: 250, raw: 1000, seconds: 0.5 }]);
		const row = lines.find((line) => line.startsWith("zip level 6"));
		assert.ok(row.includes("25%"), row);
	});

	it("puts the smallest archive first", () => {
		const lines = describeResults([
			{ variant: "big", bytes: 500, raw: 1000, seconds: 1 },
			{ variant: "small", bytes: 100, raw: 1000, seconds: 1 },
			{ variant: "middle", bytes: 300, raw: 1000, seconds: 1 },
		]);
		const order = lines.filter((line) => /^(big|small|middle)\b/.test(line)).map((line) => line.split(" ")[0]);
		assert.deepEqual(order, ["small", "middle", "big"]);
	});

	it("renders a failed row with its error and after the rows that worked", () => {
		const lines = describeResults([
			{ variant: "broken", raw: 1000, error: "tar failed: Undefined option: `zip:bogus'" },
			{ variant: "fine", bytes: 400, raw: 1000, seconds: 2 },
		]);
		const failed = lines.find((line) => line.startsWith("broken"));
		assert.ok(failed.includes("tar failed: Undefined option: `zip:bogus'"), failed);
		assert.ok(lines.indexOf(failed) > lines.findIndex((line) => line.startsWith("fine")));
	});
});

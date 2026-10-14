import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createZip, extractZip } from "../../src/server/util/tarZip.js";

describe("names handed to tar", () => {
	it("never start with a dash, which tar would read as an option (some run programs)", async () => {
		await assert.rejects(extractZip("x.zip", "out", ["--use-compress-program=calc"]), /read as options/);
		await assert.rejects(createZip("x.zip", [{ dir: "d", name: "-C" }]), /read as options/);
		await assert.rejects(extractZip("x.zip", "out", [""]), /can't be used/);
	});
});

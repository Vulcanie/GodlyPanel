import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makePng, makeJpeg } from "../helpers/images.js";
import { sniffImage, describeFit, RECOMMENDED } from "../../src/server/util/imageMeta.js";

// Uploaded banners are identified by their own bytes, never by the filename or
// the browser's content type, because the file is written to disk and served
// back later.

describe("image sniffing", () => {
	it("reads a PNG's size from its header", () => {
		assert.deepEqual(sniffImage(makePng(1920, 620)), {
			format: "png",
			ext: "png",
			contentType: "image/png",
			width: 1920,
			height: 620,
		});
	});

	it("reads a JPEG's size, including progressive and other SOF variants", () => {
		assert.equal(sniffImage(makeJpeg(1920, 620)).width, 1920);
		assert.equal(sniffImage(makeJpeg(1920, 620)).height, 620);
		assert.equal(sniffImage(makeJpeg(800, 300, { sof: 0xc2 })).width, 800, "progressive");
	});

	it("refuses things that aren't images, whatever they're called", () => {
		assert.equal(sniffImage(Buffer.from("<html>not an image</html>".repeat(5))), null);
		assert.equal(sniffImage(Buffer.from("MZ" + "\0".repeat(200))), null, "an executable");
		assert.equal(sniffImage(Buffer.alloc(0)), null);
		assert.equal(sniffImage("a string"), null);
	});

	it("refuses a truncated header", () => {
		assert.equal(sniffImage(makePng(10, 10).subarray(0, 12)), null);
		assert.equal(sniffImage(makeJpeg(10, 10).subarray(0, 6)), null);
	});

	it("refuses a PNG whose first chunk isn't IHDR", () => {
		const broken = makePng(10, 10);
		broken.write("XXXX", 12, "ascii");
		assert.equal(sniffImage(broken), null);
	});
});

describe("fit advice", () => {
	it("says nothing about the recommended size", () => {
		assert.deepEqual(describeFit(RECOMMENDED), []);
	});

	it("warns about a small image and a too-tall one, but never refuses", () => {
		assert.match(describeFit({ width: 400, height: 200 }).join(" "), /soft/);
		assert.match(describeFit({ width: 1200, height: 900 }).join(" "), /tall for a banner/);
		assert.match(describeFit({ width: 4000, height: 400 }).join(" "), /very wide/);
	});
});

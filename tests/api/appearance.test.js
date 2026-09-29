import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, GUEST } from "../helpers/instance.js";
import { makePng, makeJpeg } from "../helpers/images.js";

// How each game type looks on the dashboard. Deliberately never asks for the
// automatic Steam artwork, so these tests don't touch the network.

describe("appearance", () => {
	let panel;
	let api;
	let guestCookie;

	before(async () => {
		panel = await startInstance({
			servers: (dir) => [
				serverEntry(dir, { name: "A", type: "custom", processName: "a.exe" }),
				serverEntry(dir, { name: "B", type: "minecraft", processName: "b.exe" }),
			],
		});
		api = panel.api;
		guestCookie = await api.cookieFor(GUEST);
	});
	after(() => panel.stop());

	const artFile = (name) => path.join(panel.dir, "art", name);

	it("lists a card for each game type, defaulting to automatic", async () => {
		const { types } = (await api.get("/api/appearance")).json;
		assert.deepEqual(Object.keys(types).sort(), ["custom", "minecraft"]);
		assert.equal(types.custom.mode, "auto");
	});

	it("lets a guest read how a card looks, but not change it", async () => {
		assert.equal((await api.get("/api/appearance", { cookie: guestCookie })).status, 200);
		assert.equal((await api.put("/api/appearance/custom", { mode: "color" }, { cookie: guestCookie })).status, 403);
		assert.equal((await api.upload("/api/appearance/custom/image", "image", "x.png", makePng(4, 4))).status, 200, "the admin can");
		await api.del("/api/appearance/custom/image");
	});

	it("saves a colour choice, and quietly drops a malformed colour instead of failing", async () => {
		const set = await api.put("/api/appearance/minecraft", { mode: "color", color: "#1f4d2c", color2: "#4caf50" });
		assert.equal(set.status, 200);
		assert.equal(set.json.color, "#1f4d2c");
		const bad = await api.put("/api/appearance/minecraft", { color: "rgb(1,2,3)" });
		assert.equal(bad.status, 200);
		assert.equal(bad.json.color, "#1f4d2c", "the bad value was ignored");
	});

	it("a solid colour means no image is served", async () => {
		assert.equal((await api.get("/api/art/minecraft")).status, 404);
	});

	it("refuses an unknown mode and a non-numeric Steam app id", async () => {
		assert.equal((await api.put("/api/appearance/minecraft", { mode: "rainbow" })).status, 400);
		const badId = await api.put("/api/appearance/minecraft", { appId: "not-a-number" });
		assert.equal(badId.status, 400);
		assert.match(badId.json.error, /number/);
	});

	it("refuses a game type that could be used to reach other files", async () => {
		for (const type of ["..%2f..%2fconfig", "a%2fb", "CON:", "%00"]) {
			const put = await api.put(`/api/appearance/${type}`, { mode: "color" });
			assert.ok([400, 404].includes(put.status), `PUT ${type} -> ${put.status}`);
			const up = await api.upload(`/api/appearance/${type}/image`, "image", "x.png", makePng(4, 4));
			assert.ok([400, 404].includes(up.status), `upload ${type} -> ${up.status}`);
		}
		assert.equal(fs.existsSync(path.join(panel.dir, "config.json")), true);
	});

	describe("uploading your own banner", () => {
		it("stores a PNG, reports its size, and serves back exactly the bytes", async () => {
			const png = makePng(1920, 620);
			const r = await api.upload("/api/appearance/minecraft/image", "image", "banner.png", png);
			assert.equal(r.status, 200);
			assert.equal(r.json.mode, "image");
			assert.deepEqual([r.json.image.width, r.json.image.height], [1920, 620]);
			assert.deepEqual(r.json.notes, [], "no advice for the recommended size");

			const served = await fetch(`${panel.base}/api/art/minecraft`, { headers: { Cookie: api.cookie } });
			assert.equal(served.headers.get("content-type"), "image/png");
			assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
		});

		it("advises about an awkward size without refusing it", async () => {
			const r = await api.upload("/api/appearance/custom/image", "image", "tiny.png", makePng(10, 10));
			assert.equal(r.status, 200);
			assert.ok(r.json.notes.length >= 1);
		});

		it("takes the format from the bytes: a JPEG replaces a PNG and the old file is cleaned up", async () => {
			assert.equal(fs.existsSync(artFile("minecraft.png")), true);
			const r = await api.upload("/api/appearance/minecraft/image", "image", "renamed.png", makeJpeg(1920, 620));
			assert.equal(r.status, 200);
			assert.equal(fs.existsSync(artFile("minecraft.jpg")), true);
			assert.equal(fs.existsSync(artFile("minecraft.png")), false);
			const served = await fetch(`${panel.base}/api/art/minecraft`, { headers: { Cookie: api.cookie } });
			assert.equal(served.headers.get("content-type"), "image/jpeg");
		});

		it("refuses things that only claim to be images", async () => {
			for (const [name, bytes] of [
				["fake.png", fs.readFileSync(process.execPath).subarray(0, 4096)],
				["fake.jpg", Buffer.from("<html>error page</html>")],
			]) {
				const r = await api.upload("/api/appearance/minecraft/image", "image", name, bytes);
				assert.equal(r.status, 400, name);
				assert.match(r.json.error, /PNG or JPEG/);
			}
		});

		it("answers an oversized file with 413 and the limit, not a bare 500", async () => {
			const r = await api.upload("/api/appearance/minecraft/image", "image", "big.png", Buffer.alloc(13 * 1024 * 1024, 1));
			assert.equal(r.status, 413);
			assert.match(r.json.error, /12 MB/);
		});

		it("explains a wrong form field and a missing file", async () => {
			const wrong = await api.upload("/api/appearance/minecraft/image", "banner", "x.png", makePng(4, 4));
			assert.equal(wrong.status, 400);
			assert.match(wrong.json.error, /"image"/);
			assert.equal((await api.post("/api/appearance/minecraft/image")).status, 400);
		});

		it("removing the image goes back to automatic and deletes the file", async () => {
			const r = await api.del("/api/appearance/minecraft/image");
			assert.equal(r.status, 200);
			assert.equal(r.json.mode, "auto");
			assert.equal(fs.existsSync(artFile("minecraft.jpg")), false);
		});

		it("never reveals the stored filename to viewers", async () => {
			await api.upload("/api/appearance/minecraft/image", "image", "x.png", makePng(4, 4));
			const view = (await api.get("/api/appearance", { cookie: guestCookie })).json.types.minecraft;
			assert.deepEqual(Object.keys(view.image).sort(), ["bytes", "height", "width"]);
		});
	});
});

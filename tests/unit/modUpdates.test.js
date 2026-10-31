import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

// Checking for mod updates and applying one. A check only reports; an update is an explicit call for one lock entry, and a failed one
// puts the old files back byte for byte and leaves the lock as it was. The stand-in server runs on 127.0.0.1, so the loopback test hook
// is on for this file.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-upd-"));
const tmp = path.join(root, "tmp");
fs.mkdirSync(tmp, { recursive: true });
// The update's staging folder comes from the temp folder: keep this file's own, so it can check nothing is left behind.
process.env.TMPDIR = tmp;
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.GHP_DATA_DIR = path.join(root, "data");
const savedLoopback = process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = "1";

const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const { initSecrets } = await import("../../src/server/config/secretsStore.js");
const { ModError, setModEnabled } = await import("../../src/server/services/modService.js");
const { registerProvider } = await import("../../src/server/services/modSources/index.js");
const { installFromSource } = await import("../../src/server/services/modSources/installer.js");
const { recordInstalled } = await import("../../src/server/services/modRecord.js");
const { checkUpdates, applyUpdate } = await import("../../src/server/services/modUpdates.js");
const lock = await import("../../src/server/services/modLock.js");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sha512 = (bytes) => crypto.createHash("sha512").update(bytes).digest("hex");
const leftovers = () => fs.readdirSync(tmp).filter((n) => n.startsWith("ghp-modupd-"));

// What the fake source can offer, by ref. A version's file is served only when `serve` says so; a version whose file is not served
// fails its download, which is how a failing update is made.
const catalog = new Map();
const served = new Map();
let base;
let stand;

// Puts a version in the catalog. Its file is served at a path unique to that version.
function offer(ref, { version, file, bytes, serve = true, ...extra }) {
	const urlPath = `/files/${ref}/${version}/${file}`;
	if (serve) served.set(urlPath, bytes);
	else served.delete(urlPath);
	catalog.set(ref, { version, file, bytes, path: urlPath, ...extra });
}

let folders = 0;
/** A fresh Minecraft server, so each test starts with an empty mods folder. */
function freshServer() {
	folders += 1;
	const folder = path.join(root, "data", "servers", `mc-${folders}`);
	fs.mkdirSync(folder, { recursive: true });
	return { server: { name: `Upd ${folders}`, type: "minecraft", installDir: folder, workingDir: folder }, mods: path.join(folder, "mods") };
}

/** Installs what the source offers now, and records it in the lock, the way the install route does. */
async function install(server, modsDir, ref) {
	const result = await installFromSource(server, "fakeupd", ref, {});
	await recordInstalled(server, modsDir, result);
	return result;
}

const entryOf = (overrides = {}) => ({
	id: "fakeupd:manual-mod",
	source: "fakeupd",
	ref: "manual-mod",
	version: "1.0.0",
	side: "both",
	names: ["Manual.jar"],
	files: [{ path: "Manual.jar", sha256: "0".repeat(64) }],
	dependencyOf: [],
	installedAt: "2026-10-30T00:00:00.000Z",
	...overrides,
});

const pick = ({ status, current, latest, dependency }) => ({ status, current, latest, dependency });

before(async () => {
	await initConfig();
	await initSecrets();
	stand = http.createServer((req, res) => {
		const body = served.get(req.url);
		if (!body) {
			res.statusCode = 404;
			return res.end();
		}
		res.end(body);
	});
	await new Promise((r) => stand.listen(0, "127.0.0.1", r));
	base = `http://127.0.0.1:${stand.address().port}`;

	registerProvider({
		id: "fakeupd",
		label: "Fake",
		hosts: ["127.0.0.1"],
		async resolve(ref) {
			const item = catalog.get(ref);
			if (!item) throw new ModError("No such mod.", "not_found", 404);
			if (item.choose) throw new ModError("This release has several files that fit. Choose one.", "choose_asset", 409);
			// An error that is not a ModError, carrying a path, must never reach the caller.
			if (item.broken) throw new Error(`The panel crashed reading ${root}`);
			return {
				source: "fakeupd",
				ref,
				name: ref,
				version: item.version,
				side: "both",
				files: [{ url: `${base}${item.path}`, name: item.file, sha512: sha512(item.bytes) }],
				dependencies: [],
			};
		},
	});
});

after(async () => {
	await new Promise((r) => stand.close(r));
	if (savedLoopback === undefined) delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
	else process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = savedLoopback;
	fs.rmSync(root, { recursive: true, force: true });
});

describe("checking for updates", () => {
	it("says update, current, manual or error for each entry, and only the error text is shown", async () => {
		const { server: s, mods } = freshServer();
		offer("upd-mod", { version: "1.0.0", file: "Upd.jar", bytes: Buffer.from("upd one") });
		await install(s, mods, "upd-mod");
		offer("upd-mod", { version: "2.0.0", file: "Upd.jar", bytes: Buffer.from("upd two") });

		offer("same-mod", { version: "1.0.0", file: "Same.jar", bytes: Buffer.from("same") });
		await install(s, mods, "same-mod");

		// A pinned entry is checked unpinned: "pinned-mod@1.0.0" is looked up as "pinned-mod", which is current.
		offer("pinned-mod", { version: "1.0.0", file: "Pinned.jar", bytes: Buffer.from("pinned") });
		await lock.add(s.name, entryOf({ id: "fakeupd:pinned-mod", ref: "pinned-mod@1.0.0", names: ["Pinned.jar"], files: [] }));

		await lock.add(s.name, entryOf({ id: "url:https://example.test/a.jar", source: "url", ref: "https://example.test/a.jar", version: "", names: ["A.jar"], files: [] }));
		offer("choose-mod", { version: "1.0.0", file: "Choose.jar", bytes: Buffer.from("c"), choose: true });
		await lock.add(s.name, entryOf({ id: "fakeupd:choose-mod", ref: "choose-mod", names: ["Choose.jar"], files: [] }));
		offer("broken-mod", { version: "1.0.0", file: "Broken.jar", bytes: Buffer.from("b"), broken: true });
		await lock.add(s.name, entryOf({ id: "fakeupd:broken-mod", ref: "broken-mod", names: ["Broken.jar"], files: [] }));

		offer("dep-mod", { version: "1.0.0", file: "Dep.jar", bytes: Buffer.from("dep") });
		await lock.add(s.name, entryOf({ id: "fakeupd:dep-mod", ref: "dep-mod", names: ["Dep.jar"], files: [], dependencyOf: ["fakeupd:upd-mod"] }));

		const updates = await checkUpdates(s);
		const by = (id) => updates.find((u) => u.id === id);
		assert.equal(updates.length, 7);
		assert.deepEqual(pick(by("fakeupd:upd-mod")), { status: "update", current: "1.0.0", latest: "2.0.0", dependency: false });
		assert.equal(by("fakeupd:same-mod").status, "current");
		assert.equal(by("fakeupd:pinned-mod").status, "current");
		assert.equal(by("url:https://example.test/a.jar").status, "manual");
		assert.equal(by("fakeupd:choose-mod").status, "manual");
		assert.equal(by("fakeupd:broken-mod").status, "error");
		assert.deepEqual(by("fakeupd:broken-mod").error, { code: "check_failed", message: "Couldn't check this mod." });
		assert.equal(by("fakeupd:dep-mod").dependency, true);

		const text = JSON.stringify(updates);
		assert.equal(text.includes(root), false, "no panel path in the answer");
		assert.equal(text.includes("crashed"), false, "no error text from outside the ModError");
		assert.equal(text.includes("at "), false, "no stack");
		// Nothing is downloaded or written by a check.
		assert.deepEqual(fs.readdirSync(mods).sort(), ["Same.jar", "Upd.jar"]);
		assert.deepEqual(leftovers(), []);
	});
});

describe("applying an update", () => {
	it("swaps the file and the lock for the new version, and reports the change", async () => {
		const { server: s, mods } = freshServer();
		offer("swap-mod", { version: "1.0.0", file: "Swap.jar", bytes: Buffer.from("swap one") });
		await install(s, mods, "swap-mod");
		offer("swap-mod", { version: "2.0.0", file: "Swap.jar", bytes: Buffer.from("swap two, bigger") });

		const result = await applyUpdate(s, "fakeupd:swap-mod");
		assert.deepEqual(result.updated, { id: "fakeupd:swap-mod", from: "1.0.0", to: "2.0.0" });
		assert.deepEqual(result.installed, ["Swap.jar"]);
		assert.deepEqual(result.unverified, []);
		assert.deepEqual(result.skipped, []);
		assert.equal(fs.readFileSync(path.join(mods, "Swap.jar"), "utf8"), "swap two, bigger");

		const { mods: entries } = await lock.read(s.name);
		assert.equal(entries.length, 1);
		assert.equal(entries[0].version, "2.0.0");
		assert.deepEqual(entries[0].files, [{ path: "Swap.jar", sha256: sha256(Buffer.from("swap two, bigger")) }]);
		assert.deepEqual(leftovers(), []);
	});

	it("a failed update puts the old file back byte for byte and leaves the lock as it was", async () => {
		const { server: s, mods } = freshServer();
		const oldBytes = Buffer.from("the version that works");
		offer("fail-mod", { version: "1.0.0", file: "Fail.jar", bytes: oldBytes });
		await install(s, mods, "fail-mod");
		// The new version's file is not served, so its download fails after the old file has been taken out.
		offer("fail-mod", { version: "2.0.0", file: "Fail.jar", bytes: Buffer.from("never arrives"), serve: false });
		const before = (await lock.read(s.name)).mods;

		await assert.rejects(() => applyUpdate(s, "fakeupd:fail-mod"));
		assert.deepEqual(fs.readFileSync(path.join(mods, "Fail.jar")), oldBytes);
		assert.deepEqual((await lock.read(s.name)).mods, before);
		assert.deepEqual(leftovers(), []);
	});

	it("a mod that is turned off stays off after its update", async () => {
		const { server: s, mods } = freshServer();
		offer("off-mod", { version: "1.0.0", file: "Off.jar", bytes: Buffer.from("off one") });
		await install(s, mods, "off-mod");
		await setModEnabled(s, "Off.jar", false);
		offer("off-mod", { version: "2.0.0", file: "Off.jar", bytes: Buffer.from("off two") });

		await applyUpdate(s, "fakeupd:off-mod");
		assert.equal(fs.existsSync(path.join(mods, "Off.jar")), false);
		assert.equal(fs.readFileSync(path.join(mods, "Off.jar.disabled"), "utf8"), "off two");
		assert.equal((await lock.read(s.name)).mods[0].version, "2.0.0");
	});

	it("refuses a lock whose names aren't safe, before it touches the mods folder", async () => {
		const { server: s, mods } = freshServer();
		fs.mkdirSync(mods, { recursive: true });
		fs.writeFileSync(path.join(mods, "Keep.jar"), "keep me");
		const damaged = entryOf({
			id: "fakeupd:damaged-mod",
			ref: "damaged-mod",
			version: "1.0.0",
			names: ["Keep.jar", "../evil.jar"],
			files: [{ path: "Keep.jar", sha256: sha256(Buffer.from("keep me")) }],
		});
		fs.mkdirSync(path.dirname(lock.lockFileOf(s.name)), { recursive: true });
		fs.writeFileSync(lock.lockFileOf(s.name), JSON.stringify({ schema: 1, mods: [damaged] }));
		offer("damaged-mod", { version: "2.0.0", file: "Damaged.jar", bytes: Buffer.from("new") });

		await assert.rejects(() => applyUpdate(s, "fakeupd:damaged-mod"), { code: "lock_damaged", status: 409 });
		assert.equal(fs.readFileSync(path.join(mods, "Keep.jar"), "utf8"), "keep me");
	});

	it("refuses a direct link as a manual update", async () => {
		const { server: s } = freshServer();
		await lock.add(s.name, entryOf({ id: "url:https://example.test/b.jar", source: "url", ref: "https://example.test/b.jar", version: "", names: ["B.jar"], files: [] }));
		await assert.rejects(() => applyUpdate(s, "url:https://example.test/b.jar"), { code: "manual_update", status: 409 });
	});

	it("says a mod that is already the newest is up to date, and changes nothing", async () => {
		const { server: s, mods } = freshServer();
		offer("latest-mod", { version: "1.0.0", file: "Latest.jar", bytes: Buffer.from("latest") });
		await install(s, mods, "latest-mod");
		await assert.rejects(() => applyUpdate(s, "fakeupd:latest-mod"), { code: "up_to_date", status: 409 });
		assert.equal(fs.readFileSync(path.join(mods, "Latest.jar"), "utf8"), "latest");
	});

	it("says so when the id is not in the lock", async () => {
		const { server: s } = freshServer();
		await assert.rejects(() => applyUpdate(s, "fakeupd:nothing-here"), { code: "not_found", status: 404 });
	});
});

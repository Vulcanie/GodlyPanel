import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import request from "supertest";
import { serverEntry, tempDir, removeDir, until } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// The file manager's routes under /api/server/:serverName/files, through real sign-ins against an in-process panel. The path and
// file rules belong to the service and have their own tests; this file checks that each route asks for the right permission, that a
// refusal reaches the caller with the service's code, that uploads and downloads leave no temp copies behind, and that the launcher
// rule (R60) holds for anyone who is not an administrator.

const PASSWORD = "FilesTest!2345";
const SERVER = "Files";
const enc = encodeURIComponent;
const ESCAPE = "files-test-escape";

describe("the file manager routes", () => {
	let panel;
	let api;
	let admin;
	let viewer;
	let editor;
	let limited;
	let folder; // the server's own folder, kept outside the panel's data folder as a real server's would be
	let tmp; // where downloads are zipped, so this file can see whether they clean up after themselves

	const url = (rest) => `/api/server/${SERVER}/files/${rest}`;
	const get = (rest, cookie = admin) => api.get(url(rest), { cookie });
	const post = (rest, body, cookie = admin) => api.post(url(rest), body, { cookie });
	const put = (rest, body, cookie = admin) => api.put(url(rest), body, { cookie });
	const del = (rest, cookie = admin) => api.call("DELETE", url(rest), undefined, { cookie });
	const upload = (rest, filename, bytes, cookie = admin) =>
		request(panel.app).post(url(rest)).set("Cookie", cookie).attach("file", Buffer.from(bytes), filename);
	const download = (rest, cookie = admin) => api.fetch(url(rest), { headers: { Cookie: cookie } });
	// The panel's upload folder, which must be empty once every upload has been answered.
	const tempUploads = () => {
		const dir = path.join(panel.dir, "uploads", "file-manager");
		return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
	};
	const zipFolders = () => fs.readdirSync(tmp).filter((name) => name.startsWith("ghp-dl-"));

	before(async () => {
		folder = tempDir("files-server");
		tmp = tempDir("files-tmp");
		panel = await startInProcess({ servers: [serverEntry(folder, { name: SERVER })] });
		api = panel.api;
		admin = api.cookie;
		// Downloads are zipped into the temp folder, so point it at this file's own.
		process.env.TMPDIR = tmp;
		process.env.TEMP = tmp;
		process.env.TMP = tmp;

		const roleStore = await import("../../src/server/data/roleStore.js");
		const userStore = await import("../../src/server/data/userStore.js");
		const account = async (name, username, permissions, extra = {}) => {
			const role = await roleStore.create({ name, permissions });
			await userStore.createUser({ username, password: PASSWORD, role: role.id, ...extra });
			return api.cookieFor({ username, password: PASSWORD });
		};
		viewer = await account("Files viewer", "fileviewer", ["files.view"]);
		editor = await account("Files editor", "fileeditor", ["files.view", "files.edit"]);
		limited = await account("Files limited", "filelimited", ["files.view"], { servers: ["Elsewhere"] });
	});

	after(async () => {
		await panel.stop();
		removeDir(folder);
		removeDir(tmp);
	});

	it("lists the server's folder, which starts empty", async () => {
		const r = await get("list");
		assert.equal(r.status, 200);
		assert.equal(r.json.path, "");
		assert.deepEqual(r.json.entries, []);
	});

	it("writes a text file, keeps a .bak when it is written again, and reads the new text back", async () => {
		const first = await put("write", { path: "notes.txt", content: "first" });
		assert.equal(first.status, 200);
		assert.equal(first.json.success, true);
		assert.equal(first.json.size, 5);

		const second = await put("write", { path: "notes.txt", content: "second" });
		assert.equal(second.status, 200);
		assert.equal(fs.readFileSync(path.join(folder, "notes.txt.bak"), "utf8"), "first");

		const read = await get("read?path=notes.txt");
		assert.equal(read.status, 200);
		assert.equal(read.json.content, "second");
	});

	it("makes a folder, moves a file into it, and lists the folder", async () => {
		const made = await post("mkdir", { path: "docs" });
		assert.equal(made.status, 200);
		assert.equal(made.json.success, true);
		assert.ok(fs.statSync(path.join(folder, "docs")).isDirectory());

		const moved = await post("rename", { from: "notes.txt", to: "docs/notes.txt" });
		assert.equal(moved.status, 200);
		assert.equal(fs.existsSync(path.join(folder, "notes.txt")), false);

		const listed = await get("list?path=docs");
		assert.equal(listed.status, 200);
		assert.deepEqual(
			listed.json.entries.map((e) => e.name),
			["notes.txt"],
		);
	});

	it("uploads a file with its content unchanged, and removes the temp copy", async () => {
		const r = await upload("upload?dir=docs", "photo.txt", "uploaded bytes");
		assert.equal(r.status, 200);
		assert.equal(r.body.success, true);
		assert.equal(r.body.path, "docs/photo.txt");
		assert.equal(fs.readFileSync(path.join(folder, "docs", "photo.txt"), "utf8"), "uploaded bytes");
		assert.deepEqual(tempUploads(), []);
	});

	it("refuses an upload whose name is already taken, with 409, and removes the temp copy", async () => {
		const r = await upload("upload?dir=docs", "photo.txt", "other bytes");
		assert.equal(r.status, 409);
		assert.equal(r.body.code, "exists");
		assert.equal(fs.readFileSync(path.join(folder, "docs", "photo.txt"), "utf8"), "uploaded bytes");
		assert.deepEqual(tempUploads(), []);
	});

	it("refuses an upload with no file, with 400 bad_input", async () => {
		const r = await request(panel.app).post(url("upload?dir=docs")).set("Cookie", admin);
		assert.equal(r.status, 400);
		assert.equal(r.body.code, "bad_input");
	});

	it("unpacks a zip beside itself, for an administrator", async () => {
		const zip = new AdmZip();
		zip.addFile("pack/a.txt", Buffer.from("A"));
		zip.addFile("pack/sub/b.txt", Buffer.from("B"));
		const sent = await upload("upload", "bundle.zip", zip.toBuffer());
		assert.equal(sent.status, 200);

		const r = await post("extract", { path: "bundle.zip" });
		assert.equal(r.status, 200);
		assert.equal(r.json.success, true);
		assert.equal(r.json.files, 2);
		assert.equal(fs.readFileSync(path.join(folder, "pack", "a.txt"), "utf8"), "A");
		assert.equal(fs.readFileSync(path.join(folder, "pack", "sub", "b.txt"), "utf8"), "B");
	});

	it("moves a file to the trash, lists it there, restores it, and empties the trash", async () => {
		const gone = await post("delete", { path: "docs/photo.txt" });
		assert.equal(gone.status, 200);
		assert.equal(typeof gone.json.trashId, "string");
		assert.equal(fs.existsSync(path.join(folder, "docs", "photo.txt")), false);

		const trash = await get("trash");
		assert.equal(trash.status, 200);
		const item = trash.json.items.find((i) => i.id === gone.json.trashId);
		assert.equal(item.originalPath, "docs/photo.txt");

		const back = await post("trash/restore", { id: gone.json.trashId });
		assert.equal(back.status, 200);
		assert.equal(fs.readFileSync(path.join(folder, "docs", "photo.txt"), "utf8"), "uploaded bytes");

		await post("delete", { path: "docs/photo.txt" });
		const purged = await post("trash/purge", {});
		assert.equal(purged.status, 200);
		assert.equal(purged.json.removed, 1);
		assert.equal((await get("trash")).json.items.length, 0);
	});

	it("downloads a file as it is, and a folder as a zip whose temp copy is removed afterwards", async () => {
		const file = await download("download?path=docs/notes.txt");
		assert.equal(file.status, 200);
		assert.equal(await file.text(), "second");
		assert.ok(file.headers.get("content-disposition").includes("notes.txt"));

		const folderZip = await download("download?path=pack");
		assert.equal(folderZip.status, 200);
		assert.ok(folderZip.headers.get("content-type").startsWith("application/zip"));
		const entries = new AdmZip(Buffer.from(await folderZip.arrayBuffer())).getEntries().map((e) => e.entryName);
		assert.ok(entries.includes("a.txt"));
		assert.ok(entries.includes("sub/b.txt"));
		// The temp copy is removed once the send has ended, which can be a moment after the body arrives.
		await until(() => zipFolders().length === 0);
		assert.deepEqual(zipFolders(), []);
	});

	it("refuses a path that leaves the folder, names something Windows treats specially, or is not text, and creates nothing", async () => {
		const listedBefore = fs.readdirSync(folder).sort();
		const cases = [
			[() => get(`list?path=${enc(`../${ESCAPE}`)}`), 400, "outside"],
			[() => get(`list?path=${enc("C:\\files-test-escape")}`), 400, "outside"],
			[() => get("list?path=%2e%2e"), 400, "outside"],
			[() => get("list?path=a%00b"), 400, "bad_path"],
			[() => get("list?path=a&path=b"), 400, "bad_input"],
			[() => post("mkdir", { path: `../${ESCAPE}` }), 400, "outside"],
			[() => put("write", { path: `..\\${ESCAPE}.txt`, content: "y" }), 400, "outside"],
			[() => put("write", { path: ["a.txt"], content: "y" }), 400, "bad_input"],
			[() => put("write", { path: "a.txt" }), 400, "bad_input"],
			[() => post("rename", { from: `../${ESCAPE}`, to: "y" }), 400, "outside"],
		];
		for (const [call, status, code] of cases) {
			const r = await call();
			assert.equal(r.status, status, JSON.stringify(r.json));
			assert.equal(r.json.code, code, JSON.stringify(r.json));
		}
		// The probe name is only used here, so finding it means something was written outside the folder.
		assert.equal(fs.existsSync(path.join(path.dirname(folder), ESCAPE)), false);
		assert.equal(fs.existsSync(path.join(path.dirname(folder), `${ESCAPE}.txt`)), false);
		assert.deepEqual(fs.readdirSync(folder).sort(), listedBefore);
	});

	it("answers a failure that is not a refusal with the generic message, and nothing from the disk", async () => {
		// A file where the panel keeps its trash folder makes the trash listing fail with a raw file-system error, which holds paths.
		// The trash folder is left in place by a purge, so it is cleared first; a folder cannot be replaced by a file while it exists.
		const blocker = path.join(folder, ".godlypanel-trash");
		fs.rmSync(blocker, { recursive: true, force: true });
		fs.writeFileSync(blocker, "not a folder");
		try {
			const r = await get("trash");
			assert.equal(r.status, 500);
			assert.deepEqual(r.json, { error: "That file operation failed." });
			const text = JSON.stringify(r.json);
			assert.ok(!text.includes("\\"), "no backslash path in the body");
			assert.ok(!/[A-Za-z]:/.test(text), "no drive letter in the body");
			assert.ok(!text.includes(folder), "no server folder in the body");
		} finally {
			fs.rmSync(blocker, { force: true });
		}
	});

	it("refuses a viewer every change, with 403 forbidden, and lets it read and download", async () => {
		assert.equal((await get("list", viewer)).status, 200);
		assert.equal((await get("read?path=docs/notes.txt", viewer)).status, 200);
		assert.equal((await download("download?path=docs/notes.txt", viewer)).status, 200);

		const refusals = [
			() => put("write", { path: "v.txt", content: "y" }, viewer),
			() => post("mkdir", { path: "vdir" }, viewer),
			() => post("rename", { from: "docs/notes.txt", to: "docs/n2.txt" }, viewer),
			() => upload("upload?dir=docs", "v.txt", "y", viewer),
			() => post("extract", { path: "bundle.zip" }, viewer),
			() => post("delete", { path: "docs/notes.txt" }, viewer),
			() => get("trash", viewer),
			() => post("trash/restore", { id: "1700000000000-aaaaaa" }, viewer),
			() => post("trash/purge", {}, viewer),
		];
		for (const refuse of refusals) {
			const r = await refuse();
			// An upload answers through supertest, which keeps the body on `.body`; the other calls keep it on `.json`.
			const body = r.json ?? r.body;
			assert.equal(r.status, 403, JSON.stringify(body));
			assert.equal(body.code, "forbidden");
		}
		assert.equal(fs.existsSync(path.join(folder, "docs", "notes.txt")), true);
		assert.deepEqual(tempUploads(), []);
	});

	it("lets an editor change files, but not delete them or read the trash", async () => {
		assert.equal((await put("write", { path: "docs/notes.txt", content: "third" }, editor)).status, 200);
		assert.equal((await post("mkdir", { path: "docs/sub" }, editor)).status, 200);
		assert.equal((await post("rename", { from: "docs/sub", to: "docs/sub2" }, editor)).status, 200);

		const refusals = [() => post("delete", { path: "docs/notes.txt" }, editor), () => get("trash", editor), () => post("trash/restore", { id: "1700000000000-aaaaaa" }, editor), () => post("trash/purge", {}, editor)];
		for (const refuse of refusals) {
			const r = await refuse();
			assert.equal(r.status, 403, JSON.stringify(r.json));
			assert.equal(r.json.code, "forbidden");
		}
		assert.equal(fs.existsSync(path.join(folder, "docs", "notes.txt")), true);
	});

	it("refuses a user limited to another server, with 403 forbidden_server, even with the permission", async () => {
		const r = await get("list", limited);
		assert.equal(r.status, 403);
		assert.equal(r.json.code, "forbidden_server");
	});

	it("refuses a request with no sign-in, with 401", async () => {
		const r = await get("list", "");
		assert.equal(r.status, 401);
	});

	it("keeps launcher files to an administrator, for anyone else who may edit", async () => {
		for (const name of ["x.bat", "Run.CMD", "a.ps1"]) {
			const r = await put("write", { path: name, content: "echo hi" }, editor);
			assert.equal(r.status, 403, name);
			assert.equal(r.json.code, "restricted_type", name);
			assert.equal(fs.existsSync(path.join(folder, name)), false, name);
		}

		const exe = await upload("upload", "x.exe", "MZ", editor);
		assert.equal(exe.status, 403);
		assert.equal(exe.body.code, "restricted_type");
		assert.deepEqual(tempUploads(), []);

		const renamed = await post("rename", { from: "docs/notes.txt", to: "docs/y.vbs" }, editor);
		assert.equal(renamed.status, 403);
		assert.equal(renamed.json.code, "restricted_type");
		assert.equal(fs.existsSync(path.join(folder, "docs", "notes.txt")), true);

		assert.equal((await put("write", { path: "x.txt", content: "fine" }, editor)).status, 200);
		assert.equal((await upload("upload?dir=docs", "mod.jar", "jar bytes", editor)).status, 200);

		const unpack = await post("extract", { path: "bundle.zip" }, editor);
		assert.equal(unpack.status, 403);
		assert.equal(unpack.json.code, "forbidden");
		assert.equal(unpack.json.error, "Only an administrator can unpack a zip.");
	});

	it("lets an administrator save a launcher file", async () => {
		const r = await put("write", { path: "x.bat", content: "echo hi" });
		assert.equal(r.status, 200);
		assert.equal(fs.readFileSync(path.join(folder, "x.bat"), "utf8"), "echo hi");
	});

	it("recognises launcher names by their extension, in any case, and not by letters alone", async () => {
		const { isLauncherName } = await import("../../src/server/routes/files.js");
		for (const name of ["x.bat", "Run.CMD", "a.ps1", "dir/x.exe", ".bat", "x.bat.", "x.bat ", "x.dll"]) {
			assert.equal(isLauncherName(name), true, name);
		}
		for (const name of ["x.txt", "mod.jar", "batfile", "bat", "x", "x.", "readme.md", "x.bat/readme.txt", "a.exe.txt", "archive.zip"]) {
			assert.equal(isLauncherName(name), false, name);
		}
	});
});

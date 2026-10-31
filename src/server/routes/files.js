// The file manager's routes for one server's folder: browse, read, change, upload, unpack, download, and the trash. The path rules
// and the file work are in services/fileManager.js. This file checks the shape of each request, names the permission each route
// needs, keeps launcher files for administrators, and turns a refusal into an answer the screen can show.
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { get as getServer } from "../data/serverStore.js";
import { paths } from "../paths.js";
import { requirePermission } from "../middleware/permissions.js";
import { singleFile } from "../middleware/uploadErrors.js";
import { logActivity } from "../services/activityLog.js";
import {
	FileError,
	list,
	readText,
	writeText,
	mkdir,
	rename,
	saveUpload,
	extractZipHere,
	prepareDownload,
	moveToTrash,
	listTrash,
	restoreFromTrash,
	purgeTrash,
} from "../services/fileManager.js";

const router = express.Router();

router.param("serverName", (req, res, next, name) => {
	const server = getServer(name);
	if (!server) return res.status(404).json({ error: "Server not found" });
	req.server = server;
	next();
});

const MAX_UPLOAD = 100 * 1024 * 1024;

// Files a server or the panel can start as code. Anyone who is not an administrator is refused these, since a saved script the server
// starts would run on the host. A .jar is not on the list: mods are jars.
const LAUNCHER_EXTENSIONS = [".bat", ".cmd", ".ps1", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".exe", ".com", ".scr", ".msi", ".lnk", ".dll"];

/**
 * True when a file name, or the last part of a path, ends in a launcher extension. The name is trimmed of trailing dots and spaces
 * first, since Windows drops them, so "run.bat." is still a batch file. Letter case does not matter.
 */
export function isLauncherName(name) {
	const last = String(name).split(/[\\/]/).pop().replace(/[. ]+$/, "").toLowerCase();
	const dot = last.lastIndexOf(".");
	if (dot < 0) return false;
	return LAUNCHER_EXTENSIONS.includes(last.slice(dot));
}

// A value from the request must be a plain string. A missing one is `missing` (null when the route needs it); an array or an object,
// such as a key sent twice, is refused rather than joined or guessed at. Returns null when the value is not usable.
function textOf(value, missing = null) {
	if (value === undefined) return missing;
	return typeof value === "string" ? value : null;
}

const badInput = (res, message = "That request isn't valid.") => res.status(400).json({ error: message, code: "bad_input" });
const restricted = (res) => res.status(403).json({ error: "Only an administrator can save that kind of file.", code: "restricted_type" });
const isAdmin = (req) => req.user?.role === "admin";

// The status and body for a failure. A file-manager refusal says what it is; anything else is logged by its code only, since the
// message of a raw file-system error holds absolute paths and must not reach the caller.
function failure(err, what) {
	if (err instanceof FileError) return { status: err.status, body: { error: err.message, code: err.code } };
	console.error(`File manager: ${what} failed (${err?.code ?? "no code"})`);
	return { status: 500, body: { error: "That file operation failed." } };
}

function send(res, err, what) {
	const { status, body } = failure(err, what);
	res.status(status).json(body);
}

// The upload's temp copy belongs to the route, so it is removed on every path, including a refusal and a missing file.
const uploadDir = path.join(paths.uploadsDir, "file-manager");
const upload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			fs.mkdirSync(uploadDir, { recursive: true });
			cb(null, uploadDir);
		},
		// A random name, so nothing about the upload's own name is put on disk before the service checks it.
		filename: (req, file, cb) => cb(null, `${crypto.randomBytes(12).toString("hex")}.upload`),
	}),
	limits: { fileSize: MAX_UPLOAD },
});

// ---- browse and read --------------------------------------------------------------

router.get("/server/:serverName/files/list", requirePermission("files.view"), async (req, res) => {
	const rel = textOf(req.query.path, "");
	if (rel === null) return badInput(res);
	try {
		res.json(await list(req.server, rel));
	} catch (err) {
		send(res, err, "listing a folder");
	}
});

router.get("/server/:serverName/files/read", requirePermission("files.view"), async (req, res) => {
	const rel = textOf(req.query.path);
	if (rel === null) return badInput(res);
	try {
		res.json(await readText(req.server, rel));
	} catch (err) {
		send(res, err, "reading a file");
	}
});

// A file goes as it is; a folder goes as a zip made in a temp folder. The temp folder is removed once the send ends, whether it worked.
router.get("/server/:serverName/files/download", requirePermission("files.view"), async (req, res) => {
	const rel = textOf(req.query.path);
	if (rel === null) return badInput(res);
	let prepared;
	try {
		prepared = await prepareDownload(req.server, rel);
	} catch (err) {
		return send(res, err, "preparing a download");
	}
	res.download(prepared.file, prepared.name, (err) => {
		prepared.cleanup();
		if (!err) return;
		console.error(`File manager: sending a download failed (${err.code ?? "no code"})`);
		// Once the send has started there is no way to say anything else, so the message is only sent when nothing went out yet.
		if (!res.headersSent) res.status(500).json({ error: "Sending the file failed." });
	});
});

// ---- change ---------------------------------------------------------------------------

router.put("/server/:serverName/files/write", requirePermission("files.edit"), async (req, res) => {
	const rel = textOf(req.body?.path);
	const content = req.body?.content;
	if (rel === null || typeof content !== "string") return badInput(res);
	if (!isAdmin(req) && isLauncherName(rel)) return restricted(res);
	try {
		const result = await writeText(req.server, rel, content);
		logActivity({ type: "files.saved", server: req.server.name, message: `${req.user.username}: Saved ${rel} in the file manager.` });
		res.json({ success: true, ...result });
	} catch (err) {
		send(res, err, "saving a file");
	}
});

router.post("/server/:serverName/files/mkdir", requirePermission("files.edit"), async (req, res) => {
	const rel = textOf(req.body?.path);
	if (rel === null) return badInput(res);
	if (!isAdmin(req) && isLauncherName(rel)) return restricted(res);
	try {
		await mkdir(req.server, rel);
		logActivity({ type: "files.created", server: req.server.name, message: `${req.user.username}: Made the folder ${rel} in the file manager.` });
		res.json({ success: true });
	} catch (err) {
		send(res, err, "making a folder");
	}
});

router.post("/server/:serverName/files/rename", requirePermission("files.edit"), async (req, res) => {
	const from = textOf(req.body?.from);
	const to = textOf(req.body?.to);
	if (from === null || to === null) return badInput(res);
	if (!isAdmin(req) && isLauncherName(to)) return restricted(res);
	try {
		await rename(req.server, from, to);
		logActivity({ type: "files.renamed", server: req.server.name, message: `${req.user.username}: Renamed ${from} to ${to} in the file manager.` });
		res.json({ success: true });
	} catch (err) {
		send(res, err, "renaming");
	}
});

// The upload's answer is worked out first, and the temp copy is removed before it is sent, so the caller never sees a response while
// the copy still exists.
async function uploadAnswer(req) {
	if (!req.file) return { status: 400, body: { error: "Choose a file to upload.", code: "bad_input" } };
	const dir = textOf(req.query.dir, "");
	if (dir === null) return { status: 400, body: { error: "That request isn't valid.", code: "bad_input" } };
	const name = req.file.originalname;
	if (!isAdmin(req) && isLauncherName(name)) return { status: 403, body: { error: "Only an administrator can save that kind of file.", code: "restricted_type" } };
	try {
		const result = await saveUpload(req.server, dir, name, req.file.path, { maxBytes: MAX_UPLOAD });
		logActivity({ type: "files.uploaded", server: req.server.name, message: `${req.user.username}: Uploaded ${result.path} in the file manager.` });
		return { status: 200, body: { success: true, ...result } };
	} catch (err) {
		return failure(err, "uploading a file");
	}
}

router.post("/server/:serverName/files/upload", requirePermission("files.edit"), singleFile(upload, "file", "100 MB"), async (req, res) => {
	const temp = req.file?.path;
	let answer;
	try {
		answer = await uploadAnswer(req);
	} finally {
		if (temp) await fs.promises.rm(temp, { force: true }).catch(() => {});
	}
	res.status(answer.status).json(answer.body);
});

// Only an administrator unpacks a zip: its entries can be launchers, and the rule above is for saving them one at a time.
router.post("/server/:serverName/files/extract", requirePermission("files.edit"), async (req, res) => {
	const rel = textOf(req.body?.path);
	if (rel === null) return badInput(res);
	if (!isAdmin(req)) return res.status(403).json({ error: "Only an administrator can unpack a zip.", code: "forbidden" });
	try {
		const result = await extractZipHere(req.server, rel);
		logActivity({ type: "files.extracted", server: req.server.name, message: `${req.user.username}: Unpacked ${rel} (${result.files} files) in the file manager.` });
		res.json({ success: true, ...result });
	} catch (err) {
		send(res, err, "unpacking a zip");
	}
});

// ---- the trash --------------------------------------------------------------------------

router.post("/server/:serverName/files/delete", requirePermission("files.delete"), async (req, res) => {
	const rel = textOf(req.body?.path);
	if (rel === null) return badInput(res);
	try {
		const result = await moveToTrash(req.server, rel);
		logActivity({ type: "files.deleted", server: req.server.name, message: `${req.user.username}: Moved ${rel} to the trash in the file manager.` });
		res.json({ success: true, ...result });
	} catch (err) {
		send(res, err, "moving to the trash");
	}
});

router.get("/server/:serverName/files/trash", requirePermission("files.delete"), async (req, res) => {
	try {
		res.json({ items: await listTrash(req.server) });
	} catch (err) {
		send(res, err, "reading the trash");
	}
});

router.post("/server/:serverName/files/trash/restore", requirePermission("files.delete"), async (req, res) => {
	const id = textOf(req.body?.id);
	if (id === null) return badInput(res);
	try {
		const result = await restoreFromTrash(req.server, id);
		logActivity({ type: "files.restored", server: req.server.name, message: `${req.user.username}: Restored ${result.path} from the trash in the file manager.` });
		res.json({ success: true, ...result });
	} catch (err) {
		send(res, err, "restoring from the trash");
	}
});

router.post("/server/:serverName/files/trash/purge", requirePermission("files.delete"), async (req, res) => {
	try {
		// Zero age: everything in the trash goes now, not only what is a week old.
		const removed = await purgeTrash(req.server, { olderThanMs: 0 });
		if (removed > 0) logActivity({ type: "files.purged", server: req.server.name, message: `${req.user.username}: Emptied ${removed} items from the trash in the file manager.` });
		res.json({ success: true, removed });
	} catch (err) {
		send(res, err, "emptying the trash");
	}
});

export default router;

import express from "express";
import { get as getServer } from "../data/serverStore.js";
import { readManagedFile, writeManagedFile, sendFileError } from "../util/managedFiles.js";

const router = express.Router();

router.param("serverName", (req, res, next, name) => {
	const server = getServer(name.trim());
	if (!server?.startScriptPath) {
		return res.status(404).json({ error: "That server has no start script the panel can edit." });
	}
	req.server = server;
	next();
});

// Read a server's launch script.
router.get("/by-server/:serverName", async (req, res) => {
	try {
		res.type("text/plain").send(await readManagedFile(req.server.startScriptPath));
	} catch (err) {
		sendFileError(res, err, "the launch script");
	}
});

// Save a server's launch script.
router.post("/by-server/:serverName", async (req, res) => {
	const { content } = req.body ?? {};
	if (typeof content !== "string") {
		return res.status(400).json({ error: "The script could not be saved because its text wasn't sent in the expected form. Reload the page and try again." });
	}
	try {
		await writeManagedFile(req.server.startScriptPath, content, "start script editor");
		res.json({ success: true, message: "Launch script saved." });
	} catch (err) {
		sendFileError(res, err, "the launch script");
	}
});

export default router;

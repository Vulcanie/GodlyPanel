import express from "express";
import { promises as fs } from "fs";
import { all as allServers } from "../data/serverStore.js";
import { assertWithinAllowedRoots } from "../util/safePath.js";

const router = express.Router();

// Read a server's launch script.
router.get("/by-server/:serverName", async (req, res) => {
	const serverName = req.params.serverName.trim();
	const server = allServers().find((s) => s.name === serverName);

	if (!server || !server.startScriptPath) {
		return res.status(404).json({ error: "Server or script not found" });
	}

	try {
		assertWithinAllowedRoots(server.startScriptPath);
		const content = await fs.readFile(server.startScriptPath, "utf8");
		res.type("text/plain").send(content);
	} catch (err) {
		if (err.code === "path_not_allowed") {
			return res.status(400).json({ error: err.message });
		}
		console.error(`Error reading launch script: ${server.startScriptPath}`, err);
		res.status(500).json({ error: "Failed to read the launch script." });
	}
});

// Save a server's launch script.
router.post("/by-server/:serverName", async (req, res) => {
	const serverName = req.params.serverName.trim();
	const server = allServers().find((s) => s.name === serverName);

	if (!server || !server.startScriptPath) {
		return res.status(404).json({ error: "Server or script not found" });
	}

	const content = req.body.content;
	if (typeof content !== "string") {
		return res.status(400).json({ error: "Invalid content format" });
	}

	try {
		// Checked before the .bak copy as well as the write — the backup is
		// written beside the target, so it has the same reach.
		assertWithinAllowedRoots(server.startScriptPath);
		await fs.copyFile(server.startScriptPath, `${server.startScriptPath}.bak`);
		await fs.writeFile(server.startScriptPath, content, "utf8");
		res.json({ success: true, message: "Launch script saved." });
	} catch (err) {
		if (err.code === "path_not_allowed") {
			return res.status(400).json({ error: err.message });
		}
		console.error(`Error saving launch script for ${serverName}:`, err);
		res.status(500).json({
			error: `Failed to save the launch script. System error: ${err.code}`,
		});
	}
});

export default router;

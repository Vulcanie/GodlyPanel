import express from "express";
import { promises as fs } from "fs";
import { all as allServers } from "../data/serverStore.js";

const router = express.Router();

// ✅ Middleware to handle ngrok browser warning header
router.use((req, res, next) => {
	if (req.headers["ngrok-skip-browser-warning"]) {
		res.setHeader("ngrok-skip-browser-warning", "true");
	}
	next();
});

// ✅ Get batch file content by server name
router.get("/by-server/:serverName", async (req, res) => {
	const serverName = req.params.serverName.trim();
	const server = allServers().find((s) => s.name === serverName);

	if (!server || !server.startScriptPath) {
		console.warn(`Batch file GET failed: server not found - ${serverName}`);
		res.setHeader("Content-Type", "application/json");
		return res.status(404).json({ error: "Server or script not found" });
	}

	try {
		const content = await fs.readFile(server.startScriptPath, "utf8");
		res.send(content);
	} catch (err) {
		console.error(
			`Error reading batch file: ${server.startScriptPath}`,
			err,
		);
		res.setHeader("Content-Type", "application/json");
		res.status(500).json({ error: "Failed to read batch file." });
	}
});

// ✅ Save batch file content by server name
router.post("/by-server/:serverName", async (req, res) => {
	const serverName = req.params.serverName.trim();
	const server = allServers().find((s) => s.name === serverName);

	if (!server || !server.startScriptPath) {
		console.warn(
			`Batch file SAVE failed: server not found - ${serverName}`,
		);
		res.setHeader("Content-Type", "application/json");
		return res.status(404).json({ error: "Server or script not found" });
	}

	const content = req.body.content;
	if (typeof content !== "string") {
		res.setHeader("Content-Type", "application/json");
		return res.status(400).json({ error: "Invalid content format" });
	}

	try {
		await fs.copyFile(
			server.startScriptPath,
			`${server.startScriptPath}.bak`,
		);
		await fs.writeFile(server.startScriptPath, content, "utf8");
		console.log(`✅ Batch file saved for ${serverName}`);
		res.setHeader("Content-Type", "application/json");
		res.setHeader("ngrok-skip-browser-warning", "true");
		res.setHeader("mygdx-skip-browser-warning", "true");
		res.setHeader(
			"access-control-allow-headers",
			"x-api-key,authorization",
			"Access-Control-Allow-Origin",
			"*",
		);
		res.json({ success: true, message: "Batch file saved successfully!" });
	} catch (err) {
		console.error(`Error saving batch file for ${serverName}:`, err);
		res.setHeader("Content-Type", "application/json");
		res.status(500).json({
			error: `Failed to save batch file. System error: ${err.code}`,
		});
	}
});

export default router;

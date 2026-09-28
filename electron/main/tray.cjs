const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const { Tray, Menu, nativeImage } = electron;

/**
 * Tray icon so the panel can keep running (and keep polling) with no window
 * open — closing the window shouldn't stop monitoring the servers.
 */
function createTray({ appPath, onShow, onRestartApi, onQuit, getState }) {
	const iconPath = path.join(appPath, "build", "tray.png");
	const image = fs.existsSync(iconPath)
		? nativeImage.createFromPath(iconPath)
		: nativeImage.createEmpty();

	const tray = new Tray(image);
	tray.setToolTip("GodlyPanel");

	const rebuild = () => {
		tray.setContextMenu(
			Menu.buildFromTemplate([
				{ label: `API: ${getState()}`, enabled: false },
				{ type: "separator" },
				{ label: "Open GodlyPanel", click: onShow },
				{ label: "Restart API", click: onRestartApi },
				{ type: "separator" },
				{ label: "Quit", click: onQuit },
			]),
		);
	};

	rebuild();
	tray.on("double-click", onShow);
	return { tray, rebuild };
}

module.exports = { createTray };

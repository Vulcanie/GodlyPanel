// CommonJS on purpose: sandboxed preload scripts are not ES modules, and the
// root package is "type": "module", so this needs the explicit .cjs extension.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("godlyPanel", {
	isDesktopApp: true,
	getInfo: () => ipcRenderer.invoke("app:info"),
	openDataFolder: () => ipcRenderer.invoke("app:openDataFolder"),
	pickFolder: (options) => ipcRenderer.invoke("app:pickFolder", options ?? {}),
	pickFile: (options) => ipcRenderer.invoke("app:pickFile", options ?? {}),
	openFolder: (folder) => ipcRenderer.invoke("app:openFolder", folder),
	restartApi: () => ipcRenderer.invoke("api:restart"),
	getApiState: () => ipcRenderer.invoke("api:state"),
	onApiState: (cb) => {
		const handler = (_e, state, detail) => cb(state, detail);
		ipcRenderer.on("api:state", handler);
		return () => ipcRenderer.removeListener("api:state", handler);
	},
});

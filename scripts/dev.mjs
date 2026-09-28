import { spawn } from "node:child_process";
import electronPath from "electron";

// Launch Electron with a sanitised environment.
//
// ELECTRON_RUN_AS_NODE=1 makes the Electron binary behave as plain Node, so
// require("electron") returns an empty object and the app dies on startup with
// a confusing "cannot read properties of undefined" error. We set that variable
// deliberately for the forked API child — but any Electron-based terminal
// (VS Code's integrated terminal is the common one, since its extension host
// sets it) leaks it into the parent environment too, which would silently break
// `npm run dev` for no visible reason.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ["."], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));

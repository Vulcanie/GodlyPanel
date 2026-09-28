# GodlyPanel

An all-in-one game server control panel for Windows. Download the zip, unpack it,
run `GodlyPanel.exe` — no Node install, no web host, no tunnel, no separate API.

Manages dedicated servers for ARK (ASA/ASE), Conan Exiles, Valheim, Enshrouded,
Palworld, 7 Days to Die, RuneScape: Dragonwilds, Windrose, Subsistence, and
modded Minecraft (NeoForge / Forge / Fabric, including CurseForge modpacks).

> **Status: Stage 1 of 4.** The desktop shell, packaging and process supervision
> are done. Settings are not yet in-app, auth is still the original two-account
> scheme, and the LAN-only restriction is not implemented yet — see the roadmap.

## Running it

```
GodlyPanel.exe
```

The panel opens in its own window. It also serves the same UI over HTTP on your
local network, so other people can open `http://<your-lan-ip>:8765` to see
server status.

Windows will ask whether to allow GodlyPanel through the firewall the first time
it runs. Allow it on **Private** networks; leave **Public** unchecked.

## Where your data lives

By default, in a `data` folder **next to the executable** — that's what makes it
portable. To move or upgrade, copy that folder across to the new version.

If the app can't write next to itself (unpacked into `Program Files`, say), it
falls back to `%APPDATA%\GodlyPanel` and tells you.

```
data/
  servers.js        your server list
  .env              credentials (Stage 1 only — becomes real settings in Stage 2)
  logs/api.log      the API's log; check here first when something misbehaves
  jobs/             per-job logs for server creation and updates
  state/            build-version tracking, auto-update toggles
  uploads/          modpack zips, swept after 24h
```

Delete `data/portable.txt` if you'd rather it always used `%APPDATA%`.

## Development

```
npm install
npm --prefix ui install
npm run dev        # build the UI, then launch the app
npm run dev:ui     # CRA dev server on :3000 with hot reload, proxied to the API
npm run package    # produce dist/GodlyPanel-<version>-win.zip
```

The UI is a normal CRA app in `ui/`. It talks to the API using **relative** URLs,
because the API serves the UI — same origin, no CORS, no API base URL to
configure.

### Architecture

```
electron/main/     CommonJS. Window, tray, single-instance lock, API supervision.
src/server/        ESM. The Express API — polling, RCON, server creation, SSE.
src/shared/        Resource resolution shared by both.
ui/                React + MUI dashboard.
resources/         PowerShell scripts + Minecraft launcher templates.
```

A few decisions worth knowing before changing things:

- **The API runs as a forked child process, not in Electron's main process.** It
  deliberately exits on an uncaught exception so a supervisor can restart it
  clean; doing that in the main process would close the whole app. The
  supervisor restarts it with backoff and gives up after 5 crashes in a minute.
- **The Electron layer is CommonJS (`.cjs`) while everything else is ESM.**
  Electron's main-process `electron` module is a native CJS binding that doesn't
  interop with ESM. This costs nothing, because the API is launched by file path
  rather than imported.
- **PowerShell scripts and launcher templates live outside `app.asar`**
  (`extraResources`), because Windows cannot execute a `.ps1` from inside an
  asar archive. Resolve them with `resolveResource()`, never `__dirname`.
- **`ELECTRON_RUN_AS_NODE` is set for the API child on purpose.** If it leaks
  into the parent environment — VS Code's integrated terminal sets it — Electron
  silently starts in Node mode and the app dies on startup. `scripts/dev.mjs`
  strips it.
- **Game servers are meant to outlive the app.** They're launched as independent
  processes, so quitting the panel doesn't stop them. In-flight SteamCMD
  installs are the exception: they're tracked and killed on quit, and the app
  warns first.

## Roadmap

| Stage | Contents |
| --- | --- |
| 1 ✅ | Electron shell, API supervisor, packaging, portable data dir |
| 2 | Settings store + in-app settings, `servers.json` store, importer, SteamCMD auto-download |
| 3 | Real user accounts, cookie sessions, guest role, LAN-only enforcement |
| 4 | Settings UI, storage quotas, per-server RCON passwords, hardening |

Not in v1: port forwarding / UPnP (mesh vs non-mesh routers make it unreliable),
auto-updates, platforms other than Windows.

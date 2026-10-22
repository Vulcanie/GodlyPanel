# VERIFICATION BRIEF (check one new game on a real install through the panel)

You verify that a game GodlyPanel now supports really works. Read `docs\research\games\CONVENTIONS.md`, the game's `00-overview.md` and its dossier + `05-implementation-notes.md`
(`docs\research\games\<slug>\`). The notes end with "needs real-install verification": that list is your checklist.

## How
A scratch panel is already running at http://127.0.0.1:47999 (admin / Scratch-Admin-Pass-1, bound to localhost). Helpers in `C:\GodlyScratch`:
- `node drive.mjs <templateId>` creates a server from the template and waits for the SteamCMD install (prints status lines; sends fixed test
  values for name/passwords). Run it in the background if it will take minutes, and poll the log file you redirect it to.
- `MSYS_NO_PATHCONV=1 node ctl.mjs METHOD /api/path [json]` calls the panel API: `POST /api/control/<name with %20>/start` and `/stop`,
  `GET /api/status`, `GET /api/server/<name>`, `GET /api/config/<name>?file=<config file>`, `GET /api/templates`.
- The created server lives in `C:\GodlyScratch\data\servers\scratch-<id>\`. Its name is `Scratch <id>`.
Use PowerShell/Get-CimInstance to see which processes run from that folder, and `netstat -ano` for the ports.

## What to check (adapt to the game; evidence for each)
1. Creation completes; read the generated start script (hide passwords in what you report) and any config files the panel wrote.
2. Start via the API. Which process names run from the folder? Is `servers.json`'s `processName` the one that stays running? Does `GET /api/status`
   show the server online (or what does it show)? Which ports are bound (UDP/TCP) and do they match the template's ports + implicit ports?
3. Did the game accept the panel-written config (look at its own log for the settings being read, or for errors/ignored keys)? Does the game
   create the files the dossier says it creates? Do config files read through `GET /api/config/...` parse (the form can open them)?
4. Stop via the API. Does it say graceful or force-stopped, how long did it take, and does the game's log show a save/clean exit? Is anything left running?
5. Anything in the dossier or notes that turned out wrong (names, ports, process names, defaults, missing files).
6. Run the game's own `-help`/usage if it has one and compare to the launch-argument catalog.

## Rules
- Only touch `C:\GodlyScratch` and the scratch panel. Never touch `C:\GodlyPanelApp` (the user's live servers; never kill processes by image name; only
  stop what you started, identified by its path under C:\GodlyScratch).
- Do NOT edit any file in `C:\GodlyPanel`. Report problems; the lead fixes them. You may read repo files.
- No UPnP/router/firewall changes. Do not leave anything running when you finish: stop your server through the panel and confirm no process remains
  under `C:\GodlyScratch\data\servers\scratch-<id>`.
- Write `docs\research\games\<slug>\06-verification.md`: a table check | result (PASS/FAIL/PARTIAL) | evidence, then "Discrepancies to fix" listing exact
  file/line/value changes you recommend. Final message: max 150 words: pass/fail counts and the discrepancies.
- Be efficient with tokens: write your findings file early, then refine.

## Vault upkeep (lead, after the check)
In `<slug>/00-overview.md` set `status: verified` (or `verified-partial` with what failed) and link `[[06-verification]]`; update the "Run against a real install" column in `README.md`.

# New games: research and status

How each game was added: for every game, separate research passes (server basics, config files, launch arguments, mods) each wrote a
sourced dossier (`01-basics.md` to `04-mods.md` in the game's folder here), then a build pass turned it into a server module
(`src/server/data/games/<id>.js`) and an interface module (`ui/src/catalog/games/<type>.js`), with tests. `05-implementation-notes.md` lists
what was left out and what has to be checked on a real install. `CONVENTIONS.md` is the brief every pass worked from; `candidates.md` is the
ranked list of 20 popular 2026 games with dedicated servers (Steam ids, whether the download is anonymous, sources) the first six came from.

Rule used throughout: a setting, default, dropdown value or argument goes in only if the dossier cites a source for it. Anything unconfirmed
is left unexplained rather than guessed.

## Status (batch 1, 2026-10-14)

| Game | Settings | Launch args | Mods | Run against a real install |
|---|---|---|---|---|
| Unturned | 17 (`Commands.dat`, `WorkshopDownloadConfig.json`) | none (the server id must stay last on the line) | Workshop IDs field | **Yes**: created by the panel, `Commands.dat` applied (name, map, port, password), runs, Stop saves and exits cleanly |
| Abiotic Factor | 50 (`SandboxSettings.ini` 48, `Admin.ini` 2) | 18 | none supported | **Yes**: the game reads the panel's sandbox file (`-SandboxIniPath`), both UDP ports bind, `Admin.ini` is created, Stop is a clean console exit |
| Don't Starve Together | 18 (`cluster.ini`) | 18 | Workshop IDs written to the two Lua files | **Partly**: runs offline (no token), the panel's port flags are used, Stop shuts down cleanly. Not tried with a real cluster token; with no token a game port outside 10998 to 11018 does not bind (the creation warning says so) |
| SCUM | 409 | 5 | none supported | **Yes**, 5 problems found and fixed: the server asks for administrator rights (now started un-elevated so the panel can see and stop it), wrong port list (now `-QueryPort` and a TCP port at +2), first start discards the panel-written settings file (warning added), clean exit needs about 15 s (30 s grace), password appears in its own log (noted) |
| Icarus | 12 | 11 | none supported | **Yes**: the Shipping exe stays running, the game reads the pre-written settings file, the query port answers Steam queries (player counts), the game saves inside the install. Stop ends the process without a shutdown line in the game log |
| StarRupture | 5 | 5 | none supported | **Mostly**: both executables run, settings read from the install root, Stop is clean, spaces in names work. Save location and save-on-stop could not be tested without a game client |

Known limits of the panel for these games: it runs one process per server, so DST has the overworld only (no Caves shard); Stop asks the
window to close and then forces it after 15 seconds (30 for Satisfactory), so DST's `c_shutdown()` and Icarus's slow save are not used.

## Status (batch 2, 2026-10-15)

| Game | Settings | Launch args | Mods | Run against a real install |
|---|---|---|---|---|
| Soulmask | none (its rates file has no explanation anywhere) | 28 | Workshop IDs (`-mod`) | **Yes**: the Shipping exe stays running, not elevated, the local console answers `saveworld 1`. Closing the window alone does not save, so the panel now sends `saveworld 1` before a stop (`telnetSaveCommand`) |
| Garry's Mod | 145 (`server.cfg`) + 2 (`autoexec.cfg`) | 19 | one Workshop collection | **Mostly**: `srcds.exe` stays running, `server.cfg` runs, Stop is clean. Fixed: the console log is `console.log`, not `console.txt` |
| Barotrauma | none (its settings are XML attributes no parser reads) | 15 | manual (`LocalMods`) | No |
| Space Engineers | none | 11 | none | No. Built, **not registered**: the panel can't write a world or config yet |
| Necesse | none (its config shape fits no parser) | 16 | jar files in a mods folder | No. No graceful stop: its `quit` command cannot be sent |
| Left 4 Dead 2 | 110 (`server.cfg`) | 15 | Workshop addon ids | No |

## Status (batch 3, 2026-10-16)

Research for batch 3 used a cheaper two-stage process: a small model found the authoritative pages (`SOURCES.md` → `sources.md` per game) and then copied facts out of exactly those pages into fixed tables (`EXTRACT.md`), with `NOT FOUND` for gaps instead of guesses. The build step reads the same pages.

| Game | Settings | Launch args | Mods | Run against a real install |
|---|---|---|---|---|
| Squad | none (its `Server.cfg` has comment lines the parser would show as settings) | 14 | Workshop IDs, fetched once at creation | No |
| Arma Reforger | 40 (`server-config.json`) | 26 | none yet (mods go in `game.mods`) | No |
| VEIN | 16 (`Game.ini`) + 39 (`Engine.ini` `vein.*`) | 6 | none (no official support) | No |
| Terraria / tModLoader | research only | | | Not built: vanilla Terraria has no Steam server and tModLoader's Steam install needs a login, so it needs a download-a-zip install step the panel doesn't have |

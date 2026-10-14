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
| SCUM | 409 | 4 | none supported | No (15 GB download) |
| Icarus | 12 | 11 | none supported | No (10 GB download) |
| StarRupture | 5 | 5 | none supported | No (21 GB download) |

Known limits of the panel for these games: it runs one process per server, so DST has the overworld only (no Caves shard); Stop asks the
window to close and then forces it after 15 seconds (30 for Satisfactory), so DST's `c_shutdown()` and Icarus's slow save are not used.

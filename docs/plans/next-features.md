# Plan: the next fifteen features

Written 2026-09-30 after 0.1.0-alpha.3. The order below is the order of work; each
phase ends with its tests passing and a commit. Nothing is called done until it has
been exercised the way a person would use it, against real games where a game is
involved.

## Ground rules for testing (these apply to every phase)

**Real games, one at a time.** Every templated game gets installed for real through
the panel, into the test area (`C:\gp-testbed`), tested, and then deleted before the
next one is installed. Conan Exiles stays installed as the reference.

**Ports.** Only these, never anything else:

| Use | Ports |
|---|---|
| The test panel itself | 7100 |
| Spare (RCON/telnet for games that want a separate one) | 7101 |
| The community's Conan ports (free while their Conan is off) | 8892, 8893, 8894, 8895 |

Before any real game starts, the harness checks each port it needs is free on this PC
(TCP and UDP) and **skips that game with a clear message if anything holds one**, rather
than starting anything on top of a real server. It also checks each game's own fixed
default ports (Steam query ports and the like) for the same reason. It never stops, kills
or touches a process it didn't start from the test area. The user's real servers
(Valheim 7777/7778, Subsistence 8900/8902, the dogfood panel on 8765) are off limits.

**Disk.** 50 GB budget for the whole test area. The harness records free space and the
test area's size before and after every game, refuses to start an install if it would
take the area past 45 GB, and deletes each game after its run. Installs are sequential.

**Stand-in game tests stay.** Everything that can be tested without a 10 GB download
still gets an automated test (API tests with the stand-in game, unit tests for pure
logic, browser tests for the interface). Real-game runs are added on top, not instead.

**What can't be verified here is said plainly,** in the README and the release notes:
a live Discord bot needs a bot token; cloud storage needs an account; code signing needs
the owner's SignPath registration. For each of those the plan builds everything up to
the boundary and tests the rest against a stand-in (a fake Discord gateway, a local
MinIO server for S3), and says what remains unproven.

## Phase A — Verify every templated game against a real install (feature 1)

The single most valuable thing, so it goes first: its findings change templates that
every later feature reads (backup paths, log paths, mod folders, player commands).

**A1. A conformance harness** (`tests/real/conformance.mjs`), one game per invocation
(`--game valheim`), that does the same thing every time and records every finding:

1. free-space and port safety checks (above); create the server through the API with the
   ports assigned below; watch the install job
2. start; wait online (panel sees it by its own query method); confirm it really bound
   its ports (`Get-NetUDPEndpoint`/`Get-NetTCPConnection`)
3. logs: the log paths in `logTemplates.js` exist and have content; search works
4. backup: the paths in `backupTemplates.js` exist; take a backup in the game's own
   mode; verify the zip holds the world/settings and not the logs; restore a marker file
5. Stop through the panel; confirm a graceful exit (and how long it took)
6. crash recovery (kill the game from outside; auto-restart brings it back)
7. mods: where the game reads mods; add a file through the panel; start with it
8. players/ban/whitelist capabilities (Phase B) once they exist
9. port change on the stopped server, then start again on the new ports
10. clone (files and settings checked, not started, since ports are limited), delete with files

Output: a results file per game, and a support matrix in `docs/GAME_SUPPORT.md`
(what is verified, what differs from the templates, known quirks).

**A2. Games and the ports each gets** (all from the table above, one game at a time):

| Game | Game | Raw / next | Query | RCON / telnet | Notes |
|---|---|---|---|---|---|
| Conan Exiles | 8892 | 8893 | 8894 | 8895 | already verified; re-run as regression |
| ARK: Survival Evolved | 8892 | 8893 | 8894 | 8895 | |
| ARK: Survival Ascended | 8892 | (8893 reserved) | 8894 | 8895 | shared install |
| Valheim | 8892 | 8893 | (8894 is its third) | none | three consecutive UDP |
| Palworld | 8892 | (8893 reserved) | 8894 | 8895 | its public query may use a fixed port: checked free first |
| 7 Days to Die | 8892 | 8893-8895 | | telnet on 7101 | four consecutive |
| Enshrouded | 8892 (query) | (8893 reserved) | | none | |
| RuneScape: Dragonwilds | 8892 | (8893 reserved) | | none | |
| Windrose | 8892 | (8893 reserved) | | none | may need its own default ports |
| Subsistence | 8892 | (8893 reserved) | | none | its Steam port is checked free first |
| Minecraft (modpack) | 8892 | (8893 reserved) | | RCON 8895 | needs a CurseForge key and a server pack; if none is available it is tested with a hand-made pack and said so |

Expected install sizes are roughly 1 to 15 GB each; the harness reads the real size and
logs it. If a game can't be installed anonymously, or its dedicated server isn't
available, that is recorded and the template is fixed or marked.

**A3. Fix what the real installs show** (paths, stop commands, process names, query
protocol, missing config files), each with a regression test using the stand-in where the
bug can be reproduced without the game.

## Phase B — Back end for the new features (each with stand-in tests first)

Order is by dependency, not by number.

**B1. Hang detection (feature 3).** Per-server option `restartWhenUnresponsive` and a
minutes value. Extends the crash policy (pure, unit-tested) with "running but not
answering for N minutes": log it, optionally restart through the normal stop-and-wait
path, and count it against the same restart limit. Tested with a stand-in that accepts a
"hang" command (alive, silent). Real game: Conan frozen with a debugger-free method
(suspend the process) to prove the detection, then resumed/killed.

**B2. Config history (feature 11).** Every panel write to a settings or start-script file
(`writeManagedFile`) stores the previous and new content under `state/config-history`,
capped by count and size. API: list versions, fetch one, diff two, restore one (restore
itself writes a new version). Line-diff implemented in the UI from text, no dependency.

**B3. Metrics history (feature 8).** The resource sampler already reads CPU/RAM per server
every 15 s. Store one point per minute per server and for the whole PC in a compact ring
file (7 days), plus hourly aggregates for 90 days. API returns series for a range. Charts
are drawn as SVG in the interface. Tested with synthetic samples and a real game run.

**B4. Player statistics (feature 7).** From the existing join/leave events and the
concurrent-count samples: peak concurrent, average, busiest hours (a 7x24 grid), play
time per person, sessions per day. A charts tab built on the same SVG helpers as B3.

**B5. Announcements and MOTD (feature 4).** A new schedule kind "announce": rotating
messages on an interval, sent with each game's broadcast command (the table already in
`gameCommands.js`, extended and verified in Phase A). A per-game "message of the day"
editor where the game has one (Minecraft `server.properties`, Palworld/ARK/Conan
settings), applied through the config history so it can be undone.

**B6. Player management (feature 5): kick, ban, whitelist, admins.** A capability table
per game (what it supports, and how: RCON command, telnet command, or a file the panel
edits while the server is stopped or with a reload command). Needs player identities, not
just names, so the player tracker also stores the game's ID where the query provides one
(Steam ID for ARK/Palworld/Valheim/7DTD lists; UUID/name for Minecraft). Permissions:
kick and ban for moderators; list editing for administrators. Every action goes in the
activity log. Verified per game in Phase A on the games that support it; the rest are
shown as "not available for this game" rather than guessed.

**B7. Off-machine backups (feature 2).** Destinations a backup is copied to after it is
verified, each with its own retention:
1. another folder or drive (including a mapped drive or UNC share)
2. S3-compatible storage (AWS S3, Backblaze B2, Wasabi, MinIO): a small, dependency-free
   SigV4 client with multipart upload for large archives, credentials in the secrets file
3. cloud-synced folders (OneDrive, Google Drive, Dropbox) work through option 1, pointed
   at the sync folder, and are documented as such
Failures are retried, reported in the activity log and notified; the local backup always
stands. Restore can pull from any destination. Tested against a local MinIO binary run
from the test area on 7100/7101 (a real S3 implementation), plus a stand-in for error
cases (timeouts, bad credentials, interrupted uploads).

**B8. Setup checklist and reachability (feature 9).** A per-server checklist after
creation and on demand: the ports to open (with the raw/implied ones), Windows Firewall
rules for the game's program and ports (read with `Get-NetFirewallRule`, created on
request through a single elevation prompt), a reachability test from the panel to the
PC's own LAN address (catches a server bound only to localhost), the PC's public address
and a warning when it looks like CGNAT, and "set a backup schedule" / "turn on
auto-restart" prompts. A true outside-in test isn't possible for UDP games without a
third party, so this is stated, and an optional TCP check through a configurable probe
is offered for games with a TCP port.

**B9. Tags and search (feature 10).** Tags stored per server, a search box and tag
filters on the dashboard, and saved groups (for example "PvE", "event").

**B10. Remote access (feature 14).** A guided page, not an open port: detect Tailscale
(`tailscale status`), show the tailnet address the panel can be reached at, turn on the
"allow mesh VPN addresses" setting when needed, and explain the alternatives. Nothing is
ever exposed to the public internet by the panel. Tested with a stub `tailscale` command
and the existing network-filter tests; the real product is described as not exercised.

## Phase C — Discord bot (feature 6)

Slash commands over an outbound gateway connection (no inbound port needed): `/status`,
`/players`, `/start`, `/stop`, `/restart`, `/backup`, `/announce`. Who may run what is set
in the panel (Discord user or role IDs mapped to viewer / moderator / admin, reusing the
same permission table). Commands act through the same service calls as the interface, so
the locks, backups and logging all apply. The bot token lives in the secrets file.
Tested with the command handlers driven by fake interactions and a fake gateway; a live
server needs a token, so live behaviour is marked unverified until one is provided.

## Phase D — Interface for everything, theme and phones (feature 12)

- New tabs/cards: Metrics and Player stats charts, Config history, Players (kick/ban and
  lists), Announcements, Setup checklist, Backup destinations, Discord bot and Remote
  access pages, tags and search on the dashboard.
- Theme: dark, light, or follow Windows, remembered; every component checked in both.
- Phone layout: the dashboard, server workspace, dialogs and tables checked at 390 px and
  768 px in a real browser with screenshots reviewed, fixing what overflows.
- Browser tests extended (tests/ui) for each new surface, as administrator and moderator.

## Phase E — More games (feature 15)

Each new template is added only after its dedicated server has been installed and run
through the conformance harness. Candidates, most likely first: Project Zomboid, Rust,
Satisfactory, V Rising, Core Keeper, Sons of the Forest, Don't Starve Together. Steam
app ids, launch arguments, ports, config files and save/log/mod locations are checked
on the real install, not copied from documentation; a game that can't be made to work
cleanly is dropped and recorded rather than shipped half-working. Ports come from the
same table (the game's extra fixed ports are checked free first); one game at a time,
deleted after.

## Phase F — Code signing (feature 13), documentation, release

- Signing: the release workflow gets an optional SignPath step (skipped until the
  repository is public and the owner has registered), plus a document of exactly what to
  do and what it costs. Until then the unblock-the-zip instructions stay.
- README, THIRD_PARTY_NOTICES, GAME_SUPPORT.md, CONTRIBUTING and the release notes updated.
- Full regression: the whole suite, the desktop tests, every real-game run, the browser
  tests, the clean-machine workflow (extended for the new features), then a release as
  0.1.0-alpha.4 with the packaged zip itself tested from a fresh unzip.

## Order of work

1. Finish alpha.3 (published, zip tested, dogfood panel updated).
2. Phase A harness, then the games in this order (small and fast first, so problems in the
   harness show up cheaply): Valheim, Enshrouded, Subsistence, Dragonwilds, Windrose,
   Palworld, 7 Days to Die, ARK: Survival Evolved, ARK: Survival Ascended, Minecraft, then
   Conan again as regression.
3. Phase B, in the order B1, B2, B3, B4, B5, B6, B7, B8, B9, B10.
4. Phase C, then Phase D, then Phase E, then Phase F.
5. Commit at the end of every step; push and let CI run at the end of every phase.

## What will not be fully provable here

- A live Discord bot (needs a token) and live cloud storage (needs an account): built and
  tested against stand-ins and a local MinIO, labelled unverified against the real services.
- Real Tailscale, code signing, and router/firewall behaviour on other people's networks.
- Games whose dedicated server can't be installed anonymously, if any.

Each of these is listed in the README's known limitations when the release goes out.

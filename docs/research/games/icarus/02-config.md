# Icarus dedicated server: config files and settings (research 2026-10-14)

Build the facts are for: Steam app 2089300 "Icarus Dedicated Server" (Tool, installdir `Icarus Dedicated Server`, launch executable `IcarusServer.exe`), public branch buildid 25793607 (updated 2026-10-08 UTC), experimental buildid 25897525 (2026-10-13). Source: https://api.steamcmd.net/v1/info/2089300
Ground-truth files read: the RocketWerkz GitHub repo `ServerSettings.ini` (last commit 2022-12-01) and the wiki repo (cloned and read locally, latest wiki commit 2024-06-18): https://github.com/RocketWerkz/IcarusDedicatedServer and https://github.com/RocketWerkz/IcarusDedicatedServer/wiki
Not read: the shipped file inside a real install (none available here; the official wiki says the install does NOT ship it, see below).

## Config files that exist

Only ONE user-editable server config file is documented anywhere: `ServerSettings.ini`. Difficulty, hardcore and world rules are NOT in any config file; they are chosen when a "prospect" (world save) is created (see "Where difficulty lives").

### File 1: ServerSettings.ini
- Location relative to install: `Icarus\Saved\Config\WindowsServer\ServerSettings.ini`. The official wiki says: "[ServerInstallDirectory]\Icarus\Saved\Config\WindowsServer\" and, if `-UserDir=` moves the Saved folder, `[YourSavedFolder]\Config\WindowsServer\`. Source: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Setup
- (Contradiction: one hosting provider, XGamingServer, says its Wine-based image uses `Icarus/Saved/Config/ServerSettings.ini` with no `WindowsServer` subfolder, https://xgamingserver.com/docs/icarus/server-config . That is a Linux/Wine hosting image; the official wiki path applies to the Windows server. Treat the official one as correct for GodlyPanel.)
- Format: Unreal-style ini, single section header `[/Script/Icarus.DedicatedServerSettings]`, `Key=Value` lines, booleans written `True`/`False`, numbers written like `300.000000`. Source: https://raw.githubusercontent.com/RocketWerkz/IcarusDedicatedServer/main/ServerSettings.ini (file read via git clone).
- Created by the game? The official wiki says: "the settings file gets generated on first prospect/lobby" (as of the wiki's writing; they said they were working on shipping it with the install). So a fresh install has NO file until the server has reached the lobby once. Workaround from the wiki: copy the repo's `ServerSettings.ini` into the folder above before first start. Source: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Setup . A hosting guide (GameServerKings) repeats that it appears after the first boot to the lobby: https://www.gameserverkings.com/knowledge-base/icarus/icarus-server-settings.md . Whether it is STILL not shipped in the current 2026 build: UNVERIFIED (no real install inspected).
- The panel can therefore write the file (the template below) before first start. The template is exactly the official repo file:

```
[/Script/Icarus.DedicatedServerSettings]
SessionName=
JoinPassword=
MaxPlayers=
AdminPassword=
ShutdownIfNotJoinedFor=300.000000
ShutdownIfEmptyFor=300.000000
AllowNonAdminsToLaunchProspects=True
AllowNonAdminsToDeleteProspects=False
LoadProspect=
CreateProspect=
ResumeProspect=True
LastProspectName=
```

- Values are read at start-up, so a restart is needed after editing (GameServerKings, https://www.gameserverkings.com/knowledge-base/icarus/icarus-server-settings.md; official wiki does not state this explicitly, hence secondary source). Note: `LastProspectName` is written by the server itself while running, so edit the file only while stopped.

Table (all 12 keys of the file; descriptions drafted from the official wiki text, paraphrased in plain language):

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| SessionName | Session name (does not work) | Meant to be the server's name in the browser, but the developers say it currently does nothing. Set the name with the `-SteamServerName=` launch argument instead. | General | (empty) | text | any text; has no effect | https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Config-&-Launch-Parameters (wiki repo file `Server-Config-&-Launch-Parameters.md`) |
| JoinPassword | Join password | Password players must enter to join. Leave empty for an open server. | Access | (empty) | text | any text, or empty for no password | same as above |
| MaxPlayers | Max players | The most players allowed on the server at once. Empty uses the game default (8 per XGamingServer). The official wiki documents 1 to 8. | General | (empty; game default 8, see note) | integer | official: 1 to 8. Higher values: see note | wiki file above; https://xgamingserver.com/docs/icarus/server-config |
| AdminPassword | Admin password | Password players type in chat (`/AdminLogin <password>`) to become admin and use kick/ban/return-to-lobby commands. If left empty, typing `/AdminLogin` with no password makes ANY player admin, so set one. | Access | (empty) | text | any text | wiki file above; https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Console---RCON-Commands |
| ShutdownIfNotJoinedFor | Shut down if nobody joins (seconds) | After the server starts a world, if no player joins within this many seconds the world shuts down and the server returns to the lobby (the game is paused meanwhile). Below 0 = never; 0 = immediately; above 0 = wait that many seconds. Only use low values if you want to start worlds from the lobby each time. | Idle behaviour | 300.000000 (5 minutes) | number (seconds, decimal) | negative = run forever, 0 = as soon as possible, positive = seconds | wiki file above; repo ServerSettings.ini |
| ShutdownIfEmptyFor | Return to lobby when empty (seconds) | After the last player leaves, the server waits this many seconds then closes the world and returns to the lobby (paused meanwhile). Below 0 = never; 0 = immediately; above 0 = seconds. | Idle behaviour | 300.000000 (5 minutes) | number (seconds, decimal) | negative = run forever, 0 = as soon as possible, positive = seconds | wiki file above; repo ServerSettings.ini |
| AllowNonAdminsToLaunchProspects | Anyone can start worlds | If True, anyone in the lobby can create a new world or load an existing one. If False, only players logged in as admin can. | Lobby permissions | True | boolean | True, False | wiki file above |
| AllowNonAdminsToDeleteProspects | Anyone can delete worlds | If True, anyone in the lobby can delete saved worlds from the server. If False, only admins can. | Lobby permissions | False | boolean | True, False | wiki file above |
| LoadProspect | Load this world at start | Name of a saved world (a prospect save) to load automatically when the server starts. Looked up in `Saved\PlayerData\DedicatedServer\Prospects\`. Leave empty to not force one. | World at startup | (empty) | text | save name of an existing prospect | wiki file above |
| CreateProspect | Create this world at start | Creates and starts a brand-new world at startup. Format: `<ProspectType> <Difficulty 1-4> <Hardcore true/false> <SaveName>`, e.g. `Tier1_Forest_Recon_0 3 false TestProspect01`. SaveName is required for outposts; for ordinary prospects a random name is made if omitted. | World at startup | (empty) | text (4 space-separated parts) | ProspectType = internal name (list in "Prospect internal names"); Difficulty = 1 Easy, 2 Medium, 3 Hard, 4 Extreme; Hardcore = true/false (true disables respawn); SaveName = text | wiki file above; difficulty names 2/3 from https://xgamingserver.com/docs/icarus/server-config |
| ResumeProspect | Resume last world at start | If True, the server automatically reopens the last world it ran (named in LastProspectName) on startup, skipping the lobby. | World at startup | True | boolean | True, False | wiki file above |
| LastProspectName | Last world used | The world that ran most recently. Filled in by the server; ResumeProspect reads it. Normally do not edit. | World at startup | (empty) | text | save name of an existing prospect | wiki file above |

Notes on the table
- Order the server processes startup world commands (official wiki): LoadProspect, then ResumeProspect, then CreateProspect. If none gives a world, the server waits in the lobby so players can pick one. Source: wiki file `Server-Config-&-Launch-Parameters.md`.
- MaxPlayers above 8: the official wiki still says "Minimum 1, Maximum 8". Third-party sources say the 8-player cap was lifted for dedicated servers in Week 54 (Dec 2022): https://eip.gg/icarus/news/icarus-week-54-update-dropship-beacon-dynamic-landing-zone-and-no-player-limit/ and https://www.player.one/icarus-players-can-now-invite-more-eight-people-session-week-54-update-153030 ; the dev quote reported is "opened up to more than 8 players, but at the risk of server degradation" (as quoted by GameServerKings, https://www.gameserverkings.com/knowledge-base/icarus/icarus-server-settings.md). I did not open the original RocketWerkz patch note, so the exact upper limit is UNVERIFIED. Suggested UI: number box with 1-8 documented, a hint that more may work but is untested.
- Whether Windows server accepts unquoted booleans in other casing (true/false): UNVERIFIED (repo file uses True/False).
- "ShutdownIf..." text on the official wiki says Values < 0 run indefinitely. XGamingServer says "0 disables"; the official wiki says 0 = shut down as soon as possible. Official wiki wins; the XGamingServer claim is contradicted.

## Where difficulty and world rules live (no config file)
- Difficulty (1 Easy to 4 Extreme per the official wiki; names for 2 and 3 "Medium"/"Hard" from XGamingServer and consistent with the official example, "3 = hard") and Hardcore are arguments of `CreateProspect` (config key, launch argument, or in-lobby console command) or picked in the lobby UI. Source: official wiki file above. GameServerKings adds that difficulty cannot be changed after the prospect is created (secondary source, UNVERIFIED officially): https://www.gameserverkings.com/knowledge-base/icarus/icarus-server-settings.md
- "Custom World Settings" (in-game, per world, saved in the prospect file, changed from the escape menu by host/admin without restart): GameServerKings lists "Arachnophobia Mode" (added Week 211, 19 Dec 2025; default Off for new prospects, On for existing ones) and "Mount Unclaim Requires Ownership" (added Week 223, 13 Mar 2026). This is the only mention found; the full list of world rule options (e.g. resource/XP multipliers) was NOT found documented anywhere and is UNVERIFIED. Source: https://www.gameserverkings.com/knowledge-base/icarus/icarus-server-settings.md
- Consequence for the panel: no sandbox-rule catalog is possible from files; only the CreateProspect string (type/difficulty/hardcore/name) can be exposed.

## Other files and folders (not settings files, but relevant)
| path (relative to install) | what | source |
|---|---|---|
| `Icarus\Saved\PlayerData\DedicatedServer\Prospects\<name>.json` | World saves ("prospects"); also `.json.bak` backups per XGamingServer. Editing the name or JSON of a save file corrupts it (official warning). | https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Migrating-prospect-from-local-Icarus ; https://xgamingserver.com/docs/icarus/server-config |
| `Icarus\Saved\Logs\` | Logs; location adjustable with `-LOG=` (relative to Saved\Logs\) or `-ABSLOG=` | wiki file `Server-Config-&-Launch-Parameters.md` |
| ban list | `/BanPlayer` writes a saved ban list; file name/path UNVERIFIED | https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Console---RCON-Commands |
| `Icarus\Content\Paks\mods\` | Where `.pak` mods go (hosting-provider claim only; folder may need creating; clients must have identical paks) | https://low.ms/knowledgebase/icarus-server-settings-guide (secondary; for the mods step, UNVERIFIED officially) |

The "engine config" the official wiki mentions for changing ports ("can be changed in either the engine config or using the command line parameters") has no file name, path or key given anywhere I found. UNVERIFIED; use `-PORT=` and `-QueryPort=` instead.

## Prospect internal names (for the CreateProspect dropdown)
Official list (prospect internal name -> in-game name) is in the wiki file `Prospect-Names.md`: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Prospect-Names . Notable entries: `OpenWorld_Styx` = Styx (open world, permanent), `Outpost002_Forest` ARCWOOD, `Outpost003_Arctic` ICEHOLM, `Outpost005_Forest` HOLDFAST, `Outpost006_Olympus` Olympus (outposts, need SaveName), `Tier1_Forest_Recon_0` BEACHHEAD (the official example, called "tutorial prospect"), plus about 100 timed missions Tier1 to Tier5 (e.g. `Tier2_Canyon_Exploration_0` SANDBLAST, `Tier4_Arctic_Extraction_0` PAYDAY, `Tier5_Omni_Research` UNEARTHED). The list was last edited with the wiki (2024) and is likely missing newer prospects (the game has had updates through 2026): completeness UNVERIFIED. Full table is in the wiki repo; I did not copy all ~105 rows here to avoid transcription errors; copy it from the source file when building the dropdown.

## Launch arguments seen (for the launchArgs step; full detail is a separate step)
From the official wiki (`Server-Config-&-Launch-Parameters.md`, `Server-Setup.md`, `Updating-Dedicated-Server-and-Running-your-Server.md`): `-Log` (opens log window; without it nothing is visible), `-SteamServerName="name"` (64 characters max), `-PORT=` (default 17777), `-QueryPort=` (default 27015), `-MULTIHOME=`, `-UserDir=`, `-saveddirsuffix=`, `-LOG=`, `-ABSLOG=`, `-ResumeProspect`, `-LoadProspect=<name>`, `-CreateProspect="<Type> <Diff> <Hardcore> <SaveName>"`. Ports are UDP per hosting guides (XGamingServer, low.ms); the official wiki just says "game port and query port" (protocol UNVERIFIED officially). RCON: there is no separate RCON port or password in config; "RCON" commands are typed in the in-game chat after `/AdminLogin` (wiki file `Console---RCON-Commands.md`): AdminLogin, KickPlayer, BanPlayer, UnbanPlayer, ReturnToLobby, ReturnToLobbyWhenEmpty, AdminSay; lobby commands LoadProspect, CreateProspect, ResumeProspect.

## UNVERIFIED list
1. Whether the current 2026 server build ships `ServerSettings.ini` in the install (wiki text is from 2022-2024 and says it is generated at first lobby).
2. Real upper limit of `MaxPlayers` on dedicated servers (official wiki says 8; third parties say the cap was removed in Week 54; original patch note not opened).
3. Whether `ServerSettings.ini` is read at startup only (stated by a hosting guide, not by the official wiki) and whether the server rewrites the file on shutdown (only LastProspectName known to change).
4. The "engine config" file/keys that can change ports (named in the official wiki, not specified).
5. Ban list file name and location.
6. Protocol of the two ports (UDP per hosting guides only).
7. Complete list of in-game "Custom World Settings"/sandbox rules, and whether any can be set on the server from files or launch arguments.
8. Whether the Prospect-Names list is complete for the current build.
9. Whether difficulty can be changed after a prospect exists (only a hosting guide says no).
10. Case-insensitivity of boolean values.
11. Mods folder `Icarus\Content\Paks\mods\` (hosting-provider claim only); left for the mods step.
12. RAM requirement (not in official pages).

## Settings found but not confidently explainable
- `LoadProspect` vs `LastProspectName` interplay when both set: the order of processing (LoadProspect first, then ResumeProspect) is documented, but what happens when LoadProspect names a missing save is not.
- `SessionName`: documented as non-functional; kept in the catalog so users see it, labelled "does not work".
- No other keys beyond these 12 were found in any source; if the server writes additional keys into the generated file in newer builds, they are unknown (see UNVERIFIED 1).

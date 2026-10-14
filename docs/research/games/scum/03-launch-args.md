# SCUM dedicated server: launch arguments (research 2026-10-14)

Server build: Steam app 3792580 "SCUM Server" (Tool, Windows 64-bit only), current public build as of 2026-10-14 (build id not checked).
No complete official argument list exists. The SCUM community wiki is the closest thing to an official source (it is the wiki linked from the game's community); the developer (Gamepires) published no argument reference that I could find. Everything below comes from the sources in the last column; most flags are corroborated by several independent guides, one (-QueryPort) has only hosting-vendor sources.

## Ground truth from Steam itself (the app's own launch entry)
Source: https://api.steamcmd.net/v1/info/3792580 (mirror of Steam appinfo)
- executable: `SCUM\Binaries\Win64\SCUMServer.exe`, arguments: `-log`, oslist windows, osarch 64, installdir `SCUM Server`.
- So the process name to match is `SCUMServer.exe` (that is what the Steam launch entry and the wiki start). Whether the Unreal engine spawns a second process with a different name (e.g. `SCUMServer-Win64-Shipping.exe`) is UNVERIFIED.
- Install: `steamcmd +force_install_dir <dir> +login anonymous +app_update 3792580 +quit` (https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup). Note: `validate` is shown in the interactive steps and in several guides.

## Game-specific arguments (all use `-name=value` or bare `-flag`, no space-separated values seen anywhere)

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-log` | bare flag | bool | Show console window | Opens the server's log window so you can watch what it is doing. The Steam launch entry already includes it. Keep it on for a hobby server. | Saves and logs | `-log` | n/a | on in Steam's own launch entry | yes (always written) | https://api.steamcmd.net/v1/info/3792580 ; https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup (the wiki gives no explanation of -log; description here is inferred from the Scribd tutorial snippet "should launch with -log ... opens the server window where you can monitor its status", search result for https://www.scribd.com/document/899279499/Copia-de-SCUM-Server-Tutorial, not opened) |
| `-port=<n>` | equals, attached value | value (number) | Game port | The port players connect on (UDP). The Steam/query port is this number plus 2 and a raw UDP socket uses plus 1, so keep three free ports in a row. | Network | `-port=7777` | whole number; avoid 27020-27050 (Steam uses these) | wiki is contradictory: Network table uses game port 7777; script comment says "default is 7779". Real default UNVERIFIED | yes (port) | https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup (raw: https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup?action=raw) ; same `-log -port=7777 -MaxPlayers=64` line in https://www.eugamehost.com/blog/how-to-set-up-a-scum-dedicated-server-2025-complete-step-by-step-guide/ , https://steamcommunity.com/sharedfiles/filedetails/?id=3502203232 , https://dustbowl.games/knowledgebase/scum-dedicated-server-setup |
| `-MaxPlayers=<n>` | equals, attached | value (number) | Max players | How many players can be online at once. Overrides the player limit in ServerSettings.ini. | Server | `-MaxPlayers=32` | whole number. Upper limit disputed: dustbowl says 100 on v1.0+, melle2 docker says max 128, survivalconfigs says hard cap 64. UNVERIFIED | 64 in wiki example, egg and docker default; no true default found | yes (max players) | https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup ; https://hub.docker.com/r/melle2/scum-dedicated-server ; https://dustbowl.games/knowledgebase/scum-dedicated-server-setup ; https://survivalconfigs.com/scum (only via search snippet, not opened) |
| `-nobattleye` | bare flag | bool | Turn off anti-cheat (BattlEye) | Starts the server without the BattlEye anti-cheat. The wiki marks this "not recommended"; players on BattlEye servers may not be able to join an unprotected one (join compatibility UNVERIFIED). | Advanced | `-nobattleye` | n/a | off (BattlEye on) | no (user option, off by default) | https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup ; https://steamcommunity.com/sharedfiles/filedetails/?id=3502203232 ; https://github.com/melle2/scum-ds/blob/main/startScum.sh |
| `-QueryPort=<n>` | equals, attached | value (number) | Steam query port | Port the Steam server list uses to ask about the server (UDP). Guides say it should be game port + 2. Optional; the wiki does not list it. | Network | `-QueryPort=7779` | whole number; not 27020-27050 if running locally | UNVERIFIED (wiki: game port + 2 automatically) | yes if used | Pterodactyl official egg https://eggs.pterodactyl.io/egg/games-scum (`wine ./SCUM/Binaries/Win64/SCUMServer.exe -Port=7777 -QueryPort=27015 -MaxPlayers=64`); https://www.eugamehost.com/blog/how-to-set-up-a-scum-dedicated-server-2025-complete-step-by-step-guide/ (`-queryPort=` should be +2 of game port); https://gamecp.com/games/scum/hosting-guide (`-Port=27165 -QueryPort=27167`). The wiki's own text says the connection (query) port is port+2 with no flag. Spelling varies in case between sources; Unreal parses these case-insensitively (general UE behaviour, not SCUM-sourced). |

## Not arguments (checked, no flag exists in any source)
- Server name, description, password and admin settings: not launch flags. They are `scum.ServerName`, `scum.ServerDescription`, `scum.ServerPassword`, `scum.MaxPlayers` etc. in `SCUM\Saved\Config\WindowsServer\ServerSettings.ini` (the panel's config-file job, not launch args). Sources: https://www.gameserverkings.com/knowledge-base/scum/scum-server-settings-ini/ (file created by server on first boot, all keys prefixed `scum.`), https://steamcommunity.com/sharedfiles/filedetails/?id=3502203232 (key names; the page was flagged/removed so treat as weak). The Pterodactyl egg has server name/password/playstyle variables but its startup command only passes Port, QueryPort, MaxPlayers, so the egg must write them to the ini.
  => panel-managed items "name/password/save path" therefore go to ServerSettings.ini, not to the command line.
- Save path: no flag found. Saves are at `SCUM\Saved\SaveFiles\` (https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step); wiki recommends backing up `SCUM\Saved` (eugamehost). A custom save-path argument is UNVERIFIED / not found.
- RCON: no launch flag. The wiki's port table lists optional "TCP 7777 RCON" with no setup text; survivalconfigs lists "RCON / Telnet N/A (in-game admin)". Admin is via in-game chat commands (e.g. `#Kick`, `#Ban`; also `#RestartServer` per oxygenserv). Conflicting, so no RCON-based stop should be assumed.

## Generic engine (Unreal Engine) arguments
No generic UE flag (`-unattended`, `-nosteam`, `-nosound`, `-NoSplash`, `-stdout`, `-FullStdOutLogOutput` etc.) was found documented for SCUM in any opened source. `-log` is the only engine-style flag in Steam's own entry. I am NOT listing any other generic flag as safe. The search tool found no mention of `-nosteam` or `-RCON` for SCUM.

## Launch script shape (what the panel should write)
Per wiki (https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup): working directory `<install>\SCUM\Binaries\Win64\`, line `SCUMServer.exe -log -port=7777 -MaxPlayers=64` (or `start SCUM\Binaries\Win64\SCUMServer.exe ...` from the install root). A guide's batch loops restart (`:start` / `SCUMServer.exe -log -port=7777 -MaxPlayers=64` / `timeout /t 5` / `goto start`): https://dustbowl.games/knowledgebase/scum-dedicated-server-setup .
Minimum start: `SCUMServer.exe -log` (Steam's entry; wiki "update and start" sample uses only `start SCUMServer.exe -log`). First run: dustbowl uses `SCUMServer.exe -log -port=7777`; a ServerSettings.ini is written by the server on first boot (gameserverkings), though one guide claims it appears only after running a save command (steam guide, weak).
Stopping: Ctrl+C in the console window (oxygenserv: "press CTRL + C in the CMD window"); in-game `#RestartServer` mentioned there too. Console commands section of the wiki is "To be determined". After shutdown `SCUM.db-shm` / `SCUM.db-wal` should not remain (oxygenserv) - a sign of clean stop.
Ports (not args but needed): UDP 7777 game, UDP 7778 raw socket (game+1), UDP 7779 query (game+2), optional TCP 7777 RCON (wiki). Other vendors use 27165/27167 (gamecp) or 27015 (egg); these are just chosen values.

## UNVERIFIED list
1. True default value of `-port` (wiki says 7779 in a script comment and 7777 in the network table).
2. Whether `-QueryPort` is honoured by the current build, and its true default; only hosting vendors list it, the wiki does not.
3. Real maximum for `-MaxPlayers` (64 vs 100 vs 128 in different sources) and its true default when omitted.
4. Whether players can join a `-nobattleye` server from a normal BattlEye-enabled client.
5. Any generic Unreal Engine flags (`-unattended`, `-nosteam`, `-nosound`, etc.) for SCUM: none found.
6. Any save-path / config-path override argument: none found.
7. Real process name seen by Windows (SCUMServer.exe from the wrapper vs a `-Win64-Shipping` child process).
8. Whether a launch flag exists for server name/password/admin (none found; ini keys used instead).
9. Description of `-log` is not explained on the wiki (inferred from a secondary tutorial snippet not opened).
10. RCON on TCP 7777: whether it exists and how it is enabled (wiki lists the port only; other sources say none).
11. Fandom wiki https://scum.fandom.com/wiki/Scum_Dedicated_server_setup (HTTP 402) and Legion Hosting KB (HTTP 403) could not be opened; no official Gamepires document found.
12. Build id / version these flags were checked against (not retrieved).

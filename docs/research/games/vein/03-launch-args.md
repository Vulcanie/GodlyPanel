# VEIN LAUNCH arguments

Server exe for the Windows shipping build: `Vein/Binaries/Win64/VeinServer-Win64-Test.exe` (wiki). Launcher: `VeinServer.exe` (github). Linux: `VeinServer-Linux-Test` (gameserverkings).

Raw text copies are in `<game folder>\raw\`: `vein-wiki-dedicated-server-setup.txt`, `gameserverkings-vein-dedicated-server.txt`, `github-windowsgsh-vein.txt`, `docker-johnnyknighten-vein-server.txt`, `ramjet-dedicated-servers.txt`, `ramjet-initial-setup.txt`.

## Table

| argument exactly as written | takes a value? | default | allowed values | description (page's words) | url |
|---|---|---|---|---|---|
| `-log` | No | NOT FOUND | NOT FOUND | NOT FOUND on this page (appears only in the example command lines) | https://vein.wiki.gg/wiki/Vein_Dedicated_Server_Setup |
| `-port=7777` | Yes (`=`) | 7777 (value in the example) | NOT FOUND | "Replace the port 7777 with another port if you wish to use another port." | https://vein.wiki.gg/wiki/Vein_Dedicated_Server_Setup |
| `-MaxPlayers=64` | Yes (`=`) | NOT FOUND (64 is the value in the example) | NOT FOUND | "Replace the max players from 64 to your desired max player number." | https://vein.wiki.gg/wiki/Vein_Dedicated_Server_Setup |
| `-QueryPort=7778` | Yes (`=`) | NOT FOUND (7778 is the value in the example; the page says it is for the "alternate method") | NOT FOUND | NOT FOUND on this page beyond the example line `start vein\Binaries\Win64\VeinServer-Win64-Test.exe -log -port=7777 -QueryPort=7778` under "alternate method" | https://vein.wiki.gg/wiki/Vein_Dedicated_Server_Setup |
| `-Port=7777` | Yes (`=`, "Don't forget the =") | 7777 (page: "UDP 7777 for gameplay") | NOT FOUND | "Change the game and query ports. Don't forget the =" | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| `-QueryPort=27015` | Yes (`=`, "Don't forget the =") | 27015 (page: "UDP 27015 for the Steam query") | NOT FOUND | "Change the game and query ports. Don't forget the =" | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| `-log` | No | NOT FOUND | NOT FOUND | "Console output: Only if you start the server with -log" (glance table); also "run `VeinServer` with `-log`" | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| `-multihome=<IP>` | Yes (`=`, value is an IP address) | NOT FOUND | NOT FOUND (page writes it as `<IP>`) | "Bind to one IP address on a machine that has several" | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| `-onethread` | No | NOT FOUND | NOT FOUND | "Run single-threaded, useful when one machine hosts several servers" | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| `+app_update 2131400 -beta experimental` | Yes (`-beta experimental`) | NOT FOUND | NOT FOUND | "Install the experimental branch (a SteamCMD option, not a launch flag)" (the page's own note; not a server launch argument) | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| `-SaveDir` | Implied yes: page gives a path, but the value form is not stated | NOT FOUND | NOT FOUND | "Saves: pinned with -SaveDir to Vein/Saved/SaveGames" | https://github.com/WindowsGSH/WindowsGSH.VEIN |

## Notes from the pages (not table rows)

- Wiki, "Optional Commandline Arguments:" section says only: "Pending further testing." (https://vein.wiki.gg/wiki/Vein_Dedicated_Server_Setup)
- WindowsGSH manages the game port, Steam query port, player limit, logging and save directory. "Each is passed through ProcessStartInfo.ArgumentList; duplicate managed switches in Additional Arguments are removed." The page does NOT name the switches for game port, query port, player limit or logging. Its defaults are game 7777 (UDP) and query 7778 (UDP), "game port plus one." (https://github.com/WindowsGSH/WindowsGSH.VEIN)
- Ramjet "Initial Setup" lists the SteamCMD commands and says "Be sure to open UDP ports 27015 and 7777." Its "Starting the Server" heading has no launch-argument text. (https://ramjet.notion.site/Initial-Setup-279f9ec29f17809c9ebce81e96ec48e7)
- Docker image: no launch arguments are documented. Configuration is by environment variables only: "Environment variables are the primary way to configure the server itself." Relevant ones: VEIN_SERVER_PORT (default 7777), VEIN_SERVER_QUERY_PORT (default 27015), VEIN_SERVER_MAX_PLAYERS (default 16), VEIN_SERVER_NAME, VEIN_SERVER_PASSWORD, VEIN_SERVER_PUBLIC, VEIN_SERVER_DESCRIPTION, VEIN_VAC_ENABLED. (https://hub.docker.com/r/johnnyknighten/vein-server)
- gameserverkings "Your GameServerKings VEIN server" says the panel starts the server "with -Port, -QueryPort and -log already set" (values not stated on that sentence).

## CONFLICTS (both values written, not picked)

- Query port default:
  - 7778: https://vein.wiki.gg/wiki/Vein_Dedicated_Server_Setup (network table, and example `-QueryPort=7778`)
  - 7778: https://github.com/WindowsGSH/WindowsGSH.VEIN ("game port plus one"; 27015 only "when explicitly configured")
  - 27015: https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ (glance table, and "Query Port 27015" in the panel settings)
  - 27015: https://hub.docker.com/r/johnnyknighten/vein-server (VEIN_SERVER_QUERY_PORT default)
  - 27015: https://ramjet.notion.site/Initial-Setup-279f9ec29f17809c9ebce81e96ec48e7 ("open UDP ports 27015 and 7777")
- Max players: the wiki example uses `-MaxPlayers=64`. The gameserverkings panel default for "Max players" is 16, and the docker VEIN_SERVER_MAX_PLAYERS default is 16. These are an example value and panel/env defaults, not a stated launch-argument default. Both are written as the pages have them.
- Spelling of the port flag: the wiki writes `-port=7777` (lower case) and gameserverkings writes `-Port=7777`. Both are written as the pages have them.

## NOT FOUND / UNSURE

- Wiki: any launch argument beyond `-log`, `-port`, `-MaxPlayers` and `-QueryPort` ("Pending further testing.").
- Wiki: description of `-log`, `-MaxPlayers`, `-QueryPort`, `-port`. (Only example lines.)
- Wiki: default value for `-MaxPlayers` (only the example 64).
- gameserverkings: values for `-multihome` and `-onethread` (none given), and the allowed values for all flags.
- github: names of the switches WindowsGSH uses for game port, query port, player limit and logging (not named on the page).
- github: whether `-SaveDir` takes a path as a separate token or with `=` (page only gives `-SaveDir` and "to Vein/Saved/SaveGames").
- Docker: no launch arguments; these are environment variables, not arguments, so no table rows were written.
- Ramjet "Starting the Server" section: no argument text was extracted from that page.
- Ramjet pages were read because the task asked for them. They are not in the LAUNCH list in sources.md. The index page (https://ramjet.notion.site/dedicated-servers) was read, and its "Initial Setup" sub-page (https://ramjet.notion.site/Initial-Setup-279f9ec29f17809c9ebce81e96ec48e7) was read as a direct sub-page. The "Config" page was not read.
- xgamingserver (listed in sources.md BASICS and CONFIG, not LAUNCH) was not read for this file.

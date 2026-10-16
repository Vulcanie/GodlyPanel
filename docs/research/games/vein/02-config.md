# VEIN - CONFIG

Topic: CONFIG. Game: VEIN (Steam app 2131400 server). Sources: CONFIG list 1-6 in sources.md, read from the saved copies in the raw folder next to this file (raw/c1 to raw/c6). The Ramjet Notion page was read with the browser (raw/r1-ramjet-notion-dedicated-servers.txt). It has no config keys: it covers SteamCMD install, the Linux/Windows exe names, the Engine/steamclient link, and the UDP ports 27015 and 7777.

Short URL keys used in the url column are written out in full below each row.

Pages that said something about config (all community or repo pages except the Ramjet page):
- C1 https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ (GameServerKings, checked against VEIN 0.025)
- C2 https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ (XGamingServer tutorial, dated October 18, 2023)
- C3 https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ (GameServerKings, checked against VEIN 0.025)
- C4 https://client.citadelservers.com/knowledgebase/1002/Citadel-Servers---VEIN-Dedicated-Server-Configuration-Guide..html (Citadel Servers; the console variable list is stated as incomplete and dated to the writing of the article)
- C5 https://github.com/WindowsGSH/WindowsGSH.VEIN (WindowsGSH module README)
- C6 https://hub.docker.com/r/johnnyknighten/vein-server (third-party Docker image README)

## Files

- File: Game.ini. Location: `Vein/Saved/Config/LinuxServer/Game.ini` on Linux and `Vein/Saved/Config/WindowsServer/Game.ini` on Windows (C1, C2, C5). Format: INI with `[Section]` headers; `key=value`; a leading `+` on a key adds another array entry (C1, C3). Created by the server: yes, per C1: "Start the server once so it creates its files, then stop it and open ... Game.ini" (url C1). Edit only while the server is stopped; restart to apply (C2, C3, C4). Docker image location: `/vein-server/server/Vein/Saved/Config/LinuxServer` (C6).
- File: Engine.ini. Location: same folder as Game.ini (C1, C2, C3). Format: INI with `[ConsoleVariables]` header and `vein.* = value` lines (C1, C3, C4). Created by the server: NOT FOUND. C3 says "On a GSK server, Engine.ini is created by our installer" (GSK-specific, url C3).
- The panel (GameServerKings, C1 and C3) rewrites the lines it controls on every start: ServerName, Password, MaxPlayers, BindAddr, GameServerQueryPort (C3), and per C1 the name, password, player count, query port and bind address. C1 says: "If you edit them in the file, your change disappears on the next restart."
- WindowsGSH (C5) passes game port, query port, player limit, logging and save directory as launch arguments, and keeps "Game rules, server name, password, whitelist, and administrator lists" in `Vein/Saved/Config/WindowsServer/Game.ini`.

## Table 1: Game.ini

Key | type | default | allowed values | description (page's words) | url

| Key | type | default | allowed values | description (page's words) | url |
|---|---|---|---|---|---|
| [/Script/Vein.VeinGameSession] ServerDescription | NOT FOUND | NOT FOUND | NOT FOUND | "ServerDescription is shown when a player selects your server in the browser. Use it for rules and your Discord link." C3 example value: "PvE, no raiding. Discord: example". | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ |
| [/Script/Vein.VeinGameSession] SuperAdminSteamIDs | NOT FOUND | NOT FOUND (C2 example line is blank; C1 and C3 show example IDs) | SteamID64, "the 17-digit SteamID64" (C1) | "Super admins are admins who can also promote and demote other admins from inside the game." (C3). C1: "Put your own 17-digit SteamID64 there, or under SuperAdminSteamIDs if you want to promote other admins from inside the game." | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ ; https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ |
| [/Script/Vein.VeinGameSession] AdminSteamIDs | NOT FOUND | 1234 (C1: "The default file ships with AdminSteamIDs=1234"; C3: "the placeholder AdminSteamIDs=1234 line"). CONFLICT: C2's example block shows `AdminSteamIDs=` blank. | SteamID64 (C1, C3) | "Put your own 17-digit SteamID64 there" (C1). C2: "AdminSteamIDs= / SuperAdminSteamIDs= — the two admin tiers, keyed by SteamID64." | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ ; https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ |
| [/Script/Vein.VeinGameSession] +AdminSteamIDs (every entry after the first) | NOT FOUND | NOT FOUND | SteamID64 | C3: "Extra entries need a leading +. The first line is AdminSteamIDs=, and every line after it is +AdminSteamIDs=. ... Without the +, each line overwrites the one before it and only the last ID counts." C1: "Extra IDs go on new lines that start with +." CONFLICT: C2 says the syntax is disputed (repeat `AdminSteamIDs=` per admin, or use `+AdminSteamIDs=`). | https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ |
| [/Script/Vein.VeinGameStateBase] WhitelistedPlayers | NOT FOUND | NOT FOUND (C1: "Leave the section out to let anyone join.") | SteamID64 | "WhitelistedPlayers (VEIN 0.023 and later) locks the server to the listed SteamIDs." C3: "If it has any entries, only those players can join." | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ |
| [/Script/Vein.VeinGameStateBase] +WhitelistedPlayers (every entry after the first) | NOT FOUND | NOT FOUND | SteamID64 | C1 example: `WhitelistedPlayers=76561198000000001` then `+WhitelistedPlayers=76561198000000002`. Same page: "Extra IDs go on new lines that start with +." | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ |
| [/Script/Vein.ServerSettings] DiscordChatWebhookURL | NOT FOUND | NOT FOUND | a URL, written in quotes (C1 example `"https://discord.com/api/webhooks/..."`) | "DiscordChatWebhookURL forwards in-game global chat to a Discord channel. Create the webhook in Discord (channel settings > Integrations > Webhooks) and keep the URL in quotes." | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| [/Script/Vein.ServerSettings] DiscordChatAdminWebhookURL | NOT FOUND | NOT FOUND | a URL | "DiscordChatAdminWebhookURL, set in the same section, sends admin reports to a separate channel." | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| Section NOT FOUND: HTTPPort | NOT FOUND | NOT FOUND (C1 example: `HTTPPort=8080`) | a port number (NOT FOUND as a rule; example 8080) | "Adding HTTPPort=8080 to Game.ini makes the server answer GET /status, /players and /weather with JSON. It has no authentication, so don't expose that port to the internet." | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| [/Script/Vein.ServerSettings] GS_ShowScoreboardBadges | NOT FOUND | NOT FOUND (C3 example: `1`) | 1 or 0 | "GS_ShowScoreboardBadges shows (1) or hides (0) the admin badges on the scoreboard." | https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ |
| [/Script/Engine.GameSession] MaxPlayers (section per C2 only) | NOT FOUND | 16 for the panel-written value (C1 Startup "Max players 16"). C2's example shows `MaxPlayers=32` but does not give it as a default. | a number (NOT FOUND as a rule) | C2: "MaxPlayers= — set your player slots". C1: "Max players ... Player slots". C2: community-reported practical ceiling "around 32 players" (single source, unconfirmed). | https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| [/Script/Vein.VeinGameSession] ServerName (section per C2; C1 gives none) | NOT FOUND | "Vein Server" (C1 Startup default). C2 example value is `My VEIN Server` (example, not a default). | any text, up to 64 characters (C1 panel field) | C2: "ServerName= — the name shown in the browser." C1: "The name in VEIN's server browser. Up to 64 characters" | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ |
| [/Script/Vein.VeinGameSession] Password | NOT FOUND | blank (C2: "leave blank for an open server"; C1 Startup: "empty") | blank, or 4 to 32 letters, numbers, dashes and underscores (C1 panel field). Passwords are case-sensitive since January 2026 (C1). | C2: "Password= — leave blank for an open server; set a value to require it on connect. (This is the connect password, not an admin login.)" | https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| Section NOT FOUND: bPublic | NOT FOUND | NOT FOUND (C1 Startup "Public Server" default: True) | NOT FOUND | C2: "Additional networking keys reported by hosts include bPublic, BindAddr, Port, and GameServerQueryPort." C1: "Public Server ... Meant to control whether the server is listed in the server browser, but it may not take effect on the current VEIN build." | https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ |
| Section NOT FOUND: BindAddr | NOT FOUND | NOT FOUND | an IP address (NOT FOUND as a rule) | C1: the panel "writes the name, password, player count, query port and bind address into Game.ini." C3 lists BindAddr among keys the GSK egg rewrites. C2 lists it among "networking keys reported by hosts". | https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ ; https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ |
| Section NOT FOUND: Port | NOT FOUND | NOT FOUND | NOT FOUND | C2 lists "Port" among "Additional networking keys reported by hosts". Game port default 7777 is in C5 and C1 (not as a Game.ini default). | https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ |
| Section NOT FOUND: GameServerQueryPort | NOT FOUND | CONFLICT. C2: "GameServerQueryPort= (default 27015)" as reported by hosts. C1 Startup: "Query Port 27015, Read-only." C5: "Steam query 7778 UDP" and "The official current guide describes the query port as game port plus one." | a port number | C2: "Some hosts/community sources: report the Steam query port as 27015 via a config key GameServerQueryPort= (default 27015)." C1: panel sets it, "Read-only. We set it for you". | https://xgamingserver.com/blog/setting-up-a-dedicated-server-for-vein/ ; https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; https://github.com/WindowsGSH/WindowsGSH.VEIN |

Other Game.ini content on the pages (not keys with a single fixed name): a `[/Script/Vein.VeinGameSession]` section is shown in C1 and C2; a `[/Script/Vein.VeinGameStateBase]` section in C1 and C3; a `[/Script/Vein.ServerSettings]` section in C1 and C3. Source: C1 https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ ; C3 https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/

## Table 2: Engine.ini [ConsoleVariables]

Engine.ini uses the `[ConsoleVariables]` header (C1, C3, C4). Gameplay values are `vein.* = value`. Booleans appear as `1`/`0` in C3 and C4 but as `True` in the C6 example output; both are quoted below.

Key | type | default | allowed values | description (page's words) | url

| Key | type | default | allowed values | description (page's words) | url |
|---|---|---|---|---|---|
| vein.PvP | NOT FOUND | 1 | 0 = Off, 1 = On | "Enables PvP combat." (C3: "Players can damage other players") | https://client.citadelservers.com/knowledgebase/1002/Citadel-Servers---VEIN-Dedicated-Server-Configuration-Guide..html ; https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ |
| vein.BaseDamage | NOT FOUND | 1 | 0 = Off, 1 = On | "Enables base damage." | C4 |
| vein.Time.TimeMultiplier | NOT FOUND | 16 | 1–16 | "Controls world time speed (affects hunger/thirst indirectly)." C4 console list: "Speed of in-game time. Lower = slower hunger/thirst." CONFLICT with C6 example, which outputs `vein.TimeMultiplier=16` (no `Time.`). | C4 ; C3 (default 16, "How fast the game world runs") ; C6 https://hub.docker.com/r/johnnyknighten/vein-server |
| vein.Zombies.Health | NOT FOUND | 40 | 0.1–100 | "Zombie health." (C4 console list: "Zombie health points.") | C4 |
| vein.Zombies.SpeedMultiplier | NOT FOUND | 1 | 0.1–3 | "Zombie movement speed." | C4 |
| vein.Zombies.DamageMultiplier | NOT FOUND | 1 | 0.1–5 | "Zombie attack strength." (C4 console list: "Zombie attack damage multiplier.") | C4 |
| vein.Zombies.HearingMultiplier | NOT FOUND | 1 | 0.1–2 | "How far zombies hear noise." (C4 console list: "Hearing sensitivity multiplier.") | C4 |
| vein.Zombies.SightMultiplier | NOT FOUND | 1 | 0.1–2 | "How far zombies see." (C4 console list: "Sight sensitivity multiplier.") | C4 |
| vein.ZombieInfectionChance | NOT FOUND | 0.01 | 0–1 | "Chance of infection per hit." (C4 console list: "Chance to be infected by zombie hit."); C3: "Chance a zombie attack infects you" | C4 ; C3 |
| vein.AISpawner.Enabled | NOT FOUND | 1 | 0 = Off, 1 = On | "Enables AI/Zombie spawns." (C4 console list: "Enables AI spawning."; C3: "AI spawns at all") | C4 ; C3 |
| vein.AISpawner.HordeMode | NOT FOUND | 0 | 0 = Off, 1 = On | "Enables horde attacks." (C4 console list: "Enables horde mode.") | C4 |
| vein.ContainersRespawn.Enabled | NOT FOUND | 1 | 0 = Off, 1 = On | "Loot containers respawn." | C4 |
| vein.ContainersRespawn.Interval | NOT FOUND | 10800 | 600–43200 | "Loot respawn time in seconds." C3: "Seconds before empty containers refill" (default 10800) | C4 ; C3 |
| vein.Scarcity.Difficulty | NOT FOUND | 2 | 0–4 | "Loot availability." (C4 console list: "Loot difficulty (0=none, 4=impossible)."; C3: "Loot: 0 none, 1 more, 2 standard, 3 less, 4 impossible") | C4 ; C3 |
| vein.Calendar.WaterShutoffTimeDays | NOT FOUND | 30 | 1–999 | "Days before water stops." | C4 ; C3 (default 30, "Days until the water goes off") |
| vein.Calendar.ElectricalShutoffTimeDays | NOT FOUND | 46 | 1–999 | "Days before power stops." | C4 ; C3 (default 46, "Days until the power goes off") |
| vein.Stats.XPMultiplier | NOT FOUND | 1 | 0.1–10 | "XP gain rate." | C4 ; C3 ("XP gain multiplier") |
| vein.AI.AsyncSensing | NOT FOUND | 1 | NOT FOUND | "Compute AI sight asynchronously." | C4 |
| vein.AISpawner.EnableVirtualization | NOT FOUND | 1 | NOT FOUND | "Enables AI virtualization." | C4 |
| vein.AISpawner.FieldOfViewDot | NOT FOUND | 0 | -1 to 1 | "Player FOV dot product (-1 to 1)." | C4 |
| vein.AISpawner.Horde.Enabled | NOT FOUND | 1 | NOT FOUND | "Enables horde spawning." | C4 |
| vein.AISpawner.Hordes.ChancePerMinute | NOT FOUND | 0.05 | NOT FOUND | "Average hordes spawned per minute." | C4 |
| vein.AISpawner.Hordes.Duration | NOT FOUND | 120 | NOT FOUND | "Duration of each horde event (seconds)." | C4 |
| vein.AISpawner.Hordes.MaxDistance | NOT FOUND | 25000 | NOT FOUND | "Max distance before horde ends." | C4 |
| vein.AISpawner.Hordes.NoiseEffect | NOT FOUND | 0.1 | NOT FOUND | "Higher = more hordes from noise." | C4 |
| vein.AISpawner.Hordes.ScentEffect | NOT FOUND | 0.5 | NOT FOUND | "Higher = more hordes from scent." | C4 |
| vein.AISpawner.SpawnCapMultiplier | NOT FOUND | 1 | NOT FOUND | "Global AI spawn cap multiplier." | C4 |
| vein.AISpawner.SpawnCapMultiplierZombie | NOT FOUND | 1 | NOT FOUND | "Zombie-specific spawn cap multiplier." (C3: "Zombie spawn cap multiplier", default 1) | C4 ; C3 |
| vein.AISpawner.ZombieCrawlerPercentage | NOT FOUND | 0.1 | NOT FOUND | "Fraction of zombies that are crawlers." | C4 |
| vein.AISpawner.ZombieLayerPercentage | NOT FOUND | 0.1 | NOT FOUND | "Fraction of zombies that start asleep." | C4 |
| vein.AISpawner.ZombieWalkerPercentage | NOT FOUND | 0.7 | NOT FOUND | "Fraction of zombies that walk." | C4 |
| vein.AlwaysBecomeZombie | NOT FOUND | 0 | NOT FOUND | "Players always turn into zombies on death." | C4 |
| vein.Zombies.CanClimb | NOT FOUND | 1 | NOT FOUND | "Zombies can climb obstacles." | C4 |
| vein.Zombies.HeadshotOnly | NOT FOUND | 0 | NOT FOUND | "Zombies only take headshot damage." | C4 |
| vein.Zombies.NavWalk | NOT FOUND | 1 | NOT FOUND | "Zombies use nav walking." | C4 |
| vein.Zombies.LayingDownDistance | NOT FOUND | 500 | NOT FOUND | "Distance before zombies wake." | C4 |
| vein.ZombieBuckets.GridSize | NOT FOUND | 20000 | NOT FOUND | "Grid size for zombie spawns." | C4 |
| vein.ZombieBuckets.MaxCount | NOT FOUND | 300 | NOT FOUND | "Max zombie bucket count." | C4 |
| vein.ZombieBuckets.RespawnTime | NOT FOUND | 300 | NOT FOUND | "Time for zombies to respawn (seconds)." | C4 |
| vein.Time.NightTimeMultiplier | NOT FOUND | 3 | NOT FOUND | "Multiplier for night time speed." | C4 |
| vein.Time.NightTimeMultiplierStart | NOT FOUND | 20 | NOT FOUND | "Hour night speed starts." | C4 |
| vein.Time.NightTimeMultiplierEnd | NOT FOUND | 6 | NOT FOUND | "Hour night speed ends." | C4 |
| vein.Time.ContinueWithNoPlayers | NOT FOUND | 0 | NOT FOUND | "Time continues when no players online." (C3: "Keep the clock running on an empty server") | C4 ; C3 |
| vein.Time.StartOffsetDays | NOT FOUND | 0 | NOT FOUND | "Day offset for new world." | C4 |
| vein.BuildObjectDecay | NOT FOUND | 1 | NOT FOUND | "Bases decay over time." | C4 |
| vein.BuildObjectPvP | NOT FOUND | 1 | 0 = Off, 1 = On | "Players can damage bases." (C3: "Players can damage other players' bases") | C4 ; C3 |
| vein.Autosave.Interval | NOT FOUND | 300 | NOT FOUND | C3: "vein.Autosave.Interval (default 300 s)"; C3 table: "Seconds between autosaves" | https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ |
| vein.Permadeath | NOT FOUND | 0 | NOT FOUND | "Players can't respawn" (C3) | https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ |
| vein.Activity.AFKKickTimeSeconds | NOT FOUND | NOT FOUND | NOT FOUND | C3 names it only: "Ramjet added vein.Activity.AFKKickTimeSeconds for servers in 0.022 Hotfix 5, and more since then." No description or default on the page. | https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/ |

Notes on Table 2:
- C3 example lines, not defaults: `vein.PvP=0`, `vein.Time.TimeMultiplier=8`, `vein.AISpawner.SpawnCapMultiplierZombie=1.5` (url https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/).
- C6 example output: `vein.PvP=True`, `vein.AISpawner.Enabled=True`, `vein.TimeMultiplier=16` (url https://hub.docker.com/r/johnnyknighten/vein-server).
- C4 says its console variable list is "incomplete and only up to date with the writing of this article" (url https://client.citadelservers.com/knowledgebase/1002/Citadel-Servers---VEIN-Dedicated-Server-Configuration-Guide..html). C3 says the same list is dated October 2025 and "isn't complete".
- C3 and C4 both state that Unreal removes lines that restate a default (C3: "Default-value lines disappear", url https://www.gameserverkings.com/knowledge-base/vein/vein-console-commands/). C1 says the same for Game.ini.
- C4: "Tip: you can print a more up-to-date version to the log by entering PrintAllVeinSettings in a singleplayer game." (C4 url)

## Table 3: Container environment variables (johnnyknighten/vein-server Docker image; these are not VEIN files)

Key | type | default | allowed values | description (page's words) | url

| Key | type | default | allowed values | description (page's words) | url |
|---|---|---|---|---|---|
| TZ | NOT FOUND | (system default) | NOT FOUND | "Sets the timezone of the container." | https://hub.docker.com/r/johnnyknighten/vein-server |
| MANUAL_CONFIG | NOT FOUND | False | NOT FOUND | "If set to True then the container will not generate any config files." | https://hub.docker.com/r/johnnyknighten/vein-server |
| SCHEDULED_RESTART | NOT FOUND | False | NOT FOUND | "Enable scheduled restarts of the server." | https://hub.docker.com/r/johnnyknighten/vein-server |
| BACKUP_ON_SCHEDULED_RESTART | NOT FOUND | False | NOT FOUND | "Determines if the server should backup itself before restarting." | https://hub.docker.com/r/johnnyknighten/vein-server |
| RESTART_CRON | NOT FOUND | 0 4 * * * | NOT FOUND | "Cron expression for scheduled restarts. Default is everyday at 4am." | https://hub.docker.com/r/johnnyknighten/vein-server |
| SCHEDULED_UPDATE | NOT FOUND | False | NOT FOUND | "Enable scheduled updates of the server." | https://hub.docker.com/r/johnnyknighten/vein-server |
| UPDATE_CRON | NOT FOUND | 0 3 * * * | NOT FOUND | "Cron expression for scheduled updates. Default is daily at 3am." | https://hub.docker.com/r/johnnyknighten/vein-server |
| BACKUP_BEFORE_UPDATE | NOT FOUND | True | NOT FOUND | "Determines if the server should backup itself before updating." | https://hub.docker.com/r/johnnyknighten/vein-server |
| UPDATE_ON_BOOT | NOT FOUND | True | NOT FOUND | "Determines if the server should update itself when it starts." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VALIDATE_SERVER_FILES | NOT FOUND | True | NOT FOUND | "Validate server files with SteamCMD during updates. Set to False to skip validation for faster updates." | https://hub.docker.com/r/johnnyknighten/vein-server |
| EXPERIMENTAL_BUILD | NOT FOUND | False | NOT FOUND | "If set to True, downloads the experimental beta build instead of the stable release." | https://hub.docker.com/r/johnnyknighten/vein-server |
| SCHEDULED_BACKUP | NOT FOUND | False | NOT FOUND | "Enable scheduled backups of the server." | https://hub.docker.com/r/johnnyknighten/vein-server |
| BACKUP_CRON | NOT FOUND | 0 6 * * * | NOT FOUND | "Cron expression for scheduled backups. Default is every day at 6am." | https://hub.docker.com/r/johnnyknighten/vein-server |
| BACKUP_ON_STOP | NOT FOUND | True | NOT FOUND | "Determines if the server should backup itself when the container stops." | https://hub.docker.com/r/johnnyknighten/vein-server |
| ZIP_BACKUPS | NOT FOUND | False | NOT FOUND | "If this is set to True then it will zip your backups instead of the default tar and gzip." | https://hub.docker.com/r/johnnyknighten/vein-server |
| RETAIN_BACKUPS | NOT FOUND | EMPTY | NOT FOUND | "Number of backups to keep. If not set, then an unlimited number of backs will be kept." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VEIN_SERVER_NAME | NOT FOUND | Vein Server | NOT FOUND | "Name of the server that appears in the server list." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VEIN_SERVER_DESCRIPTION | NOT FOUND | A Vein dedicated server | NOT FOUND | "Description of the server." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VEIN_SERVER_PASSWORD | NOT FOUND | EMPTY | NOT FOUND | "Password to login to the server. Defaults to no password aka a public server." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VEIN_SERVER_PUBLIC | NOT FOUND | True | NOT FOUND | "Show server in the public server browser." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VEIN_SERVER_PORT | NOT FOUND | 7777 | NOT FOUND | "Primary game port." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VEIN_SERVER_QUERY_PORT | NOT FOUND | 27015 | NOT FOUND | "Steam query port." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VEIN_SERVER_MAX_PLAYERS | NOT FOUND | 16 | NOT FOUND | "Maximum number of players allowed on the server." | https://hub.docker.com/r/johnnyknighten/vein-server |
| VEIN_VAC_ENABLED | NOT FOUND | 0 | 0=disabled, 1=enabled | "Enable Steam VAC anti-cheat (0=disabled, 1=enabled)." | https://hub.docker.com/r/johnnyknighten/vein-server |

Container config rules (C6, url https://hub.docker.com/r/johnnyknighten/vein-server): `CONFIG_FILE_<filename>_SECTION_<section>_VAR_<variable>=<value>`; SLASH = `/`, DOT = `.`. Example: `CONFIG_FILE_Engine_SECTION_ConsoleVariables_VAR_vein_DOT_PvP: "True"` writes `vein.PvP=True` to Engine.ini. "Environment variables always win" and "Removed environment variables persist" (C6).

## NOT FOUND / UNSURE

- Type column: NOT FOUND for every key, because no page gives a type.
- Game.ini defaults NOT FOUND: ServerDescription, SuperAdminSteamIDs, WhitelistedPlayers, DiscordChatWebhookURL, DiscordChatAdminWebhookURL, HTTPPort, GS_ShowScoreboardBadges, MaxPlayers (only the panel value 16), bPublic, BindAddr, Port.
- Section NOT FOUND: HTTPPort, bPublic, BindAddr, Port, GameServerQueryPort (C2 does not name a section for them), MaxPlayers (C2 names [/Script/Engine.GameSession], C1 and C3 do not).
- Engine.ini: the game's own creation of Engine.ini is NOT FOUND (C3 says the GSK installer creates it).
- Allowed values NOT FOUND for most vein.* cvars without a C4 range.
- vein.Activity.AFKKickTimeSeconds: no default, no description (C3 names it only).
- CONFLICTS (both values written above, no pick made):
  - GameServerQueryPort default: 27015 (C2 hosts; C1 panel; C6 env) vs 7778 (C5 "Steam query 7778"; C2 says the official wiki says 7778).
  - AdminSteamIDs default in a shipped file: 1234 (C1, C3) vs blank (C2 example).
  - Multiple admins: repeated `AdminSteamIDs=` (C2 one source) vs `+AdminSteamIDs=` after the first line (C2 other source, C3, C1).
  - Time multiplier name: `vein.Time.TimeMultiplier` (C3, C4) vs `vein.TimeMultiplier` (C6 example output).
  - Boolean format: `1`/`0` (C3, C4) vs `True` (C6 output).
  - ServerName example: `My VEIN Server` (C2 example) vs `Vein Server` (C1 panel default, C6 env default).
- Panel defaults (C1 Startup tab, not file defaults): Public Server True, Auto update on, Max players 16, Server Name "Vein Server", Query Port 27015 (read-only).
- C4 page is about 153k characters; the saved copy holds the article body, which was checked with a search for the config terms. The tag cloud and navigation were not read in full.
- The Ramjet Notion page (browser read) has no config keys, so no Ramjet-sourced row is in this file.

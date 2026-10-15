# Barotrauma - 02 config files and every setting (researched 2026-10-15)

Facts are for Barotrauma dedicated server, Steam tool app 1026340 (store app 602960). The official wiki says the current game version is 1.13.4.0 (wiki page header, fetched 2026-10-15). The game source facts below come from the public repo `FakeFishGames/Barotrauma`, branch `master`, newest commit `e6e95da` dated 2026-09-02. UNVERIFIED: that master equals the shipped 1.13.4.0 build exactly (wiki sample default file differs from master in a few defaults, noted per row).

## Source legend (every row cites one or more)
- [S] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Networking/ServerSettings.cs  (the `[Serialize(default)]` list = exact key spelling, type, default)
- [SS] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaServer/ServerSource/Networking/ServerSettings.cs  (SaveSettings / LoadSettings / clientpermissions code = the XML shape)
- [GM] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaServer/ServerSource/GameMain.cs  (StartServer: which attributes are read first, command-line flags)
- [CS] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/GameSession/GameModes/CampaignSettings.cs
- [E] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Enums.cs  (enum value lists)
- [GS] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Settings/GameSettings.cs  (LosMode, EnemyHealthBarMode enums; config_player.xml writer)
- [NC] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Networking/NetConfig.cs  (ports 27015/27016, MaxPlayers 16, name/message length)
- [TE] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Traitors/TraitorEventPrefab.cs  (danger level 1 to 3)
- [W] https://barotraumagame.com/baro-wiki/index.php?title=Serversettings.xml&action=raw  (official wiki, marked "stub, missing many attributes, has legacy attributes". Descriptions come from here where [S] has none. The plain page https://barotraumagame.com/wiki/Serversettings.xml returns HTTP 403 to scripts; the index.php form works.)
- [WC] https://barotraumagame.com/baro-wiki/index.php?title=Clientpermissions%2Exml&action=raw
- [WH] https://barotraumagame.com/baro-wiki/index.php?title=Hosting_a_Dedicated_Server
- [WM] https://barotraumagame.com/baro-wiki/index.php?title=Enabling_Mods_on_a_Dedicated_Server
- [WK] https://barotraumagame.com/baro-wiki/index.php?title=Karma
- [K] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/Data/karmasettings.xml  and  .../SharedSource/Networking/KarmaManager.cs
- [P] https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/Data/permissionpresets.xml  and  .../SharedSource/Networking/ClientPermissions.cs
- [WCfg] https://barotraumagame.com/baro-wiki/index.php?title=List_of_Config_Files

## 1. The XML shape (important: the panel's `<property name= value=>` parser does NOT fit)

### 1.1 serversettings.xml  [SS: SaveSettings/LoadSettings]
- Location: the server's install root, next to `DedicatedServer.exe` (wiki: "Barotrauma root directory (same place as Barotrauma.exe)"; for the SteamCMD dedicated-server app it is the install folder, e.g. `steamapps/common/Barotrauma Dedicated Server` [WH]).
- Format: ONE root element `<serversettings ...>` where every setting is an XML ATTRIBUTE on that root. There are no `<property>` children. The only child element is one `<campaignsettings .../>`, which again carries its settings as attributes. Example of the real shape (from [W] "Default" section, trimmed):

```xml
<?xml version="1.0" encoding="utf-8"?>
<serversettings
  name="Server"
  port="27015"
  queryport="27016"
  password=""
  enableupnp="false"
  ServerMessage=""
  IsPublic="False"
  MaxPlayers="10"
  ... many more attributes ...
  KarmaEnabled="False"
  KarmaPreset="default"
  GameModeIdentifier="sandbox"
  DisabledMonsters="">
  <campaignsettings
    PresetName="Normal"
    RadiationEnabled="False"
    ... />
</serversettings>
```
- The game writes it with indentation and one attribute per line (`NewLineOnAttributes = true`) [SS]. Simple attribute-regex editing works but a real XML library is safer.
- Attribute NAME matching on read is case-insensitive (`XElement.GetAttribute` uses OrdinalIgnoreCase, XMLExtensions.cs line 1115: https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Serialization/XMLExtensions.cs). The game WRITES: lowercase `port`, `queryport`, `password`, `enableupnp`, `autorestart`; PascalCase for `HiddenSubs`, `AllowedRandomMissionTypes`, `AllowedClientNameChars`, `DisabledMonsters` and all serialized properties (`ServerName`, `MaxPlayers`, ...) [SS].
- Value formats: bools are written `True`/`False` (C# ToString) for property attributes and `true`/`false` for `enableupnp`/`autorestart` (written from a bool through XAttribute); reading accepts either case (UNVERIFIED for exotic spellings; the game's own writer uses these). Floats are written in invariant culture ("G" format, dot decimal, e.g. `0.6`) [SerializableProperty.cs line ~983]. Enums are written as the enum name (e.g. `MidRound`). Lists are comma separated (`HiddenSubs`, `AllowedRandomMissionTypes`, `DisabledMonsters`, `AllowedClientNameChars`); perk lists (`SelectedCoalitionPerks`, `SelectedSeparatistsPerks`) are semicolon separated [SerializableProperty.cs "identifierarray" join ';'].
- When is it created/rewritten: the file is created on first start (the GameServer constructor calls `SaveSettings()` straight away, GameServer.cs line 190: https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaServer/ServerSource/Networking/GameServer.cs), rewritten whenever an admin changes a setting in-game, and rewritten again on shutdown (`Quit()`, same file ~line 4775). Consequence for the panel: edit it only while the server is stopped, or the shutdown rewrite will overwrite your edit [also stated by a hosting guide: https://xgamingserver.com/docs/barotrauma/configure-your-server]. The game also rewrites it in canonical form, so attributes the game does not know are DROPPED on the next save (it rebuilds from its own property list).
- If the file is missing, the server logs a warning and "Starting the server with default settings" [GM].
- Startup precedence [GM `StartServer`]: values are first read from the file's attributes `ServerName` (falls back to legacy `name`), `Port`, `QueryPort`, `IsPublic`, `EnableUPnP`, `MaxPlayers`, `password`, then OVERRIDDEN by command-line flags. Code defaults used when the attribute is absent: name "Server", port 27015, queryPort 27016, IsPublic false, EnableUPnP false, MaxPlayers 10, password empty. So the effective defaults of `IsPublic` (false) and `MaxPlayers` (10) differ from the `[Serialize]` defaults (true / 8) listed in [S]; the wiki's sample new-install file also shows IsPublic="False", MaxPlayers="10".
- The attribute keys the panel must write for the basic fields: `ServerName` (or legacy `name`), `port`, `queryport`, `password`, `IsPublic`, `MaxPlayers`, `enableupnp`. Note: `Port` is read via `nameof(ServerSettings.Port)` = "Port" and the writer emits "port"; because matching is case-insensitive both work.

### 1.2 clientpermissions.xml  [SS LoadClientPermissions/SaveClientPermissions, WC]
- Location: `Data/clientpermissions.xml` relative to the install root (code constant `"Data" + separator + "clientpermissions.xml"`).
- Shape: root `<ClientPermissions>` with one `<Client .../>` child per person; attributes on `Client`: `name` (required, player name), `accountid` (SteamID, e.g. `STEAM_1:1:12345678`; legacy `steamid` accepted) OR `address`/`endpoint`/`ip` (network address; one of accountid or address is required), then EITHER `permissions="..."` (comma separated permission names, or `All`) OR `preset="Moderator"` (display name of a preset). If the permissions include `ConsoleCommands`, child elements `<command name="heal" />` list the allowed console commands.
```xml
<?xml version="1.0" encoding="utf-8" ?>
<ClientPermissions>
  <Client name="John" accountid="STEAM_1:1:12345678" permissions="ServerLog, ConsoleCommands">
    <command name="heal" />
  </Client>
</ClientPermissions>
```
- A fresh install contains just the empty root `<ClientPermissions></ClientPermissions>` [WC]. Invalid entries are logged as errors (wiki: a badly formatted file is deleted and recreated by the server). If a `preset` name is not found the loader RETURNS (stops loading the remaining entries) [SS].
- Permission names (flags enum `ClientPermissions`) [P ClientPermissions.cs]: None, ManageRound, Kick, Ban, Unban, SelectSub, SelectMode, ManageCampaign, ConsoleCommands, ServerLog, ManageSettings, ManagePermissions, KarmaImmunity, ManageMoney, SellInventoryItems, SellSubItems, ManageMap, ManageHires, ManageBotTalents, SpamImmunity, All.
- Presets (display name) in `Data/permissionpresets.xml`: None, Moderator, Admin [P permissionpresets.xml]; custom presets go in `Data/permissionpresets_player.xml` ([P] header comment: the default file "may get overwritten when game updates are released").
- Easiest admin route without editing XML: in-game console commands `giveperm`, `givecommandperm`, `revokeperm`, `revokecommandperm`, `giverank` [WC, WH].

### 1.3 config_player.xml  [GS SaveCurrentConfig, WM]
- Location: install root (`PlayerConfigPath = "config_player.xml"`).
- Shape: root `<config ...attributes...>` with child elements `<graphicssettings>`, `<audio>`, `<contentpackages>` and (client only) many more. Settings are attributes on those elements. For a dedicated server the only part that matters is `<contentpackages>`, which is how MODS are enabled:
```xml
<contentpackages>
  <!-- Vanilla -->
  <corepackage path="Content/ContentPackages/Vanilla.xml" />
  <regularpackages>
    <!-- Mod name -->
    <package path="LocalMods/SomeMod/filelist.xml" />
  </regularpackages>
</contentpackages>
```
  (element names `corepackage`, `regularpackages`, `package`, attribute `path`; constants in ContentManagement/ContentPackageManager.cs lines 20-24: https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/ContentManagement/ContentPackageManager.cs). The `<!-- -->` comments are just the mod names the game writes.
- The server language default is English (GameSettings.Config.GetDefault, `#if SERVER`), taken from the `Language` attribute on the `<config>` root. UNVERIFIED exact attribute spelling on the root; the server-side `Language` for the lobby is the `Language` attribute of serversettings.xml (see table).
- Mod procedure (official wiki, version-flagged "0.18.12.0, potentially outdated") [WM]: subscribe on a PC, copy the Workshop mod folders from `%LocalAppData%/Daedalic Entertainment GmbH/Barotrauma/WorkshopMods/Installed` to the same place on the server, then list them in the `<contentpackages>` section of the server's `config_player.xml`. Not researched further here (mods are a separate step): UNVERIFIED whether the 1.13 server auto-downloads Workshop mods by itself.

### 1.4 Other files in the install  [WCfg]
- `Data/bannedplayers.txt` (ban list, plain text), `Data/karmasettings.xml` (karma presets, section 4), `Data/permissionpresets.xml` (shipped), `Data/permissionpresets_player.xml` (custom presets), `serversettings.xml`, `config_player.xml`, `Data/clientpermissions.xml`, `ServerLogs/` folder (logs saved on shutdown when `SaveServerLogs`). Saves live under the user profile (`%LocalAppData%/Daedalic Entertainment GmbH/Barotrauma/Multiplayer`; `SaveUtil.CreateSavePath(SaveType.Multiplayer...)` in GameServer.cs). Exact multiplayer-save folder name UNVERIFIED.

### 1.5 Command-line flags of `DedicatedServer.exe`  [GM StartServer; all read from source]
Space-separated value form (`-flag value`), flag matching is case-insensitive:
`-name <text>`, `-port <int>`, `-queryport <int>`, `-public <true|false>`, `-password <text>`, `-nopassword` (bool flag, clears password), `-upnp <true|false>` and alias `-enableupnp <true|false>`, `-maxplayers <int>`, `-playstyle <Serious|Casual|Roleplay|Rampage|SomethingDifferent>`, `-banafterwrongpassword <true|false>`, `-karma <true|false>` (alias `-karmaenabled`), `-karmapreset <name>`, `-language <name>` (must be one of the language options: Brazilian Portuguese, Chinese, Czech, Danish, Dutch, English, Finnish, French, German, Italian, Japanese, Korean, Norwegian, Polish, European Portuguese, Russian, Spanish, Swedish, Turkish, Ukrainian; source: .../BarotraumaShared/Data/languageoptions.xml), `-lenienthandshake` (bool flag). Internal/other: `-ownerkey`, `-endpoint`, `-pipes` (used when the game launches a hosted child server; not for panels). Note: `-banafterwrongpassword` in the source does not advance the argument index (a bug-like quirk), so put it last or avoid it. Ports are UDP 27015 and 27016 by default [NC, WH].

## 2. serversettings.xml attributes (all on the root `<serversettings>`)

"Default" = the value used by the game when the attribute is absent (the `[Serialize]` default in [S]) unless the note says otherwise. Types: bool = True/False, int, float (dot decimal), string, enum (exact name). Group names are suggestions for the panel UI.

### 2.1 Basic and network
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| ServerName (legacy `name`) | Server name | The name shown in the server browser and lobby. Limited to 60 characters; an empty name is ignored. | Basics | Server | string | text, max 60 chars | [S][NC][GM][W] |
| ServerMessageText (legacy `ServerMessage`) | Welcome message | Description shown on the server list and sent to players in chat when they join (message of the day). Max 2000 characters. | Basics | empty | string | text, max 2000 chars | [S][NC][SS][W] |
| password | Join password | Password players must enter to join. Empty means no password. Stored as plain text in the file. | Basics | empty | string | any text | [SS][GM][W] |
| MaxPlayers | Max players | Largest number of players that can be connected at once. | Basics | 10 effective (code default 8 in [S]; startup default 10 in [GM]) | int | 1 to 16 (clamped) | [S][NC][GM][W] |
| IsPublic | List in server browser | Show the server in the public Steam server browser. People who know the address can still join a non-listed server unless it has a password. | Basics | False effective (startup default; [S] attribute default True) | bool | True / False | [S][GM][W] |
| port | Game port | UDP port players connect to. Must be forwarded on your router for outside players. | Network | 27015 | int | valid port | [SS][NC][W][WH] |
| queryport | Query port | UDP port used by Steam to list and query the server. Must be forwarded too. Not written to the file when it is 0. | Network | 27016 | int | valid port | [SS][NC][W][WH] |
| enableupnp | Automatic port forwarding (UPnP) | Ask the router to open the ports automatically. Many routers do not support it; manual forwarding is more reliable. | Network | false | bool | true / false | [SS][W] |
| RequireAuthentication | Require Steam/EOS login | Players must prove their Steam or Epic ownership identity. Only turn off for a private LAN game with no internet. | Network | True | bool | True / False | [S][W] |
| TickRate | Network tick rate | How many times per second the server sends updates. Higher uses more bandwidth and CPU; the wiki advises against going above the default, and lowering it may break mods. | Network | 20 | int | 1 to 60 (clamped) | [S][W] |
| MaxLagCompensation | Lag compensation (ms) | Maximum time in milliseconds the server rewinds to check whether a shot hit, to be fair to laggy players. | Network | 150 | int | 0 to 500 (clamped) | [S] (wording from source description) |
| EnableDoSProtection | Flood protection | Kick players who send more network packets than the limit below (protects against spam attacks). | Network | True | bool | True / False | [S][W] |
| MaxPacketAmount | Packet limit | How many packets one player may send before being treated as flooding the server. Raise it if heavily modded games cause kicks. | Network | 4000 | int | recommended 1200 to 10000 (source constants min 1200, warning 3500, max 10000) | [S][W] |
| TimeoutThresholdNotInGame | Timeout in lobby (s) | Seconds without a reply before a player is disconnected while in the lobby or a loading screen. | Network | 60 | float | seconds | [S] |
| TimeoutThresholdInGame | Timeout in round (s) | Seconds without a reply before a player is disconnected while a round is running. | Network | 10 | float | seconds | [S] |
| Language | Server language | Language the server uses for its own messages and shows in the browser. | Basics | English (server picks English if unset) | LanguageIdentifier string | Brazilian Portuguese, Chinese, Czech, Danish, Dutch, English, Finnish, French, German, Italian, Japanese, Korean, Norwegian, Polish, European Portuguese, Russian, Spanish, Swedish, Turkish, Ukrainian | [S][SS][W] languageoptions.xml (URL in 1.5) |
| PlayStyle | Play style tag | A label shown in the server browser so people know what kind of game to expect; it does not change rules. | Basics | Casual | enum | Serious, Casual, Roleplay, Rampage, SomethingDifferent | [S][E][W] |
| VoiceChatEnabled | Voice chat | Allow in-game voice chat. | Basics | True | bool | True / False | [S][W] |
| AllowedClientNameChars | Allowed name characters | Which character code ranges (UTF-16) players may use in their names. Written as `start-end` ranges separated by commas. Leave as is unless you want to restrict names. | Safety | 32-33,38-46,48-57,65-90,91,93,95-122,192-255,384-591,1024-1279,4352-4607,44032-55215,19968-21327,21329-40959,13312-19903,131072-173791,173824-178207,178208-183983,63744-64255,194560-195103 (code default list; [W] sample shows `91-91,93-93`) | string list | `a-b` ranges, comma separated | [SS][W] |

### 2.2 Round flow and game mode
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| GameModeIdentifier | Game mode | The game mode the lobby starts with. | Game | sandbox | string | sandbox, mission, campaign, pvp (wiki list; current exact identifiers UNVERIFIED in source, GameModePreset.cs not parsed) | [S][W] |
| MissionTypes | Allowed mission types | Which mission types may be picked when the mission game mode chooses randomly; several are allowed, the server picks one. `All` allows everything. | Game | All (in memory; written out as the full list) | string list | wiki list: AbandonedOutpost, Beacon, Cargo, ClearAlienRuins, EliminateTargets, Escort, KingOfTheHull, Mineral, Monster, Nest, OutpostCombat, OutpostDestroy, Pirate, SalvageCave, SalvageRuin, SalvageWreck, ScanAlienRuins, SubVsSubCombat, jailbreak (may be incomplete for 1.13) | [S][SS][W] |
| AllowedRandomMissionTypes | (deprecated mirror of MissionTypes) | Older name for the same list, still written by the game. Wiki says deprecated; edit MissionTypes instead. | Game | full list | string list | as MissionTypes | [SS][W] |
| SelectedSubmarine | Submarine | Name of the submarine used for the round. Empty = first alphabetically. Rewritten on shutdown to the last used one. | Game | empty | string | a submarine name | [S][W][GameServer.cs Quit] |
| SelectedShuttle | Respawn shuttle | Name of the shuttle used for respawns. | Game | empty | string | a shuttle name | [S][W] |
| HiddenSubs | Hidden submarines | Comma separated submarine names that are not offered in the lobby. | Game | empty | string list | submarine names | [SS][W] |
| SubSelectionMode | How the submarine is chosen | Who decides which submarine is used next. | Game | Manual | enum | Manual (only players with the SelectSub permission), Random (random at round start), Vote (all players vote) | [S][E][W] |
| ModeSelectionMode | How the game mode is chosen | Who decides the next game mode. | Game | Manual | enum | Manual (SelectMode permission), Random, Vote | [S][E][W] |
| RandomizeSeed | New level seed each round | Generate a new random level every round. If off, the same seed set in the lobby is reused. | Game | True | bool | True / False | [S][W] |
| Biome | Preferred biome | Which biome the level comes from. Does not apply to the campaign. | Game | Random | string | Random, coldcaverns, europanridge, theaphoticplateau, thegreatsea, hydrothermalwastes (wiki list; 1.13 may add more) | [S][W] |
| SelectedLevelDifficulty | Level difficulty | How hard the level is, 0 to 100. Not used in the campaign, which follows its own difficulty curve. | Game | 0 | float (wiki says int) | 0 to 100 (clamped) | [S][W] |
| AutoRestart | Auto-start rounds | Automatically start a round after the interval below when the lobby is waiting. | Round | false | bool | true / false | [S][SS][W] |
| AutoRestartInterval | Auto-start delay (s) | Seconds before a round starts automatically. Only used when AutoRestart is on. | Round | 60 | float | seconds > 0 | [S][W] |
| StartWhenClientsReady | Start when players are ready | Start the round automatically once enough players press ready. | Round | False | bool | True / False | [S][W] |
| StartWhenClientsReadyRatio | Ready fraction needed | Fraction of players that must be ready for the automatic start. 0.8 means 80 percent. | Round | 0.8 | float | 0.0 to 1.0 | [S][W] |
| AllowSpectating | Allow spectating | Dead players may watch. If off, dead players are sent back to the lobby. | Round | True | bool | True / False | [S][W] |
| EndRoundAtLevelEnd | (legacy) | Listed by the wiki as likely legacy; not present in the current [S] property list. Do not expose. | Round | n/a | bool | n/a | [W] only; see "found but not explainable" |

### 2.3 Respawn, death, bots
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| RespawnMode | Respawn mode | What happens when a player dies. | Respawn | MidRound | enum | None (no respawn), MidRound (respawn during a round, by shuttle if enabled), BetweenRounds (only at the start of the next round), Permadeath (characters die for good; the wiki lists only MidRound/BetweenRounds/Permadeath, source enum also has None) | [S][E][W] |
| UseRespawnShuttle | Use respawn shuttle | Respawning players arrive in a shuttle that must dock; off = they appear inside the submarine. Only matters when respawning is allowed. | Respawn | True | bool | True / False | [S][W] |
| RespawnInterval | Respawn wave interval (s) | Seconds between respawn waves. UNVERIFIED which value the shipped build writes: source default 30, wiki table and wiki sample file say 300. | Respawn | 30 (source) / 300 (wiki) | float | seconds >= 0 | [S][W] |
| MaxTransportTime | Shuttle time limit (s) | How long the respawn shuttle has to dock before it returns to the outpost. | Respawn | 180 | float | seconds | [S][W] |
| MinRespawnRatio | Dead fraction to start respawn timer | Fraction of players who must be dead before the respawn countdown starts. | Respawn | 0.2 | float | 0.0 to 1.0 | [S][W] |
| SkillLossPercentageOnDeath | Skill loss on death (%) | How far skills fall back toward the job's starting levels when a character dies. | Respawn | 20 | float | 0 to 100 | [S][W] |
| SkillLossPercentageOnImmediateRespawn | Extra skill loss on instant respawn (%) | Additional skill loss when a player respawns mid-round. | Respawn | 10 | float | 0 to 100 | [S][W] |
| ReplaceCostPercentage | Replacement character cost (%) | Permadeath only: price modifier for hiring a new character to replace a dead one. 0 makes them free. | Permadeath | 100 | float | 0 to 100 | [S][W] |
| AllowBotTakeoverOnPermadeath | Allow taking over bots | Permadeath only: dead players can take over an existing bot instead of buying a new character. | Permadeath | True | bool | True / False | [S][W] |
| IronmanMode | Ironman mode | Permadeath only: a player whose character dies can only spectate for the rest of the game. Does nothing unless RespawnMode is Permadeath. | Permadeath | False | bool | True / False | [S][W] |
| DespawnDisconnectedPermadeathTime | Remove disconnected body, permadeath (s) | Permadeath only: seconds a disconnected player's helpless character stays before being removed. | Permadeath | 10 | float | seconds | [S][W] |
| KillDisconnectedTime | Kill disconnected character after (s) | Seconds a disconnected player's character stays in the world before it is removed. | Round | 300 | float | seconds | [S] (wiki table says 120, wiki sample 300) |
| KickAFKTime | Kick idle players after (s) | Seconds a player may be inactive before being kicked, if AllowAFK is on. | Round | 600 | float | seconds | [S][W] (wiki table says 120, sample 600) |
| AllowAFK | Allow marking AFK | When on, a player who has marked themselves AFK is not counted toward the idle-kick timer (read from GameServer.cs lines ~660-666, https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaServer/ServerSource/Networking/GameServer.cs); not documented on the wiki. | Round | True | bool | True / False | [S][GameServer.cs] |
| BotCount | Number of bots | Number of AI crew members to add each round. | Bots | 0 | int | 0 and up (max set by MaxBotCount) | [S][W] |
| MaxBotCount | Max bots | Upper limit for the bot count. | Bots | 16 | int | 0 to 16 | [S][W] |
| BotSpawnMode | Bot fill mode | How bots are added. | Bots | Normal | enum | Normal (add BotCount bots), Fill (fill every empty player slot with bots) | [S][E][W] |
| DisableBotConversations | Silence bot chatter | Stops bots from filling the chat with flavour dialogue. Calls for help still work. | Bots | False | bool | True / False | [S][W] |

### 2.4 Rules (what players are allowed to do)
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| AllowFriendlyFire | Friendly fire | Players can damage each other. | Rules | True | bool | True / False | [S][W] |
| AllowDisguises | Disguises | Players can disguise themselves with another player's ID card. | Rules | True | bool | True / False | [S][W] |
| AllowRewiring | Rewiring | Players can rewire electrical connections (except where the submarine locks them). | Rules | True | bool | True / False | [S][W] |
| LockAllDefaultWires | Lock default wires | Lock all the wires that come already connected on a submarine. | Rules | False | bool | True / False | [S][W] |
| AllowLinkingWifiToChat | Wifi to chat | Allow linking wireless components to the text chat. | Rules | False | bool | True / False | [S][W] |
| AllowDragAndDropGive | Drag items onto players | Allow giving items by dragging them onto another character. | Rules | True | bool | True / False | [S][W] |
| AllowImmediateItemDelivery | Instant purchase delivery | Bought items go straight into the buyer's inventory. | Rules | True | bool | True / False | [S][W] |
| DestructibleOutposts | Destructible outposts | Outposts can be damaged and destroyed. Abandoned outposts are always destructible. (Wiki spells the key `DestructableOutposts`; the source spelling is DestructibleOutposts.) | Rules | False | bool | True / False | [S][W] |
| KillableNPCs | Killable NPCs | Non-player characters can be killed. | Rules | True | bool | True / False | [S][W] |
| AllowRemoteCampaignInteractions | Remote shop use | Let players use outpost services remotely. Off by default to stop modified clients cheating; only turn on if a mod needs it. | Rules | False | bool | True / False | [S] |
| AllowVoteKick | Vote kick | Players can vote to kick others. | Voting | True | bool | True / False | [S][W] |
| AllowEndVoting | Vote to end round | Players can vote to end the round. | Voting | True | bool | True / False | [S][W] |
| KickVoteRequiredRatio | Kick vote fraction | Fraction of votes needed to kick a player. | Voting | 0.6 | float | 0.0 to 1.0 | [S][W] |
| EndVoteRequiredRatio | End-round vote fraction | Fraction of votes needed to end the round. | Voting | 0.6 | float | 0.0 to 1.0 | [S][W] |
| VoteRequiredRatio | Other votes fraction | Fraction needed for other votes (submarine and game mode). Not documented on the wiki table. | Voting | 0.6 | float | 0.0 to 1.0 (assumed) | [S] |
| VoteTimeout | Vote time limit (s) | How long a vote stays open. | Voting | 30 | float | seconds | [S][W] |
| DisallowKickVoteTime | New-player kick-vote delay (s) | Players who joined less than this many seconds ago do not count toward the number of eligible voters used for the kick-vote threshold (GameServer.cs ~line 4087); not documented on the wiki. | Voting | 120 | float | seconds | [S][GameServer.cs] |
| MaxAutoBanTime | Longest vote-ban (s) | Maximum ban length that can be chosen in the host UI. | Voting | 86400 | float | seconds | [S][W] |
| AutoBanTime | Vote-ban length (s) | Ban length given to players who are vote-kicked. | Voting | 3600 | float | seconds | [S][W] |
| BanAfterWrongPassword | Ban after wrong passwords | Auto-ban a player who enters the wrong password too many times. | Safety | True | bool | True / False | [S][W] |
| MaxPasswordRetriesBeforeBan | Password tries before ban | Failed password attempts before the auto-ban. | Safety | 3 | int | >= 1 | [S][W] |
| SaveServerLogs | Save server logs | Write the server log into the ServerLogs folder when the server shuts down. | Logging | True | bool | True / False | [S][W] |
| LinesPerLogFile | Lines per log file | Maximum lines in one log file. | Logging | 800 | int | > 0 | [S][W] |
| AllowModDownloads | Allow mod downloads from server | Let players download missing mods from the server. If off and a player lacks a mod, they cannot join. | Mods | True | bool | True / False | [S][W] |
| AllowFileTransfers | Send missing files | Server sends missing submarine files to players. Missing content packages still block joining. | Mods | True | bool | True / False | [S][W] |
| LosMode | Line of sight | How walls hide things from players. | Display | Transparent | enum | Transparent (dim view through walls), Opaque (walls block view), None (see through walls) | [S][GS][W] |
| ShowEnemyHealthBars | Enemy health bars | Whether enemy health bars show. | Display | ShowAll | enum | ShowAll, BossHealthBarsOnly, HideAll | [S][GS][W] (wiki spells the key `ShowEnemyHealthBar`; source has ShowEnemyHealthBars) |
| DisabledMonsters | Disabled monsters | Comma separated monster identifiers that will not spawn. Empty = all can spawn. Identifier list not researched. | Game | empty | string list | monster character identifiers (UNVERIFIED list) | [SS][W] |

### 2.5 Traitors
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| TraitorProbability | Traitor chance | Chance that a round has a traitor. 0 disables traitors, 1 means every round. | Traitors | 0 | float | 0.0 to 1.0 (clamped; GameServer.cs line 3176 does `Rand.Range(0,1) < TraitorProbability`; the wiki table claim of 0-100 is wrong) | [S][GameServer.cs][W] |
| TraitorDangerLevel | Traitor danger level | How dangerous traitor tasks are: 1 harmless, 2 may cause injury or damage, 3 high chance of injury, damage or casualties. | Traitors | 1 | int | 1 to 3 | [S][TE][W] |
| TraitorsMinPlayerCount | Min players for a traitor | Fewest players needed before a traitor is picked. | Traitors | 1 | int | 1 to 16 | [S][W] |
| MinPercentageOfPlayersForTraitorAccusation | Accusation vote threshold (%) | Percentage of votes at which a player is accused of being a traitor at the end of the round. | Traitors | 50 | float | 0 to 100 | [S][W] |

### 2.6 Karma (anti-griefing; presets in section 4)
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| KarmaEnabled | Karma system | Turns on the automatic anti-griefing score system. | Karma | False | bool | True / False | [S][W] (wiki table says True, wiki sample and source say False) |
| KarmaPreset | Karma preset | Which set of karma rules is used. Only matters when karma is on. | Karma | default | string | default (lenient), strict, custom | [S][K][W] |

### 2.7 PvP mode
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| PvpTeamSelectionMode | Team selection | How PvP teams are assigned. | PvP | PlayerPreference | enum | PlayerPreference (server balances using preferences), PlayerChoice (players pick, still subject to auto-balance) | [S][E][W] |
| PvpAutoBalanceThreshold | Auto-balance threshold | How many extra players one team may have before auto-balancing. 0 turns auto-balance off. | PvP | 1 | int | 0 to 3 | [S][W] |
| PvPStunResist | Stun resistance | Gives players extra resistance to stuns in PvP. | PvP | 0 | float | 0 to 100 | [S][W] |
| PvPSpawnMonsters | Spawn monsters | Let monsters spawn in PvP (mainly useful for King of the Hull and Sub vs Sub). | PvP | False | bool | True / False | [S][W] |
| PvPSpawnWrecks | Spawn wrecks | Let wrecks spawn in PvP. | PvP | True | bool | True / False | [S][W] |
| SelectedOutpostName | PvP outpost | Outpost for the Outpost Deathmatch mission type. | PvP | Random | string | Random or an outpost name | [S][W] |
| WinScorePvP | Score to win | Points a team needs to win a scored PvP mission. | PvP | 200 | int | 0 to 1000 per wiki | [S][W] |
| TrackOpponentInPvP | Track opponent | PvP option; meaning not documented (wiki says STUB). | PvP | True | bool | True / False | [S][W] |
| DisembarkPointAllowance | Disembark points | Points available for choosing start perks (PvP). Wiki says STUB. | PvP | 7 | int | UNVERIFIED | [S][W] |
| SelectedCoalitionPerks | Coalition perks | Semicolon separated perk identifiers chosen for the Coalition team. | PvP | perks with zero cost (sample: airlockbasic;armorysmall;engineeringshiprepair;medbayfirstaid;hullupgradesteel) | identifier list | perk identifiers (list not researched) | [S][SS][W] |
| SelectedSeparatistsPerks | Separatist perks | Same for the Separatists team. | PvP | as above | identifier list | as above | [S][SS][W] |

### 2.8 Campaign money (root attributes)
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| LootedMoneyDestination | Looted money goes to | Whether money found in the world goes to the crew bank or the player's own wallet. | Campaign | Bank | enum | Bank, Wallet | [S][W] |
| MaximumMoneyTransferRequest | Max money transfer | Largest amount that can be transferred at once. | Campaign | 999999 | int | > 0 | [S][W] |
| NewCampaignDefaultSalary | New-player salary | Default salary for new players. | Campaign | 0 | float | 0 to 100 per wiki | [S][W] |

### 2.9 Synchronisation (advanced; source comments only)
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| MinimumMidRoundSyncTimeout | Mid-round sync timeout (s) | Seconds a player may stay out of sync mid-round before being kicked. Wiki name `MinimumRoundSyncTimeout`, value 10 in the sample file; source 30. | Advanced | 30 (source) / 10 (wiki) | float | seconds | [S][W] |
| RoundStartSyncDuration | Round-start sync time (s) | How long the server waits for players to get in sync after a round starts before kicking them. | Advanced | 120 | float | seconds | [S] |
| EventRemovalTime | Event keep time (s) | How long the server keeps network events that every synced player has received. | Advanced | 15 | float | seconds | [S] |
| OldReceivedEventKickTime | Late event kick (s) | Kick a player who has not received an event that others already got after this time. | Advanced | 20 | float | seconds | [S] |
| OldEventKickTime | Very late event kick (s) | Kick a player who still lacks an event after this time. | Advanced | 40 | float | seconds | [S] |

Deprecated attributes listed by the wiki but not in the current source property list (do not expose; the game ignores them): AllowRagdollButton, AllowRespawn (use RespawnMode), TraitorsEnabled, TraitorsMinStartDelay, TraitorsMaxStartDelay, TraitorsMinRestartDelay, TraitorsMaxRestartDelay, Public (use IsPublic), LevelDifficulty (use SelectedLevelDifficulty) [W].

## 3. `<campaignsettings>` child element (attributes) [CS, SS, W]
Saved as a lowercase child element `<campaignsettings .../>` of the root (always written, including defaults). Read back from a child named CampaignSettings (case-insensitive).
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| PresetName | Difficulty preset | Name of the campaign difficulty preset these values came from. | Campaign | Normal | string | wiki: Custom, Easy, Normal, Hard, Abyssal (current list UNVERIFIED) | [CS][W] |
| TutorialEnabled | Tutorial | Wiki gives no description (STUB). | Campaign | True | bool | True / False | [CS][W] |
| RadiationEnabled | Radiation | Enables Jovian radiation in the campaign. | Campaign | False | bool | True / False | [CS][W] |
| MaxMissionCount | Missions per route | How many missions can be taken for one route between two stations (beacons not counted). | Campaign | 2 | int | 1 to 10 (clamped in source; wiki says 0-10) | [CS][W] |
| WorldHostility | World hostility | How dangerous Europa is: more and tougher enemies, hazards, and mechanics such as infected wounds. | Campaign | Medium | enum | Low, Medium, High, Hellish (source enum; wiki lists only Low/Medium/High) | [CS][E][W] |
| StartItemSet | Starting items | Which starting item set the submarine gets. Identifier. | Campaign | normal | string | identifiers (list not researched; UNVERIFIED) | [CS][W] |
| StartingBalanceAmount | Starting money | Amount of starting funds. | Campaign | Medium | enum | Low, Medium, High | [CS][E][W] |
| CrewVitalityMultiplier | Crew health multiplier | Multiplies crew characters' base health. | Campaign | 1 | float | 0.5 to 2.0, step 0.1 (UI limits) | [CS][W] |
| NonCrewVitalityMultiplier | Monster health multiplier | Multiplies health of non-crew characters such as monsters. | Campaign | 1 | float | 0.5 to 3.0, step 0.1 | [CS][W] |
| OxygenMultiplier | Oxygen multiplier | Oxygen amount multiplier (wiki STUB). | Campaign | 1 | float | 0.2 to 2.0, step 0.1 (default limits) | [CS][W] |
| FuelMultiplier | Fuel multiplier | Multiplies fuel rod durability. | Campaign | 1 | float | 0.2 to 2.0, step 0.1 | [CS][W] |
| MissionRewardMultiplier | Mission reward multiplier | Multiplies mission money rewards. | Campaign | 1 | float | 0.5 to 2.0, step 0.1 | [CS][W] |
| ExperienceRewardMultiplier | Experience multiplier | Multiplies mission experience rewards. | Campaign | 1 | float | 0.5 to 2.0, step 0.1 | [CS][W] |
| ShopPriceMultiplier | Shop price multiplier | Multiplies item prices in stores. | Campaign | 1 | float | 0.1 to 3.0, step 0.1 | [CS][W] |
| ShipyardPriceMultiplier | Shipyard price multiplier | Multiplies prices of upgrades and submarines in the shipyard. | Campaign | 1 | float | 0.1 to 3.0, step 0.1 | [CS][W] |
| RepairFailMultiplier | Repair failure damage multiplier | Multiplies the damage from a failed electrical repair. (Wiki typo `RepairFailMulitplier`.) | Campaign | 1 | float | 0.5 to 5.0, step 0.5 | [CS][W] |
| ShowHuskWarning | Husk warning | Show the on-screen warning when husk infection gets serious. Does not hide the health-screen indicator. | Campaign | True | bool | True / False | [CS][W] |
| PatdownProbability | Security patdowns | How likely outpost security is to inspect crew for stolen items. | Campaign | Medium | enum | Off, Low, Medium, High | [CS][E][W] |
Range limits above come from `_multiplierSettings` in [CS] (default Min 0.2, Max 2.0, Step 0.1 with per-key overrides) and apply to the in-game UI; whether the file loader clamps them is UNVERIFIED.

## 4. karmasettings.xml (`Data/karmasettings.xml`, shipped inside the install) [K, WK]
Shape: root `<KarmaManager>` with three `<Preset name="Default|Strict|Custom" attr="value" ... />` children, every setting a lowercase attribute. Shipped values (Default / Strict / Custom): from the file at the [K] URL. Only the Custom preset is meant to be edited (the game saves it when KarmaPreset is `custom`); the file is rewritten by the game. Descriptions are from the wiki Karma page [WK].
| key | label | description | default (Default / Strict / Custom) | source |
|---|---|---|---|---|
| resetkarmabetweenrounds | Reset karma each round | Karma returns to normal each round (wiki lists as N/A). | true / true / true | [K] |
| kickbanthreshold | Kick/ban threshold | Karma below this triggers an automatic kick and/or ban. | 0 / 1 / 1 | [K][WK] |
| kicksbeforeban | Kicks before ban | Number of automatic kicks before the next one is a ban; 0 means always ban. | 3 / 1 / 3 | [K][WK] |
| herpesthreshold | Space-herpes threshold | Karma level below which the player gets space herpes. | 40 / 40 / 40 | [K][WK] |
| karmadecay | Decay speed | Karma lost per second while above the decay threshold. | 0.08 / 0.08 / 0.08 | [K][WK] |
| karmadecaythreshold | Decay threshold | Karma slowly falls when above this. | 50 / 50 / 50 | [K][WK] |
| karmaincrease | Recovery speed | Karma gained per second while below the increase threshold. | 0.05 / 0.04 / 0.05 | [K][WK] |
| karmaincreasethreshold | Recovery threshold | Karma slowly rises when below this. | 50 / 45 / 50 | [K][WK] |
| structurerepairkarmaincrease | Repairing structures | Karma gained per damage point repaired. | 0.005 / 0.005 / 0.01 | [K][WK] |
| structuredamagekarmadecrease | Damaging structures | Karma lost per damage point done to structures. | 0.025 / 0.1 / 0.05 | [K][WK] |
| itemrepairkarmaincrease | Repairing devices | Karma gained per damage point repaired on devices. | 0.03 / 0.03 / 0.03 | [K][WK] |
| reactoroverheatkarmadecrease | Reactor overheating | Karma lost per second a reactor stays critical under the player. | 0.5 / 1.0 / 0.5 | [K][WK] |
| reactormeltdownkarmadecrease | Reactor meltdown | Karma lost for causing a meltdown. | 30 / 35 / 30 | [K][WK] |
| damageenemykarmaincrease | Damaging enemies | Karma gained per damage point done to enemies. | 0.1 / 0.1 / 0.1 | [K][WK] |
| damagefriendlykarmadecrease | Damaging crew | Karma lost per damage point done to crewmates. | 0.15 / 0.3 / 0.15 | [K][WK] |
| extinguishfirekarmaincrease | Fighting fires | Karma gained per second extinguishing fires. | 1 / 1 / 1 | [K][WK] |
| allowedwiredisconnectionsperminute | Wire disconnects allowed | Wires a player may disconnect per minute before losing karma. | 5 / 3 / 5 | [K][WK] |
| wiredisconnectionkarmadecrease | Too many wire disconnects | Karma lost when over that limit. | 6.0 / 10.0 / 6.0 | [K][WK] |
| steersubkarmaincrease | Steering the sub | Karma gained for steering (no wiki text). | 0.15 / 0.15 / 0.15 | [K] (meaning inferred from name; UNVERIFIED) |
| spamfilterkarmadecrease | Chat spam | Karma lost for tripping the chat spam filter. | 15 / 25 / 15 | [K][WK] |
| karmanotificationinterval | Notification interval (s) | UNVERIFIED (not on the wiki; probably seconds between karma warnings). | 15 / 15 / 15 | [K] |
| dangerousitemstealkarmadecrease | Stealing dangerous items | Karma lost for stealing weapons/ID cards from unconscious or handcuffed players. | 15 / 15 / 15 | [K][WK] |
| dangerousitemstealbots | Stealing from bots counts | Also penalise stealing dangerous items from bots. | false / true / false | [K][WK] |
| ballastflorakarmaincrease | Ballast flora | Karma gained for damaging ballast flora. | 0.05 / 0.03 / 0.05 (wiki table lists the two presets the other way round; the shipped file wins) | [K][WK] |
| dangerousitemcontainkarmadecrease | Containing dangerous items | Karma lost for putting dangerous items in containers. | 5.0 / 5.0 / 5.0 | [K][WK] |
| isdangerousitemcontainkarmadecreaseincremental | Growing penalty | Penalty multiplies each repeat. | true / true / true | [K][WK] |
| maxdangerousitemcontainkarmadecrease | Max container penalty | Cap on that penalty. | 30 / 30 / 30 | [K][WK] |
Properties in KarmaManager.cs not present in the shipped presets (code defaults): maxstructuredamagekarmadecreasepersecond 15, healfriendlykarmaincrease 0.2, stunfriendlykarmadecrease 0.25, stunfriendlykarmadecreasethreshold 0.3, allowedretaliationtime 120 - meanings UNVERIFIED beyond names [https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Networking/KarmaManager.cs].

## 5. clientpermissions.xml attributes (table form)
| key | label | description | default | type | allowed | source |
|---|---|---|---|---|---|---|
| Client/@name | Player name | Display name of the person (required). | none | string | any | [SS][WC] |
| Client/@accountid | Steam ID | Identifies the player; alias `steamid`. One of accountid or address is required. | none | string | Steam ID formats such as `STEAM_1:1:12345678` | [SS][WC] |
| Client/@address (aliases endpoint, ip) | Network address | Alternative identifier for a player. | none | string | valid address | [SS] |
| Client/@permissions | Permissions | Comma separated flag names, or `All`. | none | string | see list in 1.2 | [SS][P] |
| Client/@preset | Permission preset | Use a named preset instead of listing permissions. | none | string | None, Moderator, Admin or custom preset display name | [SS][P] |
| Client/command/@name | Allowed console command | Console commands this player may use (only read when ConsoleCommands is granted). | none | string | a console command name | [SS][WC] |

## UNVERIFIED list
1. master branch source equals the shipped build 1.13.4.0 (several wiki defaults disagree with source: RespawnInterval 30 vs 300, MinimumMidRoundSyncTimeout 30 vs 10, KillDisconnectedTime, KickAFKTime, KarmaEnabled).
2. Exact bool text case the game accepts on read (writer uses `True/False` and `true/false`).
3. The exact set of GameModeIdentifier values, MissionTypes names, Biome names, StartItemSet names, PresetName values and monster identifiers for DisabledMonsters in 1.13 (only the wiki lists, which are partly outdated).
4. Meaning of TrackOpponentInPvP, DisembarkPointAllowance, karmanotificationinterval, steersubkarmaincrease and the karma properties not in the shipped presets.
5. Whether the file loader clamps campaign multiplier values to the UI limits.
6. Whether the 1.13 dedicated server downloads Workshop mods by itself; exact multiplayer save folder name.
7. Exact attribute name for the server language inside config_player.xml.

## Found in the source but not confidently explainable
TrackOpponentInPvP, DisembarkPointAllowance, SelectedCoalitionPerks / SelectedSeparatistsPerks (identifier lists), DisabledMonsters (identifier list), StartItemSet, VoteRequiredRatio (exact scope), karmanotificationinterval, steersubkarmaincrease, EndRoundAtLevelEnd (wiki only, legacy).

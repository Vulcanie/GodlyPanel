# Space Engineers dedicated server: config files and every setting (conventions section B)

Date: 2026-10-15. Game: Space Engineers 1 (store app 244850; Windows dedicated server tool app 298740). Windows only.
Build the facts are for: the SessionSettings page was last edited 22 June 2026 and documents settings added up to SE v1.209 (so roughly SE 1.209 or newer); no exact server build number appears in any source (UNVERIFIED). Where the 2022 Keen source (v1.19x era) differs, the 2026 wiki wins and the difference is noted.

## Sources (IDs used in the tables)
- SS = https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings (community-run wiki.gg, titled "Official Space Engineers Wiki"). Read via Wayback snapshot 2026-07-20 (live site blocks scripted fetches); the whole page was extracted; raw copy in `_raw/ss.txt`. "Game's documentation:" on that page = the in-game tooltip text. "Limit in DS GUI" = range the Dedicated Server window enforces; the XML itself may accept other values (the setup page says out-of-range values are untested and unsupported).
- CD = https://spaceengineers.wiki.gg/wiki/Modding/Reference/MyConfigDedicated (live page, read through a summarizing fetch tool, so wording is paraphrased; element names/types/defaults were reported per element; the page has almost no descriptions).
- WC = https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/WorldConfiguration (sandbox_config.sbc), CP = https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/Checkpoint (sandbox.sbc), SV = https://spaceengineers.wiki.gg/wiki/Modding/Reference/SBC/Saves (index of save files). All via summarizing fetch tool.
- SETUP = https://spaceengineers.wiki.gg/wiki/Setting_up_a_Space_Engineers_Dedicated_Server (Dedicated Server UI field list, `-np` network parameters, Remote API, router ports). Full page read; raw copy `_raw/wiki_setup.txt`.
- SRC = Keen's published source, https://github.com/KeenSoftwareHouse/SpaceEngineers (last commit 2022-01-06, OLD): `Sources/Sandbox.Game/Engine/Utils/MyConfigDedicated.cs`, `Sources/VRage.Game/ObjectBuilders/MyObjectBuilder_SessionSettings.cs` (contains class `MyConfigDedicatedData<T>` with `[XmlRoot("MyConfigDedicated")]`), `Sources/VRage.Game/ObjectBuilders/MyObjectBuilder_Checkpoint.cs`, `Sources/Sandbox.Game/MySandboxGame.cs` (startup / world-loading logic). Raw copies in `_raw/` and `raw/`.
- GSK = https://www.gameserverkings.com/knowledge-base/space-engineers/configuration-overview/ , XG = https://xgamingserver.com/docs/space-engineers/server-config , LOW = https://low.ms/knowledgebase/space-engineers-server-configuration-guide , SEDS = https://github.com/yoep/SEDS-Setup (third-party hosting guides; used only for file locations/shape, NOT for defaults: XG's default values disagree with SS in several places).

## 1. Which files exist, where, and who wins

| file | location | format | who writes it | holds |
|---|---|---|---|---|
| `SpaceEngineers-Dedicated.cfg` | the server's data folder: `%APPDATA%\SpaceEngineersDedicated\` (foreground/console run), `%ProgramData%\SpaceEngineersDedicated\<instance>` (Windows service), or the folder given with `-path "<dir>"` (SETUP, SRC; see 03-launch-args.md) | XML, root `<MyConfigDedicated>` | The Dedicated Server window ("Save config") writes it. With `-console` and no file present the game loads in-memory defaults (SRC `MyConfigDedicated.Load`: missing file -> `SetDefault()`, no write). Whether a headless run ever creates it is UNVERIFIED, so the panel should write the whole file before first start. The game also rewrites it on save from the window; hosting guides say stop the server before hand-editing (XG, LOW). | server-level settings: name, ports, admins, bans, remote API, auto-restart/update, MOTD, plus a `<SessionSettings>` block used ONLY when a brand-new world is created |
| `Saves\<WorldName>\Sandbox_config.sbc` | inside the data folder: `<data>\Saves\<world folder>\` | XML, root believed `<MyObjectBuilder_WorldConfiguration>` (type name from WC; root tag text itself is second-hand: one hosting guide only, see UNVERIFIED) | game, on save | world's `<Settings>` (all SessionSettings), `<Mods>`, `<SessionName>`, `<LastSaveTime>` |
| `Saves\<WorldName>\Sandbox.sbc` | same world folder | XML, root believed `<MyObjectBuilder_Checkpoint>` (class name in SRC) | game, on save | the full world checkpoint: SessionName, Description, Password, Settings (SessionSettings), Mods, players, factions, etc. |
| other files in a world folder | `SANDBOX_0_0_0_.sbs` (sector), `Backup\`, `Storage\` | binary/XML | game | not config. The game deletes world-folder files it does not recognize on save (SS). |

Precedence (SS, WC, CP): `Sandbox_config.sbc` overrides `<Settings>`, `<Mods>` and `<SessionName>` in `Sandbox.sbc` when it exists. For an EXISTING world, the world's own files are what the server loads (LOW, SEDS agree; CD: "The settings and mods should not be changed in this file. Edit world's sandbox_config.sbc instead."). The `<SessionSettings>` in `SpaceEngineers-Dedicated.cfg` is only used to seed a new world (SRC startup code `startNewWorld` branch uses `ConfigDedicated.SessionSettings`; LOW). So: panel Settings tab for gameplay rules should edit the world's `Sandbox_config.sbc` (`<Settings>`), and ALSO the cfg `<SessionSettings>` block if the world does not exist yet.

How the server picks the world at start (SRC `MySandboxGame.cs`, 2022 code; current behaviour UNVERIFIED but consistent with the `-ignorelastsession` doc in SETUP):
1. If `-ignorelastsession` is not given and `<IgnoreLastSession>` is false and a last session exists -> loads the last session (the auto-saved world).
2. Else if `<LoadWorld>` is set -> loads that world folder (absolute path, or relative to the `Saves` folder); if the folder does not exist it creates a new world with that folder name.
3. Else creates a new world using the cfg `<SessionSettings>` and `<WorldName>` (empty WorldName becomes "Created yyyy-MM-dd HH:mm"); if `<PremadeCheckpointPath>` is an existing directory it copies that premade world's checkpoint and applies the cfg settings, name and mods to it.

## 2. XML shape (the panel must NOT use a `<property name= value=>` parser)

Every setting is a plain child element whose text is the value: `<MaxPlayers>8</MaxPlayers>`. Booleans are lowercase `true`/`false`. Enums are the name as text. Lists are a wrapper element with repeated child elements. Dictionaries use `<dictionary><item><Key>..</Key><Value>..</Value></item></dictionary>`. Element names are case-sensitive (.NET XmlSerializer). Unknown elements are ignored; missing elements get the defaults (the cfg is read by XmlSerializer, SRC).

### 2a. SpaceEngineers-Dedicated.cfg (root MyConfigDedicated; CD, SRC)
```xml
<?xml version="1.0"?>
<MyConfigDedicated xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SessionSettings>
    <GameMode>Survival</GameMode>
    <MaxPlayers>8</MaxPlayers>
    <!-- ...every SessionSettings element in section 4, flat, direct children... -->
  </SessionSettings>
  <LoadWorld>D:\SE\data\Saves\MyWorld</LoadWorld>
  <IP>0.0.0.0</IP>
  <SteamPort>8766</SteamPort>
  <ServerPort>27016</ServerPort>
  <AsteroidAmount>4</AsteroidAmount>
  <Administrators>
    <unsignedLong>76561190000000000</unsignedLong>   <!-- tag is unsignedLong even though the type is string (CD, SRC) -->
  </Administrators>
  <Banned>
    <unsignedLong>76561190000000001</unsignedLong>
  </Banned>
  <Reserved>
    <unsignedLong>76561190000000002</unsignedLong>
  </Reserved>
  <GroupID>0</GroupID>
  <ServerName>My server</ServerName>
  <WorldName>MyWorld</WorldName>
  <PauseGameWhenEmpty>false</PauseGameWhenEmpty>
  <IgnoreLastSession>false</IgnoreLastSession>
  <PremadeCheckpointPath></PremadeCheckpointPath>
  <!-- ... all other elements in table 3a ... -->
</MyConfigDedicated>
```
Element ORDER: .NET XmlSerializer reads elements in any order for classes without `[XmlElement(Order=)]`, but I only know the order that the 2022 source declares (SessionSettings, LoadWorld, IP, SteamPort, ServerPort, AsteroidAmount, Administrators, Banned, Mods, GroupID, ServerName, WorldName, PauseGameWhenEmpty, IgnoreLastSession, PremadeCheckpointPath). Order-insensitivity of the current build is UNVERIFIED; the panel should edit values in place rather than rebuild the file.
The `xmlns:xsi`/`xmlns:xsd` attributes are shown by CD for the root; they are what XmlSerializer writes by default. Hosting-guide samples (GSK) show the root without them; both work for reading (standard XmlSerializer behaviour, not sourced).

### 2b. Sandbox_config.sbc (WC, SS)
```xml
<?xml version="1.0"?>
<MyObjectBuilder_WorldConfiguration xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Settings xsi:type="MyObjectBuilder_SessionSettings">
    <GameMode>Creative</GameMode>
    <!-- ...SessionSettings elements (section 4), flat... -->
  </Settings>
  <Mods>
    <ModItem FriendlyName="Text HUD API">
      <Name>758597413.sbm</Name>
      <PublishedFileId>758597413</PublishedFileId>
      <PublishedServiceName>Steam</PublishedServiceName>
      <IsDependency>true</IsDependency>
    </ModItem>
  </Mods>
  <SessionName>MyWorld</SessionName>
  <LastSaveTime>...</LastSaveTime>
</MyObjectBuilder_WorldConfiguration>
```
- `<Settings xsi:type="MyObjectBuilder_SessionSettings">` : the `xsi:type` attribute is REQUIRED (SS: "Requires an xsi:type attribute"). Inside Sandbox.sbc `<Settings>` has the same attribute. In the cfg's `<SessionSettings>` no attribute is shown by any source.
- The root element name `MyObjectBuilder_WorldConfiguration`, the xmlns attributes, and the placement of `<Settings>`/`<Mods>`/`<SessionName>` as direct children of the root are taken from the page title/type name plus one third-party search snippet; no source quoted a full file. Treat as UNVERIFIED and have the panel edit existing files in place (find `<Settings ...>`), never regenerate them.
- ModItem fields (WC): `FriendlyName` attribute (string, optional, auto-filled), `Name` (string; for local mods the folder name; for workshop mods a generated `<id>.sbm` name from the old format, no longer used), `PublishedFileId` (ulong; 0 for local mods), `PublishedServiceName` (`Steam` or `mod.io`; set it when adding by hand), `IsDependency` (bool, default false; true = pulled in by another mod, hidden in the mods GUI, still saved in the list). Mod load order is list order (see 04-mods.md).
- Sandbox.sbc `<Mods>` uses the same syntax (CP). SRC shows the 2022 `ModItem` had only Name, PublishedFileId, FriendlyName.

## 3. SpaceEngineers-Dedicated.cfg elements (class MyConfigDedicated)

Columns: key | label | description | group | default | type | allowed values | source. Labels in quotes are the Dedicated Server window names from SETUP; others are mine. "UNVERIFIED" in a description means the meaning is inferred from the name only.

### 3a. Server elements
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `ServerName` | Server name | Name shown in the server list. | General | empty (SRC: `""`) | String | any text | CD, SRC, SETUP |
| `WorldName` | World name | Name of the world shown in the server list; also used as the new world's name when a new world is created. | General | empty (a new world then gets "Created <date time>") | String | any text | CD, SRC, SETUP |
| `ServerDescription` | Server description | Text for visitors to recognise the server. | General | null | String | any text | CD, SETUP |
| `IP` | Listen IP | Address of the network interface the server listens on. 0.0.0.0 = all interfaces, fine in most cases. | Network | `0.0.0.0` | String | an IP address | CD, SRC, SETUP |
| `ServerPort` | Port | UDP game port clients connect to. Forward this UDP port on the router and allow it in the firewall. | Network | `27016` | Int32 | 1-65535 (port) | CD, SRC, SETUP |
| `SteamPort` | Steam port | Steam query/communication port. Not shown in the window. 8766 matches XG's port list (UDP). Exact role beyond that: UNVERIFIED. | Network | `8766` | Int32 | 1-65535 (port) | CD, SRC, XG |
| `GroupID` | Steam Group ID | If non-zero the server is visible only to that Steam group. 0 = public. | General | `0` | UInt64 | Steam group id number | CD, SRC, SETUP |
| `ServerPasswordHash` | Password (hash) | The server password is stored as a salted hash, never plain text. Set both hash and salt together. The hashing method is not documented in any source I found; generate the pair with the Dedicated Server window ("Save config", then open the file) rather than guessing. | General | null | String | hash text | CD, SETUP (field "Password") |
| `ServerPasswordSalt` | Password (salt) | The salt that goes with ServerPasswordHash. They must come from the same generation or nobody can join. | General | null | String | salt text | CD |
| `MaxPlayers` | - | NOT a cfg element in the current class. Player cap is `<MaxPlayers>` inside SessionSettings (table 4, Players) and `-maxPlayers` overrides it. (XG shows it as a top-level cfg line; contradicted by SS/CD, UNVERIFIED.) | - | - | - | - | SS, CD |
| `PauseGameWhenEmpty` | Pause game when empty | Freezes the simulation while nobody is connected. | General | `false` | Boolean | true / false | CD, SRC |
| `IgnoreLastSession` | Ignore last session | When true, don't resume the last auto-saved world at start; use LoadWorld or create a new world. Same as the `-ignorelastsession` argument. | World | `false` | Boolean | true / false | CD, SRC |
| `LoadWorld` | Load world | Path to a world folder to load (absolute, or relative to the Saves folder). Not shown in the window. If the folder does not exist, a new world with that folder name is created. | World | null | String | path | CD, SRC |
| `PremadeCheckpointPath` | Premade world | Path to a world folder to use as the template for creating a NEW world (its checkpoint is copied; the cfg settings, name and mods are applied). Not shown in the window. Empty = start from scratch. | World | empty | String | path to an existing folder | CD, SRC |
| `AsteroidAmount` | Asteroid amount | Number of asteroids placed when a new world is created. Not shown in the window. 2022 code; use in the current build is UNVERIFIED (current worlds use ProceduralDensity). | World | `4` | Int32 | whole number | CD, SRC |
| `AutodetectDependencies` | Autodetect dependencies | When on, mods that other mods need are added automatically; off = you must add them yourself ("more control"). | Mods | `true` | Boolean | true / false | CD |
| `SessionSettings` | World settings | Nested block holding every setting in table 4. Used only to seed a new world; for existing worlds edit the world's Sandbox_config.sbc. | World | (created) | MyObjectBuilder_SessionSettings | see section 4 | CD, SRC |
| `Administrators` | Admins | Steam IDs (64-bit) with admin rights. Each entry is `<unsignedLong>ID</unsignedLong>` even though the list type is string. | Users | empty | List of String | 17-digit Steam64 IDs | CD, SRC, SETUP |
| `Banned` | Banned | Steam IDs barred from joining. Entries `<unsignedLong>`. | Users | empty | List of UInt64 | Steam64 IDs | CD, SRC |
| `Reserved` | Reserved slots | Steam IDs that may join even when the server is full. Entries `<unsignedLong>`. | Users | empty | List of UInt64 | Steam64 IDs | CD, SETUP |
| `Mods` | Mods | In the 2022 class this was a list of Workshop ids (`List<ulong>`) in the cfg. The current wiki page has NO Mods element and says mods belong in the world's Sandbox_config.sbc; some hosting guides (GSK, XG) still show `<Mods>` with `<ModItem>` in the cfg. Current behaviour UNVERIFIED; see 04-mods.md. | Mods | empty | List | - | SRC, CD, GSK, XG |

### 3b. Remote API (VRage Remote Client)
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `RemoteApiEnabled` | Remote API enabled | Turns on the REST remote-management API (used by VRage Remote Client). Anyone with the security key can administer the server, so keep it off unless you need it. | Remote API | `true` per CD (XG says disabled by default; conflict, UNVERIFIED) | Boolean | true / false | CD, SETUP, XG |
| `RemoteApiIP` | Host | IP the Remote API listens on. | Remote API | null | String | IP address | CD, SETUP |
| `RemoteApiPort` | Port | TCP port of the Remote API. | Remote API | `8080` | Int32 | 1-65535 | CD, SETUP, XG |
| `RemoteSecurityKey` | Security key | Secret key (HMAC-SHA1 private key) clients use to sign requests. Never share it. | Remote API | null | String | text; the window generates it (format UNVERIFIED) | CD, SETUP |

### 3c. Network, chat, messages, logging
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `VerboseNetworkLogging` | Verbose network logging | Writes extra network detail to the log. Useful only when troubleshooting. | Network | `false` | Boolean | true / false | CD, SETUP |
| `ConsoleCompatibility` | Console compatibility | Makes the world joinable by console players (cross-play). Per the wiki, console-compatible worlds cap several values (see notes in table 4) and cannot use Steam Workshop mods (mod.io only). | Network | `false` | Boolean | true / false | CD, SETUP, SS |
| `CrossPlatform` | Cross platform | Not shown in the window; the wiki gives no description. Probably related to cross-play (UNVERIFIED). | Network | `false` | Boolean | true / false | CD |
| `NetworkType` | Network type | Which online service the server uses: Steam or EOS (Epic Online Services). | Network | `steam` | String | `steam`, `eos` (lowercase default shown; exact accepted strings UNVERIFIED) | CD, SETUP |
| `NetworkParameters` | Network parameters (EOS only) | List of `<Parameter>key:value</Parameter>`: `globalMaxUpload:600`, `peerMaxUpload:600`, `statWindow:60` (seconds), `peakStatWindow:60` (seconds). Only used in EOS networking. Same as the `-np` argument. | Network | empty | List of String | the four keys above | SETUP, CD |
| `DedicatedId` | Dedicated id | Not shown in the window; no description. UNVERIFIED. | Advanced | `0` | Int64 | - | CD |
| `ChatAntiSpamEnabled` | Enable chat anti-spam | Blocks players who flood the chat. | Chat | `true` | Boolean | true / false | CD, SETUP |
| `SameMessageTimeout` | Same message timeout | Seconds (UNVERIFIED unit) before a player may repeat an identical message. Window label "Spam Message Timeout". | Chat | `30` | Int32 | whole number | CD, SETUP |
| `SpamMessagesTime` | Spam messages time | Time window used to count messages as spam (UNVERIFIED unit and meaning). Window label "Spam Message Time". | Chat | `0.5` | Single | number | CD, SETUP |
| `SpamMessagesTimeout` | Spam messages timeout | How long a spamming player is muted (UNVERIFIED unit and meaning). Window label "Spam Messages Timeout". | Chat | `60` | Int32 | whole number | CD, SETUP |
| `SaveChatToLog` | Save chat to log | Also writes chat messages into the server log file. | Logging | `false` | Boolean | true / false | CD |
| `MessageOfTheDay` | Message of the day | Optional text shown to joining players (a window pop-up in certain cases). May use variables `{server_name}`, `{world_name}`, `{server_description}`, `{player_count}`, `{current_player}`. | MOTD | empty | String | text | CD, SETUP |
| `MessageOfTheDayUrl` | Message of the day URL | Optional link shown with the message of the day. | MOTD | empty | String | URL | CD, SETUP |

### 3d. Maintenance (auto restart / auto update / watchdog)
Group "Maintenance" in the window ("You can set up Auto Restart and Auto Update features on this tab", SETUP). The wiki page gives names, types and defaults but no descriptions; meanings below are inferred from the names and are UNVERIFIED.
| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `AutoRestartEnabled` | Auto restart enabled | Restart the server automatically on a schedule (UNVERIFIED). Note: default true but works with AutoRestatTimeInMin 0. | Maintenance | `true` | Boolean | true / false | CD |
| `AutoRestatTimeInMin` | Auto restart interval (minutes) | Minutes between automatic restarts (UNVERIFIED). The element name really is spelled `AutoRestatTimeInMin` (typo in the game). 0 presumably = never (UNVERIFIED). | Maintenance | `0` | Int32 | whole number | CD |
| `AutoRestartSave` | Save before auto restart | Save the world before an automatic restart (UNVERIFIED). | Maintenance | `true` | Boolean | true / false | CD |
| `WatcherInterval` | Watcher interval | Seconds between server-health checks (UNVERIFIED unit and meaning). | Maintenance | `30` | Single | number | CD |
| `WatcherSimulationSpeedMinimum` | Watcher minimum simulation speed | If the simulation speed stays below this (0.05 = 5 percent), the watcher considers the server stuck (UNVERIFIED). | Maintenance | `0.05` | Single | number | CD |
| `AutoUpdateEnabled` | Auto update enabled | Automatically check for and install server updates (UNVERIFIED). Not useful when the panel updates through SteamCMD. | Maintenance | `false` | Boolean | true / false | CD |
| `AutoUpdateCheckIntervalInMin` | Auto update check interval (minutes) | Minutes between update checks (UNVERIFIED). | Maintenance | `10` | Int32 | whole number | CD |
| `AutoUpdateRestartDelayInMin` | Auto update restart delay (minutes) | Minutes of warning before restarting for an update (UNVERIFIED). | Maintenance | `15` | Int32 | whole number | CD |
| `AutoUpdateSteamBranch` | Steam branch | Which Steam branch to update from (UNVERIFIED; null = default). | Maintenance | null | String | branch name | CD |
| `AutoUpdateBranchPassword` | Branch password | Password for a private Steam branch (UNVERIFIED). Secret: do not display. | Maintenance | null | String | text | CD |
| `ManualActionDelay` | Manual action delay (minutes) | Delay used by the Stop/Restart "Setup Actions" in the window before it acts, with a chat warning (SETUP: "Stop/Restart server with delay and chat message"). Unit of minutes inferred from the message text. Not shown in the window. | Maintenance | `5` | Int32 | whole number | CD, SETUP |
| `ManualActionChatMessage` | Manual action chat message | Chat message sent before a manual stop/restart; `{0}` is replaced by the minutes. | Maintenance | `Server will be shut down in {0} min(s).` | String | text containing {0} | CD |
| `Plugins` | Plugins | List of plugin DLL paths loaded by the server (the window's Plugins tab). Plugins are unsupported by Keen and force Experimental Mode; see 04-mods.md. | Plugins | empty | List of String | file paths | CD, SETUP |

## 4. SessionSettings elements (class MyObjectBuilder_SessionSettings)

Used in three places: the world's `Sandbox_config.sbc` `<Settings xsi:type="MyObjectBuilder_SessionSettings">` (wins), the same in `Sandbox.sbc`, and the cfg's `<SessionSettings>` (new worlds only). All elements are direct children, flat. Group = wiki section = Dedicated Server window tab (SS). Default = value used when the element is MISSING (SS), which mostly matters for old worlds; new worlds are initialised from the chosen scenario/template (look at `<SE>\Content\CustomWorlds\...\Sandbox_config.sbc`), and these can differ (SS). For example the 2022 source defaulted InventorySizeMultiplier to 10 and EnvironmentHostility NORMAL while SS now says 3; the 2026 wiki value is listed. "Since" = game version in which the setting was added when SS says so. Labels = "Name in DS GUI" from SS, or a spaced version of the key when not shown in the window. Allowed values = the range the Dedicated Server window enforces (the file itself may accept more).
Limits SS notes for console-compatible worlds (ConsoleCompatibility true): MaxFloatingObjects capped at 50, SyncDistance at 2000, ViewDistance at 7000, MaxPlanets at 3, PrefetchShapeRayLengthLimit at 2000, PlayerDistanceThreshold at 250, BlockCountThreshold minimum 50, VoxelGeneratorVersion forced 5, EnableContainerDrops forced off, EnableIngameScripts forced off for player-hosted worlds, UseConsolePCU forced on.


#### Block Limits

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `BlockLimitsEnabled` | Block Limits Mode | How block and PCU limits are shared. NONE turns all limits off (including max grid size and blocks per player); GLOBALLY = everyone shares one pool; PER_FACTION = each faction shares one pool; PER_PLAYER = each player gets their own. | Block Limits | NONE | MyBlockLimitsEnabledEnum | Dropdown: NONE=No limits; GLOBALLY=Shared by everyone; PER_FACTION=Per faction; PER_PLAYER=Per player; other values: not accepted (enum) |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `BlockTypeLimits` | Block Type World Limits | Per-block-type caps (default: Assembler 24, Refinery 24, Blast Furnace 24, Antenna 30, Drill 30, InteriorTurret/GatlingTurret/MissileTurret 50 each, ExtendedPistonBase 50, MotorStator 50, MotorAdvancedStator 50, ShipWelder 100, ShipGrinder 150). A list of Key (block group name) / Value (max count) pairs; the Key is a block pair name or a tag depending on LimitBlocksBy. Only matters if BlockLimitsEnabled is not NONE. | Block Limits | (see description) | SerializableDictionary<String, Int16> | list of Key/Value pairs; Value is Int16 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `LimitBlocksBy` | Limit Blocks by | Which naming system the BlockTypeLimits keys use: the block's BlockPairName, or a tag from BlockTags.sbc. Only needed if you edit BlockTypeLimits. | Block Limits | BlockPairName | LimitBlocksByOption | Dropdown: BlockPairName=By block name; Tag=By block tag (since 1.205); other values: not accepted (enum) | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxBlocksPerPlayer` | Max Blocks per Player | Most blocks one player can have built at once. 0 = no limit. Ignored when BlockLimitsEnabled is NONE. | Block Limits | 100000 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxGridSize` | Max Grid Blocks | Most blocks allowed in a single ship or station (grid). 0 = no limit. Ignored when BlockLimitsEnabled is NONE. | Block Limits | 50000 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `TotalPCU` | World PCU | The world's PCU (Performance Cost Unit) budget, a score of how heavy blocks are. GLOBALLY: everyone shares it. PER_PLAYER: divided by MaxPlayers (if MaxPlayers is 0 each player gets the full amount). PER_FACTION: divided by MaxFactionsCount (if that is 0 each faction gets the full amount); players with no faction get 0 PCU. NONE: no PCU limit. | Block Limits | 600000 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxFactionsCount` | Max Factions Count | Most player factions that can exist. 0 = no limit. | Block Limits | 0 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### Environment

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `AdjustableMaxVehicleSpeed` | Adjustable Max Vehicle Speed | Whether the speed-limit slider shows in the terminal of wheel suspension blocks. (Not shown in the Dedicated Server window.) | Environment | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `BroadcastControllerMaxOfflineTransmitDistance` | Offline Broadcast Controller Distance [m] | How far (metres) a Broadcast Controller keeps sending messages while its owner is offline (0-20000 in the window). | Environment | 200 | Int32 | DS window limit: 0 to 20000 | 1.204 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `DestructibleBlocks` | Enable Destructible Blocks | If off, blocks cannot be destroyed and explosions stop doing their damage (may affect other things too). | Environment | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableOxygen` | Enable Oxygen | Turns on the oxygen system (breathable air, O2 tanks). Turning it off removes all oxygen features. | Environment | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableOxygenPressurization` | Enable Airtightness | Lets players seal rooms and ships and fill them with air (airtightness). Needs Enable Oxygen to be on. | Environment | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSunRotation` | Enable Sun Rotation | The Sun moves around the play area so planets have day and night. Off = fixed lighting. | Environment | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `SunRotationIntervalMinutes` | Sun Rotation Interval | Real minutes for one full day/night cycle (0-1440 in the window). Default 120 (2 hours). Needs Enable Sun Rotation. | Environment | 120 | Single | DS window limit: 0 to 1440 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableTurretsFriendlyFire` | Enable Friendly Missile Damage | Despite the name, it covers block weapons in general: if OFF, block-weapon explosions, penetration and ricochets do no damage to the grid that fired them or to grids linked to it through the terminal. | Environment | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableVoxelDestruction` | Enable Voxel Destruction | If off, voxels (asteroids and planet terrain) cannot be carved, which also stops drills from mining. | Environment | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EncounterDensity` | Random Encounter Density | How common random space encounters are, 0 to 1. | Environment | 0.35 | Single | DS window limit: 0 to 1 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnvironmentHostility` | Meteor Activity | How strong meteor showers are. SAFE turns them off; how often each level happens is set in the game's GlobalEvents.sbc. | Environment | NORMAL | MyEnvironmentHostilityEnum | Dropdown: SAFE=No meteors; NORMAL=Normal meteors; CATACLYSM=Frequent meteors; CATACLYSM_UNREAL=Extreme meteors (plain labels are mine; wiki only lists the enum names); other values: not accepted (enum) |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `TemporaryContainers` | Enable Temporary Containers | When a block is destroyed or ground down, its remaining cargo is packed into a Temporary Container (on) or dropped as loose floating items (off). | Environment | true | Boolean | true / false | 1.204 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxCargoBags` | Max Cargo Bags | Most Temporary Containers that can exist at once (2 to 1024 in the window). | Environment | 100 | Int16 | DS window limit: 2 to 1024 | 1.204 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `TrashCleanerCargoBagsMaxLiveTime` | Max Cargo Bags Lifetime | Minutes a Temporary Container lives before it is deleted (2 to 1024 in the window). | Environment | 30 | Int16 | DS window limit: 2 to 1024 | 1.204 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxFloatingObjects` | Max Floating Objects | Most loose items allowed in the world at once (2 to 100 in the window). Older ones are removed when new ones spawn. | Environment | 100 | Int16 | DS window limit: 2 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ScrapEnabled` | Enable Scrap Drops | Destroyed blocks can drop Scrap Metal. You can still get scrap from welding or grinding damaged blocks either way. | Environment | true | Boolean | true / false | 1.204 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `RealisticSound` | Enable Realistic Sound | On: sound is muffled or silent through space and ship hulls. Off (arcade): sound is always clear, as on a planet. | Environment | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `SyncDistance` | Sync Distance | How far (metres) around a player the server sends ships and objects to that player. Larger values can slow the server a lot. The game limits it to 1000-20000 (max 2000 for console-compatible worlds). | Environment | 3000 | Int32 | DS window limit: 1000 to 20000 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ViewDistance` | View Distance | Render distance in single-player, and the range for procedural generation and laser antenna line-of-sight checks. Multiplayer clients use SyncDistance for rendering instead. The game limits it to 1000-50000. (Not shown in the Dedicated Server window.) | Environment | 15000 | Int32 |  |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `WeatherSystem` | Enable Weather System | Automatic weather on planets that have it. | Environment | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `WeatherLightingDamage` | Enable Lightning Damage | Whether lightning strikes in weather can cause damage (when off the explosion effect is also removed). | Environment | false | Boolean | true / false | 1.204 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ProceduralDensity` | Procedural Asteroids Density | How many random asteroids are generated, 0 to 1. 0 = no automatic asteroids. | Environment | 0 | Single | DS window limit: 0 to 1 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ProceduralSeed` | Procedural Seed | Number that decides where generated asteroids and random encounters appear. Do not change on an existing world. | Environment | 0 | Int32 | DS window limit: -2147483648 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `DepositsCountCoefficient` | Deposits Count Coefficient | Multiplier for how many ore deposits get generated (0-10). Needs VoxelGeneratorVersion 3 or higher. | Environment | 2 | Single | DS window limit: 0 to 10 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `DepositSizeDenominator` | Deposit Size Denominator | Ore deposit size divisor (1-100). Needs VoxelGeneratorVersion 3 or higher. The wiki does not say which direction the effect goes (UNVERIFIED). | Environment | 30 | Single | DS window limit: 1 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `VoxelGeneratorVersion` | Voxel Generator Version | Which version of the asteroid and planet shape generator the world uses (0-100). Do not change on an existing world; higher is not always newer or better. | Environment | 4 | Int32 | DS window limit: 0 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `TotalBotLimit` | Bot Limit | Most animal/organic bots (spiders, wolves, etc.) in the world (16-1024). | Environment | 32 | Int32 | DS window limit: 16 to 1024 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PhysicsIterations` | Physics Iterations | Physics solver accuracy (2-8 shown in the window). The wiki says anything below 8 is ignored and 8 is used anyway, so leave it at 8. | Environment | 8 | Int32 | DS window limit: 2 to 8 (see note below) |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PrefetchShapeRayLengthLimit` | Prefetch Voxels Range Limit | Longest distance (metres) at which weapons and targeting can interact with planet terrain (0-100000; capped at 2000 on console-compatible worlds). | Environment | 15000 | Int64 | DS window limit: 0 to 100000 | 1.203 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `WorldSizeKm` | World Size [km] | Limits the play area to a cube this many km wide around the world centre. 0 = unlimited. | Environment | 0 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MinimumWorldSize` | Minimum World Size [km] | Only affects the world-creation screen (hides sizes smaller than this); no effect inside a running world. | Environment | 0 | Int32 | DS window limit: 0 to 2147483646 | 1.204 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableRadiation` | Enable Radiation | Radiation hazards. Needs airtightness. | Environment | true | Boolean | true / false | 1.207 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `SolarRadiationIntensity` | Solar Radiation Intensity | Multiplier for radiation taken from sunlight in space. Needs airtightness and radiation on. | Environment | 0 | Single |  | 1.207 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `FoodConsumptionRate` | Food Consumption Rate | How fast the food bar drains. 0 = no food bar. Game menu equivalents: Off 0, Slow 0.25, Moderate 0.5, Fast 1.0. | Environment | 0 | Single |  | 1.207 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### Multipliers

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `InventorySizeMultiplier` | Characters Inventory Size | Multiplier for how much a player character can carry (1-100 in the window). | Multipliers | 3 | Single | DS window limit: 1 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `BlocksInventorySizeMultiplier` | Blocks Inventory Size | Multiplier for cargo capacity of blocks (containers, ships). The weight of items in blocks is divided by it, so thrust needs stay similar. | Multipliers | 1 | Single | DS window limit: 1 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `WelderSpeedMultiplier` | Welder Speed | How fast welders (hand and ship) build and repair (0-100). | Multipliers | 2 | Single | DS window limit: 0 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GrinderSpeedMultiplier` | Grinder Speed | How fast grinders (hand and ship) take blocks apart (0-100). | Multipliers | 2 | Single | DS window limit: 0 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `HackSpeedMultiplier` | Hacking Speed | Extra grinding-speed multiplier when grinding enemy-owned blocks (0-100); it multiplies with the grinder speed. | Multipliers | 0.33 | Single | DS window limit: 0 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `HarvestRatioMultiplier` | Harvest Ratio Multiplier | Multiplier for ore received from hand drills only (0-100). | Multipliers | 1 | Single | DS window limit: 0 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `RefinerySpeedMultiplier` | Refinery Speed | How fast refineries process ore (1-100). Also affects trade-station prices. | Multipliers | 3 | Single | DS window limit: 1 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `AssemblerEfficiencyMultiplier` | Assembler Efficiency | Assembler efficiency (1-100): higher means blueprints need fewer materials. Also affects trade-station prices. | Multipliers | 3 | Single | DS window limit: 1 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `AssemblerSpeedMultiplier` | Assembler Speed | How fast assemblers build items (1-100). | Multipliers | 3 | Single | DS window limit: 1 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### NPCs

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `EnableEconomy` | Enable Economy | Turns on the NPC economy: trade stations, contracts, and a starting datapad pointing to the nearest station. Turning this off alone does not stop NPC factions and stations being generated; see CargoShipsEnabled, EnableEncounters, EnablePlanetaryEncounters and GlobalEncounterCap. | NPCs | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EconomyTickInSeconds` | Economy Tick Time | Seconds between economy updates (prices, restock, contracts, reputation decay), 300-3600. Needs Enable Economy. | NPCs | 600 | Int32 | DS window limit: 300 to 3600 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ReputationDecayRate` | Reputation Decay | How fast player reputation drifts back to neutral with each NPC faction (0 to 1), applied on each economy tick. | NPCs | 0.5 | Single | DS window limit: 0 to 1 | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `TradeFactionsCount` | NPC Factions Count | How many NPC factions are created when the world starts (8-100). | NPCs | 10 | Int32 | DS window limit: 8 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `StationsDistanceInnerRadius` | Stations Inner Radius | Inner radius (metres from the world centre) in which trade stations can spawn. Does not affect planet or orbital stations. | NPCs | 5000000 | Double | DS window limit: 200000 to 9.22337203685478E+18 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `StationsDistanceOuterRadiusStart` | Stations Outer Radius Start | Radius (metres) at which deep-space trade stations can start to appear. Does not affect planet or orbital stations. | NPCs | 5000000 | Double | DS window limit: 500000 to 9.22337203685478E+18 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `StationsDistanceOuterRadiusEnd` | Stations Outer Radius End | Radius (metres) beyond which no deep-space trade stations spawn. Does not affect planet or orbital stations. | NPCs | 10000000 | Double | DS window limit: 1000000 to 9.22337203685478E+18 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSpiders` | Enable Spiders | Spiders (and other animal bots except wolves) can spawn on planets that support them. | NPCs | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableWolfs` | Enable Wolves | Wolves can spawn on planets that support them. | NPCs | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `CargoShipsEnabled` | Enable Cargo Ships | NPC cargo ships can fly by. Also affects whether NPC factions and their trade stations are generated. | NPCs | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableEncounters` | Enable Encounters | Random encounters can appear. Also affects whether NPC factions and trade stations are generated. | NPCs | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableDrones` | Enable Drones | Some encounters have an antenna that launches drone ships when an enemy comes near. | NPCs | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PiratePCU` | NPC PCU | PCU budget for all NPC grids except global encounters (which use GlobalEncounterPCU). | NPCs | 25000 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `NPCGridClaimTimeLimit` | Claim Time for NPC Grids | Minutes an NPC ship or base stays before despawning if nobody claims it (1-1440). | NPCs | 120 | Int32 | DS window limit: 1 to 1440 | 1.204 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnablePlanetaryEncounters` | Enable Planetary Encounters | Installations and wrecks that spawn on planet surfaces near players. Also affects NPC faction and station generation. | NPCs | true | Boolean | true / false | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlanetaryEncounterTimerFirst` | Installations Timer First [mins] | Minutes until the first planetary encounter for a player-host (1-240). Does nothing on dedicated servers. | NPCs | 5 | Single | DS window limit: 1 to 240 | 1.206 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlanetaryEncounterTimerMin` | Installations Timer Min [mins] | Shortest wait (minutes) between planetary encounters, per player (1-240). | NPCs | 15 | Single | DS window limit: 1 to 240 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlanetaryEncounterTimerMax` | Installations Timer Max [mins] | Longest wait (minutes) between planetary encounters, per player (1-240). | NPCs | 30 | Single | DS window limit: 1 to 240 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlanetaryEncounterDesiredSpawnRange` | Desired spawn distance [m] | Distance (metres) around each player where planetary encounters may spawn; players higher above ground than this are skipped (1000-15000). | NPCs | 6000 | Int32 | DS window limit: 1000 to 15000 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlanetaryEncounterAreaLockdownRange` | Existing installations allowed [m] | New planetary encounters will not spawn within about this many metres of existing ones (1000-120000). | NPCs | 10000 | Int32 | DS window limit: 1000 to 120000 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlanetaryEncounterExistingStructuresRange` | Existing structures allowed [m] | New planetary encounters will not spawn within this many metres of other static grids (1000-10000). | NPCs | 7000 | Int32 | DS window limit: 1000 to 10000 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlanetaryEncounterPresenceRange` | Presence distance [m] | Encounters farther than this (metres) from every player are put in storage (removed from the world) and come back when someone returns (3000-120000). | NPCs | 20000 | Int32 | DS window limit: 3000 to 120000 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlanetaryEncounterDespawnTimeout` | Installations despawn timeout [mins] | Minutes a planetary encounter lasts before being permanently removed (5-1440). | NPCs | 120 | Single | DS window limit: 5 to 1440 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GlobalEncounterCap` | Global Encounter Cap | Most big global encounters active at once (0-5). 0 = off. Also affects NPC faction and station generation. | NPCs | 1 | Int32 | DS window limit: 0 to 5 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GlobalEncounterEnableRemovalTimer` | Global Encounter Enable Removal | Global encounters are removed automatically after a timer. | NPCs | true | Boolean | true / false | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GlobalEncounterMinRemovalTimer` | Removal Timer Min [mins] | Shortest time (minutes) before a global encounter is removed (20-1440). | NPCs | 90 | Int32 | DS window limit: 20 to 1440 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GlobalEncounterMaxRemovalTimer` | Removal Timer Max [mins] | Longest time (minutes) before a global encounter is removed (21-1440). | NPCs | 180 | Int32 | DS window limit: 21 to 1440 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GlobalEncounterRemovalTimeClock` | Removal Time Clock [mins] | Show the remaining time on the encounter's GPS marker when this many minutes or fewer remain (15-60). | NPCs | 30 | Int32 | DS window limit: 15 to 60 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GlobalEncounterPCU` | Global Encounter PCU | PCU budget just for global encounters. | NPCs | 25000 | Int32 | DS window limit: 0 to 2147483647 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GlobalEncounterTimer` | Global Encounter Timer [min] | A global encounter spawns every this many minutes (1-1440). | NPCs | 15 | Int32 | DS window limit: 1 to 1440 | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableOrca` | Enable ORCA | Better collision avoidance (ORCA) for autopilot blocks. | NPCs | true | Boolean | true / false | 1.202 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### Others

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `GridStorageMaxPerPlayer` | Max Stored Grids | How many ships or vehicles each player can keep in storage via the Services Terminal (0-100). 0 turns grid storage off. | Others | 100 | Int32 | DS window limit: 0 to 100 | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GridStorageAllowsInventory` | Allow Items in Stored Grids | Stored grids may keep their cargo. If off, players are asked first and the items drop in a Temporary Container. | Others | false | Boolean | true / false | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GridStorageMinutesPerPCU` | Minutes Per PCU | Extra minutes of retrieval time per PCU of the stored ship (0-100). See GridStorageRetrievalTimeMinMinutes for the real formula. | Others | 0.001 | Single | DS window limit: 0 to 100 | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GridStorageRetrievalTimeMinMinutes` | Min Retrieval Time | Base minutes to retrieve a stored grid (0-100). Actual time = (this + MinutesPerPCU x ship PCU) / RetrievalTimeMultiplier, capped by the max retrieval time. | Others | 2 | Single | DS window limit: 0 to 100 | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GridStorageRetrievalTimeMultiplier` | Grid Storage Retrieval Time | Divides retrieval time: larger = faster retrieval, 0 = instant (0-10). | Others | 1 | Single | DS window limit: 0 to 10 | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GridStorageRetrievalTimeMaxMinutes` | Max Retrieval Time | Retrieval time can never exceed this many minutes (0-1440). | Others | 30 | Single | DS window limit: 0 to 1440 | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GridStorageQueueLimit` | Grid Storage Queue Limit | Most Services Terminal retrieval orders per player at once. Keep at 1: the screen only shows one. (Not shown in the Dedicated Server window.) | Others | 1 | Int32 |  | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GridStorageExpediteCostPerSecond` | Expedite Cost | Credits charged per remaining second when a player expedites a retrieval (0-100000). 0 = free. | Others | 1000 | Single | DS window limit: 0 to 100000 | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GridStorageExpediteFactor` | Expedite Factor | Remaining retrieval time is multiplied by this when expedited (0-1). | Others | 0.5 | Single | DS window limit: 0 to 1 | 1.209 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `AdaptiveSimulationQuality` | Adaptive Simulation Quality | When the server CPU stays over 90 percent busy, temporarily turns off some detail (block deformation, some voxel cutouts, ragdoll, etc.). Players see a warning when it kicks in. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `AutoSaveInMinutes` | Autosave Interval [mins] | Minutes between automatic saves. 0 turns auto-save off (the code treats AutoSave as on when this is above 0). | Others | 5 | UInt32 | DS window limit: 0 to 4294967295 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableContainerDrops` | Enable Drop Containers | Unknown Signals (drop containers) spawn for players. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableConvertToStation` | Enable Convert to Station | Lets players turn a ship into a static station. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableGoodBotHints` | Enable Good.bot Hints | Good.bot tutorial hints (does not override a player who turned hints off). | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableRemoteBlockRemoval` | Enable Remote Grid Removal | Lets a grid's author remove it remotely from the world. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableResearch` | Enable Progression | Progression: blocks must be unlocked through research. | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableRespawnShips` | Enable Respawn Ships | Respawn ships (and carts) are available to spawn in. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSaving` | Enable Saving from Menu | Whether the player hosting the world can save from the Esc menu. Multiplayer clients never see that option; admins can use /save. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableScripterRole` | Enable Scripter Role | Adds a Scripter permission level; only Scripters or higher can use Edit on the Programmable Block. | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSelectivePhysicsUpdates` | Enable Selective Physics Updates | Dedicated servers only. On: physics is paused for far-away grids that no player is near (their block logic still runs), which saves CPU. Off: when overloaded, the server lowers collision quality for recently colliding grids instead. | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableVoxelHand` | Enable Voxel Hand | Lets admins in Survival (with Creative Tools), or anyone in Creative, use the Voxel Hand. | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `GameMode` | Game Mode | Creative: everyone builds instantly with no components, no ammo or fuel needed (blocks still need power). Survival: normal resource gameplay. | Others | Creative | MyGameModeEnum | Dropdown: Creative=Creative; Survival=Survival; other values: not accepted (enum) |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `InfiniteAmmo` | Enable Infinite Ammunition in Survival | Weapons need no ammunition in Survival. | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxBackupSaves` | Max Backup Saves | How many backup saves to keep (0-1000). A backup is made on every manual save and auto-save. | Others | 5 | Int16 | DS window limit: 0 to 1000 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MinDropContainerRespawnTime` | Min Drop Container Respawn Time | Shortest minutes between Unknown Signal spawns, per player (0-100). | Others | 5 | Int32 | DS window limit: 0 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxDropContainerRespawnTime` | Max Drop Container Respawn Time | Longest minutes between Unknown Signal spawns, per player (0-100). | Others | 20 | Int32 | DS window limit: 0 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxHudChatMessageCount` | Max messages in HUD chat | Most messages kept in the HUD chat. | Others | 100 | Int32 |  | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxPlanets` | Max Planet Types | Most different planet types the world can have (0-99). | Others | 99 | Int32 | DS window limit: 0 to 99 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxProductionQueueLength` | Max Production Queue Length | Longest assembler queue (0-99999). Long queues of stacks with no materials can cause lag. | Others | 50 | Int32 | DS window limit: 0 to 99999 | 1.202 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `OffensiveWordsFiltering` | Offensive Words Filtering | Filters offensive words from text players type. | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PredefinedAsteroids` | Enable Predefined Asteroids | Include the premade asteroids (disabled on consoles to save memory). | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `RespawnShipDelete` | Remove Respawn Ships on Logoff | A player's respawn ship is removed when they log out. | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ThrusterDamage` | Enable Thruster Damage | Thruster flames damage blocks and characters. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `WeaponsEnabled` | Enable Weapons | If off, nobody can fire hand or block weapons and warheads cannot detonate. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `UseConsolePCU` | Use Console PCU | Uses console PCU values: all deformable armor is forced to 2 PCU and mods cannot override it. Forced on for console-compatible worlds. | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableMatchComponent` | Enable Match | Turns on the match system used by PvP scenarios (pre-match, match, post-match phases). | Others | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableTeamScoreCounters` | Enable Team Score Counters | Show team scores at the top of the screen. Needs Enable Match. | Others | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PreMatchDuration` | PreMatch Duration | Length of the pre-match phase (0-60000). Needs Enable Match. The wiki does not state the unit (UNVERIFIED). | Others | 0 | Single | DS window limit: 0 to 60000 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MatchDuration` | Match Duration | Length of the match phase (0-60000). Needs Enable Match. The wiki does not state the unit (UNVERIFIED). | Others | 0 | Single | DS window limit: 0 to 60000 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PostMatchDuration` | PostMatch Duration | Length of the post-match phase (0-60000). Needs Enable Match. The wiki does not state the unit (UNVERIFIED). | Others | 0 | Single | DS window limit: 0 to 60000 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### Players

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `AutoHealing` | Auto Healing | Players slowly regain health (up to 70 hp) while in air that is at least 75 percent oxygen (planets or sealed ships). Needs Enable Oxygen. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `BackpackDespawnTimer` | Backpack Despawn Time | Minutes before a dropped backpack is removed (0-10). | Players | 5 | Single | DS window limit: 0 to 10 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `BlueprintShare` | Enable Blueprint Share | Players can send local blueprints to another player on the server (F10 menu). | Players | true | Boolean | true / false | 1.203 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `BlueprintShareTimeout` | Share Blueprint Timeout | Wait before a player can send another blueprint. The wiki does not state the unit (UNVERIFIED). | Players | 30 | Int32 |  | 1.203 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `CharacterSpeedMultiplier` | Character Speed Multiplier | Walk and run speed multiplier for characters and NPCs (0.75-1 in the window). Jetpack flight is unaffected. | Players | 1 | Single | DS window limit: 0.75 to 1 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `Enable3rdPersonView` | Enable 3rd Person Camera | Allows the third-person camera. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableAutorespawn` | Enable Autorespawn | Players automatically respawn at the nearest available respawn point. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableBountyContracts` | Enable Bounty Contracts | Bounty contracts (PvP and PvE) available at stations. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableCopyPaste` | Enable Copy & Paste | Copy and paste of builds; only usable in Creative Mode or with Creative Tools. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableFactionPlayerNames` | Enable Faction Player Names | Shows faction-mates' names over their heads when their personal broadcast is off. (Not shown in the Dedicated Server window.) | Players | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableGamepadAimAssist` | Enable Gamepad Aim Assist | Aim assist for gamepad players. | Players | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableJetpack` | Enable Jetpack | Players can use their suit jetpack. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnablePcuTrading` | Enable PCU Trading | Players or factions can trade PCU, depending on the PCU setting. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableRecoil` | Enable Weapon Recoil | Recoil on hand-held weapons. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSpaceSuitRespawn` | Enable Space Suit Respawn | Players can respawn in just a space suit from the respawn screen. | Players | true | Boolean | true / false | 1.202 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableToolShake` | Enable Tool Shake | Ship drills and grinders push the ship while working (camera shake always happens). | Players | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnvironmentDamageMultiplier` | Environment Damage Multiplier | Multiplier for environmental damage to characters and bots (0-2). | Players | 1 | Single | DS window limit: 0 to 2 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `FamilySharing` | Enable Family Sharing | Allow players who have the game through Steam Family Sharing to join. Only works with Steam networking (not EOS). | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxPlayers` | Max Players | Most players at once (2-64 in the window; the game caps player-hosted worlds at 8). | Players | 4 | Int16 | DS window limit: 2 to 64 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `OptimalSpawnDistance` | Optimal Respawn Distance | Preferred distance (metres) between a newly spawned player and other players. | Players | 16000 | Single |  |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ShowPlayerNamesOnHud` | Show Player Names on HUD | Show player names on the HUD. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `SpawnShipTimeMultiplier` | Respawn Ship Time Multiplier | Multiplier for the respawn-ship cooldown (0-100). The wiki default of 0 only applies to worlds missing the setting. | Players | 0 | Single | DS window limit: 0 to 100 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `SpawnWithTools` | Spawn with Tools | Players start with tools in their inventory. | Players | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSurvivalBuffs` | Enable Survival Buffs | Buffs that players earn over time; lost on respawn. | Players | true | Boolean | true / false | 1.207 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableReducedStatsOnRespawn` | Enable Reduced Stats | Respawned characters start with reduced health, oxygen, hydrogen, food and suit battery (20 percent in vanilla). | Players | true | Boolean | true / false | 1.207 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### PvP

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `EnableFactionVoiceChat` | Enable Faction Voice Chat | Faction voice chat without needing antennas or broadcasting. | PvP | false | Boolean | true / false | 1.202 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableFriendlyFire` | Enable Friendly Fire | If off, characters cannot be hurt by friends' hand weapons or hand tools. | PvP | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableTeamBalancing` | Enable Team Balancing | New players automatically join the faction with the fewest members. | PvP | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnemyTargetIndicatorDistance` | Enemy Target Indicator Distance [m] | Max distance (metres) at which an enemy indicator shows when aiming at a character (0-1000). | PvP | 20 | Single | DS window limit: 0 to 1000 | 1.203 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MatchRestartWhenEmptyTime` | Match Restart When Empty | Restarts the server this many minutes after a match started and the server is empty (0 = off, up to 1440). PvP scenarios only; needs Enable Match. | PvP | 0 | Int32 | DS window limit: 0 to 1440 | 1.202 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### Trash Removal

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `AFKTimeountMin` | AFK Timeout | Minutes of inactivity before a player is kicked; 0 = off. (The element name really is spelled Timeount.) | Trash Removal | 0 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `BlockCountThreshold` | Block Count Threshold | Grids with more blocks than this are caught by trash removal when the block-count flag is on. | Trash Removal | 20 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `OptimalGridCount` | Optimal Grid Count | If above 0, the server tries to keep about this many grids by removing more aggressively when over. It then ignores several trash flags and the block count threshold. 0 = off. | Trash Removal | 0 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlayerCharacterRemovalThreshold` | Character Removal Threshold [mins] | Minutes after a player disconnects before their character is removed; 0 = off. | Trash Removal | 15 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlayerDistanceThreshold` | Player Distance Threshold [m] | Trash removal only touches grids farther than this many metres from players (when the distance flag is on). | Trash Removal | 500 | Single |  |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PlayerInactivityThreshold` | Player Inactivity Threshold [hours] | Hours after a player's last logout before ALL their grids are removed; 0 = off. | Trash Removal | 0 | Single |  |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `RemoveOldIdentitiesH` | Remove Old Identities (h) | Hours of inactivity after which identities that own no grids are removed; 0 = off. | Trash Removal | 0 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `StopGridsPeriodMin` | Stop Grids Period (m) | Minutes after which grids far from players are stopped (frozen in place); 0 = off. | Trash Removal | 15 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `TrashFlagsValue` | Trash Removal Flags | Which kinds of grid and voxel cleanup are active, as one combined number. Add the flags: 1 Fixed, 2 Stationary, 8 Linear, 16 Accelerating, 32 Powered, 64 Controlled, 128 WithProduction, 256 WithMedBay, 512 WithBlockCount, 1024 DistanceFromPlayer, 2048 RevertMaterials, 4096 RevertAsteroids, 8192 RevertWithFloatingsPresent, 32768 RevertBoulders, 65536 RevertCloseToNPCGrids. Default 7706 = 2+8+16+512+1024+2048+4096. | Trash Removal | 7706 | Int32 | Sum of flag numbers (see description); DS window uses checkboxes |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableTrashSettingsPlatformOverride` | Platform Trash Setting Override | Lets console-specific trash settings override yours. The wiki says it seems to do nothing on PC and dedicated servers. | Trash Removal | true | Boolean | true / false | 1.203 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `TrashRemovalEnabled` | Trash Removal Enabled | Turns on automatic grid cleanup. Which grids are removed depends on TrashFlagsValue. | Trash Removal | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `VoxelTrashRemovalEnabled` | Voxel Reverting Enabled | Turns on resetting (reverting) edited asteroid and terrain voxels. Needs the revert flags in TrashFlagsValue. | Trash Removal | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `VoxelAgeThreshold` | Voxel Age (min) | Minutes since a voxel chunk was last changed before it may be reverted. | Trash Removal | 24 | Int32 | DS window limit: 0 to 2147483647 |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `VoxelGridDistanceThreshold` | Distance Voxel from Grid (m) | Only voxel chunks farther than this many metres from any grid are reverted. | Trash Removal | 5000 | Single |  |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `VoxelPlayerDistanceThreshold` | Distance Voxel from Player (m) | Only voxel chunks farther than this many metres from players are reverted. | Trash Removal | 5000 | Single |  |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ResetForageableItems` | Reset forageable items | Forageable items (things you can pick up from the environment) reset after a while. | Trash Removal | true | Boolean | true / false | 1.207 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ResetForageableItemsDistance` | Reset forageable items distance (m) | Minimum distance (metres) from a player for forageable items to reset (1-999999). | Trash Removal | 3000 | Int32 | DS window limit: 1 to 999999 | 1.207 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ResetForageableItemsTimeM` | Reset forageable items time (min) | Minutes after which forageable items reset (1-999999). | Trash Removal | 30 | Int32 | DS window limit: 1 to 999999 | 1.207 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### Experimental

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `ExperimentalMode` | Experimental Mode | Forces Experimental Mode on (false just means not forced). The game turns it on by itself for experimental settings, plugins or weak hardware; the reasons are in the log under 'Experimental mode reason'. (Not shown in the Dedicated Server window.) | Experimental | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableIngameScripts` | Enable Ingame Scripts | Programmable Block scripts can run. | Experimental | true | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSubgridDamage` | Enable Sub-Grid Damage | If off, no collision damage between grids joined by rotors, hinges, pistons, connectors, landing gear, etc. | Experimental | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSpectator` | Enable Spectator Camera | All players can use the spectator camera (F6-F9). Spectator is still allowed in Creative or with admin Creative Tools. | Experimental | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableSupergridding` | Enable Supergridding | Allows blocks on the wrong grid size (via edited blueprints), for compact or clipping builds. | Experimental | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `StationVoxelSupport` | Unsupported Stations | Called Unsupported Stations in the window: grids no longer turn dynamic (movable) when disconnected from static grids. | Experimental | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `PermanentDeath` | Permanent Death | Players who respawn from a respawn ship become a new identity and lose ownership of what they had. Nullable boolean in the file. | Experimental | false | Nullable<Boolean> | true / false (nullable) |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `ResetOwnership` | Reset Ownership | On world load, sets every grid's owner to Nobody (no sharing), then switches itself back off. | Experimental | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableShareInertiaTensor` | Enable Share Inertia Tensor | Lets mechanical blocks use the Share Inertia Tensor toggle. | Experimental | false | Boolean | true / false | 1.206 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableUnsafeRotorTorques` | Enable Unsafe Rotor Torques | Lets rotor and hinge torque sliders go past the safe values (shown red). Off caps them. | Experimental | false | Boolean | true / false | 1.206 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EnableUnsafePistonImpulses` | Enable Unsafe Piston Impulses | Lets piston impulse sliders go past the safe values (shown red). Off caps them. | Experimental | false | Boolean | true / false | 1.206 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### Uncategorized

| key | label | description | group | default | type | allowed values / range | since | source |
|---|---|---|---|---|---|---|---|---|
| `OnlineMode` | Online Mode | Who can join. OFFLINE = no multiplayer; PUBLIC = anyone, listed in the server list; FRIENDS = host's friends only; PRIVATE = invited players only. The wiki recommends PUBLIC for dedicated servers. (Not shown in the Dedicated Server window.) | Uncategorized | OFFLINE | MyOnlineModeEnum | Dropdown: OFFLINE=Offline; PUBLIC=Public; FRIENDS=Friends only; PRIVATE=Invite only; other values: not accepted (enum) |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `EncounterGeneratorVersion` | Encounter Generator Version | Which version of the encounter generator the world uses. Do not change on an existing world. (Not shown in the Dedicated Server window.) | Uncategorized | 6 | Int32 |  | 1.205 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `MaxDrones` | Max Drones | Global limit for drones launched by NPC antennas at the same time. (Not shown in the Dedicated Server window.) | Uncategorized | 5 | Int32 |  |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `SimplifiedSimulation` | Simplified Simulation | Resources, inventories and ammo are not properly used up. Not recommended for Survival. (Not shown in the Dedicated Server window.) | Uncategorized | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `StartInRespawnScreen` | Start In Respawn Screen | The wiki gives no description. By name, players start at the respawn screen (UNVERIFIED). (Not shown in the Dedicated Server window.) | Uncategorized | false | Boolean | true / false |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `SuppressedWarnings` | Suppressed Warnings | Hides listed warnings from the red pop-up box (not from the Shift+F1 menu). A list of <Warning> entries holding the message's localization ID, e.g. PerformanceWarningHeading_ExperimentalMode or PerformanceWarningHeading_UnsafeGrids. (Not shown in the Dedicated Server window.) | Uncategorized | 0 entries | List<String> | list of <Warning> strings |  | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `UpdateRespawnDictionary` | Update Respawn Dictionary | Lets visual scripts (scenarios) call GetPlayerRespawnPoints(). Rarely useful. (Not shown in the Dedicated Server window.) | Uncategorized | false | Boolean | true / false | 1.203 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |
| `RandomizeSeed` | Randomize Seed | When on, picks a new random ProceduralSeed on load and then switches itself back off. Do not use on existing worlds. (Not shown in the Dedicated Server window.) | Uncategorized | false | Boolean | true / false | 1.208 | https://spaceengineers.wiki.gg/wiki/Modding/Reference/Saves/SessionSettings |

#### Obsolete elements (exist in code or vanilla files but do nothing; SS)
`CanJoinRunning` (Boolean, false, not used), `EnableStructuralSimulation` (Boolean, false, Medieval Engineers only, removed in 207), `FloraDensityMultiplier` (Single, 1, not used), `MaxActiveFracturePieces` (Int32, 50, Medieval Engineers only, removed in 207), `Scenario` (Boolean, false, not used), `ScenarioEditMode` (Boolean, false, not used). Do not show these in the settings form. The 2022 source also had `EnableFlora` and `FloraDensity`; they are absent from the 2026 wiki page and must be treated as gone (UNVERIFIED whether the game still reads them).

## 5. Notes for the panel

- Booleans in XML are lowercase `true`/`false`. Floats use `.` as decimal separator (invariant culture; standard .NET XmlSerializer, not sourced).
- Dropdown enums (panel `choices`, `allowCustom:false`): GameMode (Creative, Survival), OnlineMode (OFFLINE, PUBLIC, FRIENDS, PRIVATE), EnvironmentHostility (SAFE, NORMAL, CATACLYSM, CATACLYSM_UNREAL), BlockLimitsEnabled (NONE, GLOBALLY, PER_FACTION, PER_PLAYER), LimitBlocksBy (BlockPairName, Tag), NetworkType (steam, eos?).
- Suggested short list for a first form (hobbyist hosting for friends): GameMode, MaxPlayers, OnlineMode, EnvironmentHostility, InventorySizeMultiplier, BlocksInventorySizeMultiplier, Assembler/Refinery/Welder/Grinder multipliers, AutoSaveInMinutes, MaxBackupSaves, EnableOxygen, EnableOxygenPressurization, EnableIngameScripts, WeaponsEnabled, EnableCopyPaste, PermanentDeath, EnableSpiders/Wolfs, CargoShipsEnabled, EnableEncounters, EnableDrones, EnableEconomy, BlockLimitsEnabled + TotalPCU + MaxGridSize + MaxBlocksPerPlayer, SyncDistance, ViewDistance, TrashRemovalEnabled, EnableSunRotation + SunRotationIntervalMinutes, WorldSizeKm, ProceduralDensity (new worlds only), ProceduralSeed (new worlds only).
- Settings that must NOT be changed on an existing world (SS warnings): ProceduralSeed, VoxelGeneratorVersion, EncounterGeneratorVersion, RandomizeSeed, ProceduralDensity (not stated by SS; changing generation inputs on a live world is risky, UNVERIFIED).
- Settings that need the server stopped: the game rewrites config on shutdown (XG, LOW), so the panel should write only while stopped.
- The panel owns (and the form should hide or lock): `ServerPort`, `SteamPort`, `IP`, `ServerName`, `WorldName`, `ServerPasswordHash/Salt`, `LoadWorld`, `RemoteApi*` (and `-path`, `-ip`, `-port`, `-maxPlayers` launch arguments override cfg values, see 03-launch-args.md).
- First-start sequence suggested by the sources (SRC startup logic): create the data folder, write a `SpaceEngineers-Dedicated.cfg` with at least ServerName, WorldName, ports, IP, Administrators, IgnoreLastSession (true on first creation), `<SessionSettings>` with the chosen rules; start with `-console -path <data>`; the server creates `Saves\<WorldName>\` with `Sandbox_config.sbc` and `Sandbox.sbc`. After that, rule changes go into `Sandbox_config.sbc`. Not run on a real install (research only), so this sequence is UNVERIFIED end to end.

## 6. UNVERIFIED list
1. Exact server build/version the facts apply to; SS says settings through SE v1.209 exist and the page was edited 2026-06-22.
2. Whether a headless `-console` start with no cfg creates `SpaceEngineers-Dedicated.cfg` (2022 code does not write it on load).
3. Root element name and xmlns of `Sandbox_config.sbc` (`MyObjectBuilder_WorldConfiguration` assumed from the wiki page title and one hosting guide snippet) and of `Sandbox.sbc` (`MyObjectBuilder_Checkpoint` assumed from the 2022 class name); direct-child placement of `Settings`/`Mods`/`SessionName`.
4. Whether the cfg `<SessionSettings>` block needs or accepts `xsi:type`, and whether it still seeds new worlds in the current build (2022 code and LOW say yes).
5. Whether the cfg still honors `<Mods>` (old: list of ulong ids; hosting guides show `<ModItem>` in cfg; current wiki says edit the world's file). Which file wins for an existing world is only established by wiki text on precedence (Sandbox_config.sbc > Sandbox.sbc) and hosting-guide statements.
6. Element order sensitivity of the cfg and the sbc files.
7. Password hash/salt algorithm (third-party generators exist; no official description).
8. Meanings and units of: all Maintenance elements (AutoRestart*, Watcher*, AutoUpdate*), chat anti-spam timings, SteamPort role, CrossPlatform, DedicatedId, AsteroidAmount in current builds, NetworkType accepted strings, RemoteSecurityKey format.
9. Default of RemoteApiEnabled (CD says true, XG says disabled) and any other default taken from a hosting guide (none used in tables except where flagged).
10. Units of PreMatchDuration, MatchDuration, PostMatchDuration, BlueprintShareTimeout; direction of effect of DepositSizeDenominator; what StartInRespawnScreen does.
11. Whether `EnableFlora` and `FloraDensity` (2022 source) are still read.
12. Ranges: "DS window limit" values come from SS; the XML accepts other values but those are officially unsupported (SETUP).

## 7. Settings found but not confidently explainable
`AutoRestartEnabled`, `AutoRestatTimeInMin`, `AutoRestartSave`, `WatcherInterval`, `WatcherSimulationSpeedMinimum`, `AutoUpdateEnabled`, `AutoUpdateCheckIntervalInMin`, `AutoUpdateRestartDelayInMin`, `AutoUpdateSteamBranch`, `AutoUpdateBranchPassword`, `SameMessageTimeout`, `SpamMessagesTime`, `SpamMessagesTimeout`, `SteamPort` (role), `CrossPlatform`, `DedicatedId`, `AsteroidAmount` (current use), `NetworkType`, `RemoteSecurityKey` (format), `ServerPasswordHash`/`ServerPasswordSalt` (algorithm), `StartInRespawnScreen`, `DepositSizeDenominator` (direction), `PreMatchDuration`, `MatchDuration`, `PostMatchDuration`, `BlueprintShareTimeout`.

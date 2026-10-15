<!-- Generated from the help text in the interface (ui/src/help). Edit it there, then run `npm run build:guides`. -->

# Launch arguments guide

Many game servers are set up, wholly or partly, by arguments on the command that starts them. This page explains the arguments GodlyPanel knows about, game by game. It is what the **All launch arguments** list on a server's Settings tab links to.

A server is started by a small script, a `.bat` file, in the server's folder. One line of it runs the game's program, followed by its arguments, for example `valheim_server.exe -nographics -batchmode -port 2456`. A flag starting with `-` or `+` is an argument; some take a value after them (`-port 2456`, `-Port=7777`, `+server.maxplayers 50`), others stand alone (`-batchmode`).

For the games marked as editable, the **Launch options** form on the server's Settings tab reads that one line and writes your changes back into it. Nothing else in the script is touched, and leaving a box empty takes the argument off the line. Changes apply the next time the server starts. For every other game, or for an argument the form does not offer, use **Edit Batch Files** on the server's page.

Some arguments are put on the line by GodlyPanel when it creates the server (ports, folders, the log file, the remote console). They are marked below. Change a port from the server's **Ports** section rather than here, so the panel can check for clashes and open the right firewall rules.

Settings that live in a game's own settings file are in the [game settings guide](GAME_SETTINGS.md).

## Contents

- [Valheim](#valheim)
- [Rust](#rust)
- [Core Keeper](#core-keeper)
- [Satisfactory](#satisfactory)
- [7 Days to Die](#7-days-to-die)
- [V Rising](#v-rising)
- [Sons of the Forest](#sons-of-the-forest)
- [Project Zomboid](#project-zomboid)
- [ARK: Survival Ascended / Evolved](#ark-survival-ascended--evolved)
- [Conan Exiles](#conan-exiles)
- [Palworld](#palworld)
- [Minecraft (Java)](#minecraft-java)
- [Abiotic Factor](#abiotic-factor)
- [Don't Starve Together](#dont-starve-together)
- [Icarus](#icarus)
- [SCUM](#scum)
- [StarRupture](#starrupture)
- [Soulmask](#soulmask)
- [Garry's Mod](#garrys-mod)
- [Barotrauma](#barotrauma)
- [Necesse](#necesse)
- [Left 4 Dead 2](#left-4-dead-2)

## Valheim

Valheim has no settings file: a dedicated server is set up entirely by the arguments on the command that starts it. Changes apply the next time the server starts. These arguments are on the `valheim_server` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Valheim: `-nographics`

**No graphics** (Required). Runs without a graphics window. A dedicated server needs this, together with -batchmode.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Valheim: `-batchmode`

**Batch mode** (Required). Runs without a user interface so it can run in the background. A dedicated server needs this, together with -nographics.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Valheim: `-name`

**Server name** (Server). The name shown in the server list. The password can't be part of it.

Example: `-name "My Valheim"`

### Valheim: `-port`

**Game port** (Server). The UDP port players connect to. The game also uses the next two ports, so keep 2456 to 2458 free. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 2456`

### Valheim: `-world`

**World name** (Server). Which world file to load or create. A new name makes a new world; the old one is kept.

Example: `-world "Dedicated"`

### Valheim: `-password`

**Password** (Server). What players type to join. At least 5 characters, and it can't be part of the server name. Valheim refuses to list a public server without one.

Example: `-password "secret"`

### Valheim: `-public`

**Listed publicly** (Server). Whether the server appears in Valheim's server browser. Without this argument the default is 1 (listed).

Values: `1` (Listed in the server browser), `0` (Not listed (join by IP or code)).

Example: `-public 1`

### `-crossplay`

**Crossplay** (Server). Lets Xbox and Microsoft Store players join through PlayFab. Changes which ports are used for joining.

### `-savedir`

**Save folder** (Saves and logs). Where worlds and the admin, ban and permitted lists are kept. Without it they go in the Windows user's profile, shared with every other Valheim server on this PC.

Example: `-savedir "D:\Valheim\saves"`

### Valheim: `-logFile`

**Log file** (Saves and logs). Where the server writes its log. The Logs tab reads this file, and the panel needs it to show who is connected, because Valheim's server query reports players without names.

Example: `-logFile "valheim_server.log"`

### `-saveinterval`

**Save every (seconds)** (Saves and logs). How often the world is saved. The default is 1800 (30 minutes).

Example: `-saveinterval 1800`

### `-backups`

**Automatic backups to keep** (Saves and logs). How many of the game's own automatic backups are kept. The default is 4.

Example: `-backups 4`

### `-backupshort`

**First backup after (seconds)** (Saves and logs). The time before the game's first automatic backup. The default is 7200 (2 hours).

Example: `-backupshort 7200`

### `-backuplong`

**Then a backup every (seconds)** (Saves and logs). The time between the game's later automatic backups. The default is 43200 (12 hours).

Example: `-backuplong 43200`

### `-instanceid`

**Instance ID** (Saves and logs). Tells two servers that share a save folder apart.

Example: `-instanceid server1`

### `-preset`

**Difficulty preset** (World modifiers). Applies a whole set of world modifiers at once. Individual modifiers (-modifier, -setkey) are applied after it.

Values: `normal` (Normal), `casual` (Casual), `easy` (Easy), `hard` (Hard), `hardcore` (Hardcore), `immersive` (Immersive), `hammer` (Hammer: build anywhere, no combat).

Example: `-preset hard`

### `-modifier combat`

**Combat** (World modifiers). How tough fights are. Written -modifier combat `<value>`. Leave it out for the default.

Values: `undefined`, `undefined`, `undefined`, `undefined`.

Example: `-modifier combat hard`

### `-modifier deathpenalty`

**Death penalty** (World modifiers). What a death costs. Written -modifier deathpenalty `<value>`. Leave it out for the default.

Values: `undefined`, `undefined`, `undefined`, `undefined`, `undefined`.

Example: `-modifier deathpenalty casual`

### `-modifier resources`

**Resources** (World modifiers). How much you get from gathering. Written -modifier resources `<value>`. Leave it out for the default.

Values: `undefined`, `undefined`, `undefined`, `undefined`, `undefined`.

Example: `-modifier resources more`

### `-modifier raids`

**Raids** (World modifiers). How often raids happen. Written -modifier raids `<value>`. Leave it out for the default.

Values: `undefined`, `undefined`, `undefined`, `undefined`, `undefined`.

Example: `-modifier raids less`

### `-modifier portals`

**Portals** (World modifiers). How restricted portals are: casual lets more through, hard and veryhard make them more restrictive. Written -modifier portals `<value>`. Leave it out for the default.

Values: `undefined`, `undefined`, `undefined`.

Example: `-modifier portals casual`

### `-setkey nobuildcost`

**No build cost** (World modifiers). Building is free. Written -setkey nobuildcost.

### `-setkey playerevents`

**Player-based events** (World modifiers). Raids depend on what players have done. Written -setkey playerevents.

### `-setkey passivemobs`

**Passive creatures** (World modifiers). Creatures don't attack. Written -setkey passivemobs.

### `-setkey nomap`

**No map** (World modifiers). The map doesn't show where you have been. Written -setkey nomap.

## Rust

Rust is set up with console variables ("convars"). Written as +name value on the launch line, they win over the same setting in `server\<identity>\cfg\server.cfg`. Changes apply the next time the server starts. These arguments are on the `RustDedicated.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Rust: `-batchmode`

**Batch mode** (Required). Runs without a user interface so it can run in the background.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Rust: `-nographics`

**No graphics** (Required). Runs without a graphics window.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Rust: `-logfile`

**Log file** (Saves and logs). Where the server writes its log. The Logs tab reads this file.

Example: `-logfile "rustserver.log"`

### `+server.hostname`

**Server name** (Server). The name shown in the in-game server browser.

Example: `+server.hostname "My Rust Server"`

### `+server.description`

**Description** (Server). The text under the name in the server browser. Write \n for a new line.

Example: `+server.description "Welcome!"`

### `+server.url`

**Website** (Server). A web address shown on the server's page in the browser.

Example: `+server.url "https://example.com"`

### `+server.headerimage`

**Banner image** (Server). The web address of a picture (512 by 256 pixels works best) shown at the top of the server's page.

Example: `+server.headerimage "https://example.com/banner.png"`

### `+server.maxplayers`

**Max players** (Server). The most players that can be on at once.

Example: `+server.maxplayers 50`

### `+server.identity`

**Identity (folder name)** (Server). The name of the folder under server\ that holds this server's world and settings. Changing it makes a fresh server in a new folder.

Example: `+server.identity "server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+server.pve`

**PvE** (Server). Stops players from damaging each other.

Values: `undefined`, `undefined`.

Example: `+server.pve true`

### `+server.ip`

**Bind address** (Network). The network address the server listens on. 0.0.0.0 means every address on this PC.

Example: `+server.ip 0.0.0.0`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+server.port`

**Game port** (Network). The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes.

Example: `+server.port 28015`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+server.queryport`

**Query port** (Network). The port the server list asks for details on (UDP).

Example: `+server.queryport 28017`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+rcon.ip`

**Remote console address** (Network). The address the remote console listens on. 127.0.0.1 keeps it to this PC, which is what GodlyPanel needs.

Example: `+rcon.ip 127.0.0.1`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+rcon.port`

**Remote console port** (Network). The port of the remote console (TCP). Only for the panel on this PC; never open it in your router.

Example: `+rcon.port 28018`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+rcon.password`

**Remote console password** (Network). The remote console's password. Change it from the server's Automation tab so the panel stays in step.

Example: `+rcon.password "…"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+rcon.web`

**Remote console type** (Network). 0 is the classic remote console GodlyPanel talks to; 1 is the WebSocket one.

Values: `0` (Classic (what GodlyPanel uses)), `1` (WebSocket).

Example: `+rcon.web 0`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+app.port`

**Rust+ app port** (Network). The port of the Rust+ phone app. -1 turns the app off.

Example: `+app.port -1`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+server.worldsize`

**Map size** (World). The size of the map in metres, from 1000 to 6000. Bigger maps take longer to make and use more memory.

Example: `+server.worldsize 3000`

### `+server.seed`

**Map seed** (World). A number that decides what the map looks like. The same seed and size always give the same map.

Example: `+server.seed 1337`

### `+server.level`

**Map type** (World). Procedural Map makes a new map from the seed and size; the others are the game's fixed maps.

Example: `+server.level "Procedural Map"`

### `+server.saveinterval`

**Save every (seconds)** (World). How often the world is saved on its own.

Example: `+server.saveinterval 300`

## Core Keeper

Core Keeper's dedicated server is set up by arguments on the command that starts it. Changes apply the next time the server starts. These arguments are on the `CoreKeeperServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Core Keeper: `-batchmode`

**Batch mode** (Required). Runs without a user interface so it can run in the background.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Core Keeper: `-logfile`

**Log file** (Saves and logs). Where the server writes its log. The Logs tab reads this file.

Example: `-logfile CoreKeeperServerLog.txt`

### `-datapath`

**Data folder** (Saves and logs). Where worlds and settings are kept. Without it they go in the Windows user's profile, shared with every other Core Keeper server on this PC.

Example: `-datapath "D:\CoreKeeper\data"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Core Keeper: `-port`

**Game port** (Server). The UDP port players connect to directly. Without a port the server is only reachable through Steam's relay with a game ID. Change it from the server's Ports section.

Example: `-port 27015`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-worldname`

**World name** (Server). The name players see for the world.

Example: `-worldname "My World"`

### Core Keeper: `-world`

**World slot** (Server). Which of the server's world slots to load (starting at 0).

Example: `-world 0`

### Core Keeper: `-password`

**Password** (Server). What players type to join. Leave it off for a server anyone can join.

Example: `-password "secret"`

### Core Keeper: `-maxplayers`

**Max players** (Server). The most players that can be on at once.

Example: `-maxplayers 8`

### `-worldseed`

**World seed** (World). Any text or number that decides what a new world looks like; the same seed always makes the same world. Leave it off for a random one.

Example: `-worldseed 0`

### `-worldmode`

**World mode** (World). How hard a new world is. It's chosen once, when the world is made.

Values: `0` (Normal), `1` (Hard). Other values are accepted too.

Example: `-worldmode 0`

### `-gameid`

**Game ID** (Server). A code players can join with through Steam's relay. It must be 28 letters and numbers (a code of another length is ignored and a random one is made). Leave it off to have one made.

Example: `-gameid ABCDEFGHJKLMNPQRSTUVWXYZ2345`

### `-season`

**Season** (World). Forces a seasonal event to be on, by number. Leave it off for the current date's season.

Example: `-season 0`

### Core Keeper: `-ip`

**Bind address** (Network). The network address the server listens on. Leave it off to use every address.

Example: `-ip 0.0.0.0`

## Satisfactory

Satisfactory's server is set up from inside the game (the Server Manager screen, with the server's address and port) and by a few launch arguments. Changes apply the next time the server starts. These arguments are on the `FactoryServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Satisfactory: `-Port`

**Game port** (Network). The port players connect to, both UDP and TCP. Change it from the server's Ports section so the panel can check for clashes.

Example: `-Port=7777`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-ReliablePort`

**Reliable messaging port** (Network). The TCP port the game uses for messages that must arrive. Change it from the server's Ports section.

Example: `-ReliablePort=8888`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Satisfactory: `-multihome`

**Bind address** (Network). The network address the server listens on, for a PC with more than one. Leave it off to use them all.

Example: `-multihome=192.168.1.20`

### `-ServerQueryPort`

**Query port** (Network). The port the server's status is asked for on. Leave it off for the game's default.

Example: `-ServerQueryPort=15777`

### `-BeaconPort`

**Beacon port** (Network). The port the game uses to find the server on a network. Leave it off for the game's default.

Example: `-BeaconPort=15000`

### Satisfactory: `-log`

**Write a log** (Saves and logs). Writes the server's log, which the Logs tab reads.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-unattended`

**Unattended** (Required). Runs without asking anything, so it can run in the background.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## 7 Days to Die

Almost everything about a 7 Days to Die server is in `serverconfig.xml` (see the Settings tab). The launch line only says where that file is, where the saves go and how the program runs. Changes apply the next time the server starts. These arguments are on the `7DaysToDieServer` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `-configfile`

**Settings file** (Files). The settings file to read. The panel's Settings tab edits this file.

Example: `-configfile=serverconfig.xml`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-UserDataFolder`

**Save folder** (Files). Where saves and generated worlds are kept. Without it they go in the Windows user's profile, shared with every other 7 Days to Die server on this PC.

Example: `-UserDataFolder=%~dp0userdata`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### 7 Days to Die: `-logfile`

**Log file** (Files). Where the server writes its log. The Logs tab reads this file.

Example: `-logfile "output_log.txt"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-dedicated`

**Dedicated server** (Required). Starts the game as a server rather than a client. Keep it on the line.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### 7 Days to Die: `-batchmode`

**Batch mode** (Required). Runs without a user interface so it can run in the background.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### 7 Days to Die: `-nographics`

**No graphics** (Required). Runs without a graphics window.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-quit`

**Quit when done** (Required). Makes the launcher close once the server is running.

Not offered in the Launch options form; the panel sets it and it is best left alone.

## V Rising

V Rising's settings are in `ServerHostSettings.json` (the Settings tab); a few arguments on the launch line say where its data goes and override the name and save. Changes apply the next time the server starts. These arguments are on the `VRisingServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `-persistentDataPath`

**Data folder** (Files). Where saves and the settings files are kept. The panel keeps it inside the server's own folder.

Example: `-persistentDataPath ".\save-data"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### V Rising: `-serverName`

**Server name** (Server). The name shown in the server list. It overrides the name in the settings file.

Example: `-serverName "My V Rising"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-saveName`

**Save name** (Server). The save folder to use. A new name starts a new world; the old one is kept.

Example: `-saveName "world1"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### V Rising: `-logFile`

**Log file** (Files). Where the server writes its log. The Logs tab reads this file.

Example: `-logFile ".\logs\VRisingServer.log"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Sons of the Forest

Sons of the Forest is set up in `userdata\dedicatedserver.cfg` (the Settings tab). The launch line only says where that data lives and how the program runs. Changes apply the next time the server starts. These arguments are on the `SonsOfTheForestDS.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `-userdatapath`

**Data folder** (Files). Where settings, saves and logs are kept. The panel keeps it inside the server's own folder so two servers don't share them.

Example: `-userdatapath "%~dp0userdata"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Sons of the Forest: `-batchmode`

**Batch mode** (Required). Runs without a user interface so it can run in the background.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Sons of the Forest: `-nographics`

**No graphics** (Required). Runs without a graphics window.

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Project Zomboid

Project Zomboid runs on Java, so the memory it may use is set here, along with where its data goes and the admin password. The server's own options are in `<name>.ini` (the Settings tab). Changes apply the next time the server starts. These arguments are on the `java.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Project Zomboid: `-Xms`

**Starting memory** (Memory). How much memory Java takes when the server starts. Use a number and g for gigabytes (4g). Setting it equal to the maximum avoids pauses while Java grows.

Example: `-Xms4g`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Project Zomboid: `-Xmx`

**Maximum memory** (Memory). The most memory Java may use. More players and mods need more; 4g to 8g suits most servers. Never more than the PC has free.

Example: `-Xmx4g`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Project Zomboid: `-servername`

**Settings name** (Server). Which settings file to use: servertest means Server\servertest.ini. It also names the world's save folder.

Example: `-servername servertest`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Project Zomboid: `-adminpassword`

**Admin password** (Server). The password of the built-in admin account. Used the first time the server runs to make that account.

Example: `-adminpassword "…"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-cachedir`

**Data folder** (Files). Where settings, saves and logs are kept. Without it they go in the Windows user's profile, shared with every other Zomboid server on this PC.

Example: `-cachedir="%~dp0zomboid"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Project Zomboid: `-port`

**Game port override** (Network). Overrides DefaultPort from the settings file. Leave it off and change the port from the server's Ports section.

Example: `-port 16261`

### `-udpport`

**Direct connection port override** (Network). Overrides UDPPort from the settings file.

Example: `-udpport 16262`

### Project Zomboid: `-ip`

**Bind address** (Network). The network address the server listens on. Leave it off to use every address.

Example: `-ip 0.0.0.0`

### `-steamvac`

**Valve Anti-Cheat** (Network). Overrides the SteamVAC setting from the settings file.

Values: `undefined`, `undefined`.

Example: `-steamvac true`

### `-statistic`

**Statistics interval** (Server). How often, in seconds, the server prints statistics to its log. 0 turns them off.

Example: `-statistic 0`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Project Zomboid: `-nosteam`

**Without Steam** (Server). Runs the server without Steam features. Players can't join through the Steam server list.

### `-debug`

**Debug mode** (Server). Prints extra detail to the log. Only for tracking down a problem.

## ARK: Survival Ascended / Evolved

ARK is set up mostly in `GameUserSettings.ini` and `Game.ini` (the Settings tab). The launch line starts with the map name followed by ?Option=value settings, then dash arguments. Both can be changed in the start script (Edit Batch Files); the panel doesn't offer a form for them. These arguments are on the `ArkAscendedServer.exe` (or `ShooterGameServer.exe`) line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### `<Map>?listen`

**Map and options** (Map and ?options). The first argument: the map to load, then ?Name=value options joined by question marks. Common options are SessionName, Port, QueryPort, RCONEnabled, RCONPort, ServerAdminPassword, ServerPassword, MaxPlayers and AltSaveDirectoryName (a separate save folder per map).

Example: `TheIsland_WP?listen?SessionName=My ARK?Port=7777`

### `-WinLiveMaxPlayers`

**Max players** (Dash arguments). The most players that can be on at once (ARK: Survival Ascended).

Example: `-WinLiveMaxPlayers=70`

### `-mods`

**Mods** (Dash arguments). The mod IDs to load, separated by commas. Add them from the Mods tab; mods have no explanations here.

Example: `-mods=123456,789012`

### `-clusterid`

**Cluster ID** (Dash arguments). Puts servers in a cluster so characters and dinos can travel between them. Every server in the cluster uses the same ID.

Example: `-clusterid=mycluster`

### `-ClusterDirOverride`

**Cluster folder** (Dash arguments). The shared folder that holds what travels between servers in a cluster. Every server in the cluster points at the same folder.

Example: `-ClusterDirOverride="D:\ARK\cluster"`

### `-NoTransferFromFiltering`

**No transfer filtering** (Dash arguments). Lets characters and dinos come from any server, not only those in the same cluster.

### `-servergamelog`

**Game log** (Dash arguments). Writes the in-game log (chat and tribe events) to a file.

### ARK: Survival Ascended / Evolved: `-NoBattlEye`

**No BattlEye** (Dash arguments). Turns BattlEye anti-cheat off. Players must then also start their game without it.

### ARK: Survival Ascended / Evolved: `-log`

**Log window** (Dash arguments). Shows the server's log in its console window.

## Conan Exiles

Conan Exiles is set up in `ServerSettings.ini` (the Settings tab). The launch line only gives the ports and how the program runs. Both can be changed in the start script (Edit Batch Files). These arguments are on the `ConanSandboxServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Conan Exiles: `-Port`

**Game port** (Network). The UDP port players connect to. Change it from the server's Ports section so the panel can check for clashes.

Example: `-Port=7777`

### Conan Exiles: `-QueryPort`

**Query port** (Network). The UDP port the server list asks for details on.

Example: `-QueryPort=27015`

### Conan Exiles: `-RconPort`

**Remote console port** (Network). The TCP port of the remote console. Only for the panel on this PC; never open it in your router.

Example: `-RconPort=25575`

### Conan Exiles: `-MaxPlayers`

**Max players** (Server). The most players that can be on at once.

Example: `-MaxPlayers=40`

### Conan Exiles: `-nosteam`

**Without Steam** (Server). Runs without Steam, so the server isn't in the Steam list.

### Conan Exiles: `-log`

**Log window** (Server). Shows the server's log in its console window.

## Palworld

Palworld is set up in `PalWorldSettings.ini` (the Settings tab). A few launch arguments change how the program runs; they're in the start script (Edit Batch Files). These arguments are on the `PalServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### `-publiclobby`

**Community server** (Server). Lists the server in the in-game community server list.

### Palworld: `-port`

**Game port** (Network). The UDP port players connect to.

Example: `-port=8211`

### Palworld: `-players`

**Max players** (Server). The most players that can be on at once. Overrides the setting in the settings file.

Example: `-players=32`

### `-publicip`

**Public IP** (Network). The public address of this PC, shown in the community list.

Example: `-publicip=203.0.113.9`

### `-publicport`

**Public port** (Network). The public port, if your router maps a different one.

Example: `-publicport=8211`

### Palworld: `-useperfthreads`

**Performance threads** (Performance). Uses extra threads for better performance on a PC with many cores.

### Palworld: `-NoAsyncLoadingThread`

**No async loading thread** (Performance). Loads assets on the main thread. Used together with -useperfthreads and -UseMultithreadForDS.

### `-UseMultithreadForDS`

**Multithreaded server** (Performance). Lets the server use several threads. Used together with -useperfthreads and -NoAsyncLoadingThread.

### `-NumberOfWorkerThreadsServer`

**Worker threads** (Performance). How many worker threads the server may use.

Example: `-NumberOfWorkerThreadsServer=8`

### `-logformat`

**Log format** (Saves and logs). text for plain lines or json for JSON, in the server's log.

Example: `-logformat=text`

## Minecraft (Java)

Minecraft is set up in `server.properties` (the Settings tab). The launch line is Java's own options, mostly how much memory it may use. These arguments are on the `java` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Minecraft (Java): `-Xms`

**Starting memory** (Memory). How much memory Java takes when the server starts. Setting it equal to the maximum avoids pauses while Java grows.

Example: `-Xms4G`

### Minecraft (Java): `-Xmx`

**Maximum memory** (Memory). The most memory Java may use. Modded servers need more; never more than the PC has free. The panel's Max Memory field sets this when the server is created.

Example: `-Xmx8G`

### `-XX:+UseG1GC`

**G1 garbage collector** (Memory). The memory cleaner most Minecraft servers use. It keeps pauses short.

### `-jar`

**Server jar** (Files). The server program to run.

Example: `-jar server.jar`

### `nogui`

**No window** (Files). Starts the server without its small control window, since the panel shows the console.

## Abiotic Factor

Abiotic Factor's server name, ports, passwords and player limit are arguments on the command that starts it; the rules of the world are in SandboxSettings.ini (the Settings tab). Changes apply the next time the server starts. These arguments are on the `AbioticFactorServer-Win64-Shipping.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Abiotic Factor: `-log`

**Show the log window** (Required). Shows the server's log in its own console window. Keep it: without it the server has no window at all, and the panel can then only force it to stop instead of asking it to close.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Abiotic Factor: `-PORT`

**Game port** (Network). The port players connect to (UDP). Needs port forwarding. Change it from the server's Ports section so the panel can check for clashes.

Example: `-PORT=8950`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Abiotic Factor: `-QueryPort`

**Query port** (Network). The port used to advertise the server on Steam and answer the server list (UDP). The developer calls it recommended but not strictly required. Each Abiotic Factor server on a PC needs its own, or the game can not start its Steam connection.

Example: `-QueryPort=8952`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Abiotic Factor: `-SteamServerName`

**Server name** (Server). The name shown in the in-game server browser.

Example: `-SteamServerName="My Server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-ServerPassword`

**Server password** (Server). What players type to join. Leave it off for a server anyone can join.

Example: `-ServerPassword="secret"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Abiotic Factor: `-AdminPassword`

**Admin password** (Server). Lets a player become an admin in the game by typing this password. It is separate from the server password. Leave it off to turn password admin off; admins then have to be listed in Admin.ini by Steam ID, which works for Steam players only.

Example: `-AdminPassword="adminpass"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-MaxServerPlayers`

**Max players** (Server). The most players that can be on at once, from 1 to 24. More than 6 is not recommended: players get a warning pop-up before they join.

Example: `-MaxServerPlayers=6`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-WorldSaveName`

**World save name** (Saves and logs). The name of the world's save folder (in AbioticFactor\Saved\SaveGames\Server\Worlds). A name that does not exist yet starts a new world, and the old one stays on disk and returns if you switch back. The game's own default is Cascade.

Example: `-WorldSaveName=Cascade`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-SandboxIniPath`

**Sandbox settings file** (Files). Where the world rules file is read from, counted from the server's AbioticFactor\Saved folder. The panel sets it so the Settings tab edits the file the server really reads. Without it the game looks in the world's own folder.

Example: `-SandboxIniPath=Config/WindowsServer/SandboxSettings.ini`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-AdminIniPath`

**Admin list file** (Files). Where the admin list (Admin.ini) is read from, counted from the server's AbioticFactor\Saved folder. The panel leaves it off, so the game uses SaveGames\Server\Admin.ini, which is the file the Settings tab shows.

Example: `-AdminIniPath=Config\WindowsServer\Server1Admin.ini`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-PlatformLimited`

**Limit platforms (no crossplay)** (Network). Turns crossplay off and lets only one kind of player in. Leave it off for full crossplay between Steam, Xbox and PlayStation.

Values: `PC` (Steam players only), `Playstation` (PlayStation players only), `Xbox` (Xbox and Microsoft Store players only).

Example: `-PlatformLimited=PC`

### `-LANOnly`

**Local network only** (Network). Runs the server for your local network. Players find it with the in-game server browser set to LAN Only. Port 14001 must not be blocked on your network, because it is used to find servers.

### Abiotic Factor: `-MultiHome`

**Bind address** (Network). Makes the server listen on one IP address, for a PC with more than one network card or address. The developer's issue tracker says it only takes effect together with -UseLocalIPs. Leave it off to use them all.

Example: `-MultiHome=192.168.1.20`

### `-UseLocalIPs`

**Also listen on local addresses** (Network). Like the bind address, but without choosing one: the server also listens on local addresses. A fix to try if players on your own network cannot connect. It may stop players from the internet from joining, so take it off again if they can not.

### Abiotic Factor: `-useperfthreads`

**Use performance threads** (Performance). Makes the server use the CPU's performance threads. Optional; the developer's example start file includes it and their wiki says it is currently recommended.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Abiotic Factor: `-NoAsyncLoadingThread`

**Pause to load new areas** (Performance). Makes the server stop and load new areas in one go instead of gradually in the background. The developer's example start file includes it, but their wiki says it is not recommended after community feedback, so the panel leaves it off.

### `-newconsole`

**Open its own console window** (Required). Opens the server in a console window of its own. The developer's example start file uses it together with -log. The panel does not add it, because -log already gives the server a console window.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Abiotic Factor: `-NOSTEAM`

**Do not use** (Do not use). Never use this. The developer warns against it and the server logs that it will not work correctly with it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Don't Starve Together

The panel runs one Don't Starve Together world (the overworld, called the Master shard): no Caves. The server's name, password and rules are in `cluster.ini` (the Settings tab); the launch line says where the data is kept and which ports are used. Changes apply the next time the server starts. These arguments are on the `dontstarve_dedicated_server_nullrenderer_x64.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Don't Starve Together: `-console`

**Server console** (Required). Lets Lua commands be typed into the server's console window. The game says this argument is deprecated in favour of the console_enabled setting, but still accepts it, and Klei's own start scripts still use it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-persistent_storage_root`

**Data folder** (Files). The base folder where the server keeps its settings, saves and logs. It has to be an absolute path. The panel keeps it inside the server's own folder so two servers never share one.

Example: `-persistent_storage_root "%~dp0data"`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-conf_dir`

**Config folder name** (Files). The folder name under the data folder that holds the clusters. One folder name, no slashes. The panel's backups and logs look here.

Example: `-conf_dir DoNotStarveTogether`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-cluster`

**Cluster folder** (Files). The folder with cluster.ini and the shard folders. One cluster is one world with its shards. The panel's settings, backups and logs look in this folder.

Example: `-cluster Cluster_1`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-shard`

**Shard folder** (Files). Which shard of the cluster this program runs; it is the name of the shard's folder. The panel runs only the Master (the overworld).

Example: `-shard Master`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Don't Starve Together: `-port`

**Game port** (Network). The UDP port players connect to. It overrides server_port in server.ini. The game accepts 1024 to 65535 for online servers; for an offline server on your own network it documents 10998 to 11018. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 8930`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-steam_master_server_port`

**Steam server port** (Network). An internal port Steam uses (UDP). It must be different for every Don't Starve Together server on this PC. Change it from the server's Ports section so the panel can check for clashes.

Example: `-steam_master_server_port 27016`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-steam_authentication_port`

**Steam login port** (Network). An internal port Steam uses to check players in (UDP). It must be different for every Don't Starve Together server on this PC. The panel keeps it two above the game port; if you change the game port, change this one to match.

Example: `-steam_authentication_port 8766`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-bind_ip`

**Listen address** (Network). The network address the server listens on for players. Advanced; most people never need it. It is not the same setting as the shard link address in cluster.ini.

Example: `-bind_ip 0.0.0.0`

### `-backup_log_count`

**Old log files to keep** (Files). How many of the previous runs' log files the game keeps in the shard's backup folder. The game does not document its own default.

Example: `-backup_log_count 10`

### `-ugc_directory`

**Mod download folder** (Files). Where Steam Workshop mods are downloaded. By default each shard keeps its own copy under ugc_mods in the server's folder. A relative path starts from the bin64 folder.

Example: `-ugc_directory ../ugc_mods`

### `-skip_update_server_mods`

**Skip mod updates at start** (Advanced). Starts without checking for or downloading Workshop mod updates. The server normally updates its mods every time it starts, which can make a start slower.

### `-only_update_server_mods`

**Only update the mods** (Advanced). Downloads and updates the mods, then quits without starting the world. It is not offered in the form: left on the line, the server would never start.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-offline`

**Offline** (Network). Starts the server offline: not in the server list, local network only, no cluster token needed. Use the Offline server setting in cluster.ini instead, so it shows on the Settings tab.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Don't Starve Together: `-players`

**Max players** (Server). The most players allowed to join, 1 to 64. It overrides max_players in cluster.ini, so the panel leaves it off and uses that setting.

Example: `-players 8`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-tick`

**Network tick rate** (Network). How many times a second the server sends updates to players, 15 to 60. It overrides tick_rate in cluster.ini; the panel leaves it off.

Example: `-tick 15`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-disabledatacollection`

**Turn off data collection** (Advanced). Stops the server sending the data Klei collects. Klei says the online services need that data, so the server can then only run offline.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-monitor_parent_process`

**Exit with the program that started it** (Advanced). The process id of the program that started the server. Klei's Linux start script passes its own id here; the game does not document what it does with it, so the panel does not use it.

Example: `-monitor_parent_process 1234`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Icarus

Icarus' server name and ports are given on the command that starts it; the rest of its options are in `ServerSettings.ini` (the Settings tab). Difficulty is not in any file: it is part of the world, chosen when the world is created. Changes apply the next time the server starts. These arguments are on the `IcarusServer-Win64-Shipping.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Icarus: `-Log`

**Show server window** (Required). Opens a window that shows the server's log while it runs; the official guide says nothing is visible without it. Written -Log. (-LOG=`<file>` is a different argument that sends the log to another file under Saved\Logs; the Logs tab reads Saved\Logs\Icarus.log, so leave that one alone.)

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Icarus: `-SteamServerName`

**Server name** (Server). The name shown in the in-game server browser, 64 characters at most. This is the only way to set it: SessionName in the settings file does nothing.

Example: `-SteamServerName="My Icarus Server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Icarus: `-PORT`

**Game port** (Network). The UDP port players connect to. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports.

Example: `-PORT=17777`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Icarus: `-QueryPort`

**Query port** (Network). The UDP port Steam asks for the server's details on. Change it from the server's Ports section. Two servers on one PC need different query ports.

Example: `-QueryPort=27015`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Icarus: `-MULTIHOME`

**Bind address** (Network). Makes the server use one specific IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all.

Example: `-MULTIHOME=192.168.1.20`

### `-ResumeProspect`

**Resume the last world** (World at startup). Reopens the last world the server ran when it starts. The settings file already does this unless its ResumeProspect is turned off.

### `-LoadProspect`

**Open a saved world** (World at startup). Opens a saved world by its name when the server starts. Set it as LoadProspect in ServerSettings.ini instead.

Example: `-LoadProspect=MyWorld`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-CreateProspect`

**Create a world** (World at startup). Makes and starts a new world when the server starts: world type, difficulty (1 easy to 4 extreme), hardcore (true or false) and save name, in one quoted piece. Leaving it on the line can make a new world on every start. Set it as CreateProspect in ServerSettings.ini instead.

Example: `-CreateProspect="Tier1_Forest_Recon_0 3 false MyWorld"`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-UserDir`

**Data folder** (Saves and logs). Moves the Saved folder (settings, saved worlds, logs) somewhere else. The panel looks for them inside the server's own folder, so leave it off.

Example: `-UserDir="D:\IcarusData"`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-saveddirsuffix`

**Saved folder suffix** (Saves and logs). Adds a suffix to the Saved folder's name, to keep two servers from sharing saves. The panel looks for the plain Saved folder, so leave it off.

Example: `-saveddirsuffix=player2`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-ABSLOG`

**Log file (full path)** (Saves and logs). Writes the log to a file at this full path. The Logs tab reads Saved\Logs, so it would then show nothing.

Example: `-ABSLOG="C:\Logs\icarus.log"`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## SCUM

SCUM's settings are in `ServerSettings.ini` (the Settings tab). The launch line only gives the game port, the player limit and a few switches. Changes apply the next time the server starts. These arguments are on the `SCUMServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### SCUM: `-log`

**Show the log window** (Saves and logs). Makes the server show its log in its console window. Steam's own launch entry for the server includes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### SCUM: `-port`

**Game port** (Network). The UDP port players connect on. The game also opens a TCP port two above it, so keep that one free too. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port=7780`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### SCUM: `-QueryPort`

**Query port** (Network). The UDP port the Steam server list asks for the server's details on. Without it the game uses 27015, which another server on the same PC may already have. Change it from the server's Ports section so the panel can check for clashes.

Example: `-QueryPort=7880`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### SCUM: `-MaxPlayers`

**Max players** (Server). The most players that can be online at once. It overrides the player limit in ServerSettings.ini. The SCUM wiki's example uses 64; sources disagree on the real upper limit.

Example: `-MaxPlayers=64`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### SCUM: `-nobattleye`

**Turn off anti-cheat (BattlEye)** (Advanced). Starts the server without the BattlEye anti-cheat. The SCUM wiki marks this as not recommended. Leave it off unless you know you need it.

## StarRupture

StarRupture's server is started by a few arguments on the command that starts it. Everything about the world itself is in DSSettings.txt instead. Changes apply the next time the server starts. These arguments are on the `StarRuptureServerEOS.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### StarRupture: `-Log`

**Show the log window** (Required). Opens a console window with the server's log. The game's own start script uses it too.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### StarRupture: `-Port`

**Game port** (Network). The port players connect to. The game uses it for gameplay over UDP; forward UDP only. Change it from the server's Ports section so the panel can check for clashes.

Example: `-Port=7780`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### StarRupture: `-multihome`

**Bind address** (Network). Makes the server listen on one network adapter's address, for a PC with a VPN, ZeroTier or several network cards. Leave it off to use them all.

Example: `-multihome=192.168.1.20`

### `-RCWebControlDisable`

**Turn off the built-in web remote control** (Security). Switches off the web remote-control service built into the game's engine. Community server setups add this and the next argument as a precaution, because the game's built-in web server on the game port has a reported security hole.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-RCWebInterfaceDisable`

**Turn off the built-in web remote screen** (Security). The partner of the argument above: it switches off the web page of the same remote-control service.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Soulmask

Soulmask is set up by the arguments on the command that starts it: the name, the passwords, the player limit, the ports, PvE or PvP and how often the world is written to disk. The map's name comes first on the line (`Level01_Main` is the base game) and is not changed here. Changes apply the next time the server starts. These arguments are on the `WSServer-Win64-Shipping.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `-server`

**Server mode** (Required). Starts the game as a dedicated server. The guides call it required.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-forcepassthrough`

**Engine switch (required)** (Required). The guides say this must be on the line and give no reason. Leave it as it is.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Soulmask: `-log`

**Show server window** (Required). Keeps the server in a visible console window and writes the log to WS\Saved\Logs\WS.log. Without it the server runs in the background with no window at all, which also leaves the panel nothing to close.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-UTF8Output`

**Readable non-English log text** (Required). Keeps log lines with non-Latin characters, such as some players' names, readable. The guide says to keep it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Soulmask: `-SteamServerName`

**Server name** (Server). The name shown in the server list.

Example: `-SteamServerName="My Soulmask"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Soulmask: `-MaxPlayers`

**Player slots** (Server). The most players allowed at once. The wiki's sample uses 20. Some guides say about 70 is the most, but that is not confirmed, and the guide warns that too many players hurts performance.

Example: `-MaxPlayers=20`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-PSW`

**Join password** (Server). What players type to join. Take the argument off the line for a server anyone can join.

Example: `-PSW="friends"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-adminpsw`

**Admin password** (Server). The password for admin powers in the game: press the ~ key, type gm key followed by the password, and the admin panel opens. Anyone who has it has full admin, so keep it private and never leave it empty.

Example: `-adminpsw="gmpass"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-pve`

**PvE mode (peaceful)** (Server). Runs the server by PvE rules. The guide says it also changes some of the game's settings, without listing which. Use this or -pvp, not both.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-pvp`

**PvP mode (players fight)** (Server). Runs the server by PvP rules. The guide says it also changes some of the game's settings, without listing which. To use it, turn off -pve first: use one or the other.

### `-serverpm`

**Ban and allow lists** (Server). Which lists are switched on, as a number made by adding up: 1 only the accounts on the allow list may join, 2 accounts on the ban list are refused, 4 only the IP addresses on the allow list may join, 8 IP addresses on the ban list are refused, 16 the mute list. Without this argument every list is off after each restart, so bans do not last. 2 is the usual choice.

Example: `-serverpm=2`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-GongHuiMaxMember`

**Tribe size limit** (Server). The most players in one tribe. When it is on the line it replaces the tribe size set in the game's own settings at the next start.

Example: `-GongHuiMaxMember=10`

### Soulmask: `-mod`

**Workshop mods** (Server). Steam Workshop mod ids, separated by commas with no spaces, in this order: put a mod other mods need before them. The server downloads them when it starts, and every player must have the same mods. A broken mod can stop the server from starting; take it off the list to recover. Keep the list inside quotation marks.

Example: `-mod="3331511657,3325592770"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Soulmask: `-PORT`

**Game port** (Network). The UDP port players connect to. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports.

Example: `-PORT=8777`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Soulmask: `-QueryPort`

**Query port** (Network). The UDP port the server list asks for the server's details on. Change it from the server's Ports section. Two servers on one PC need different query ports.

Example: `-QueryPort=27015`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-EchoPort`

**Console port** (Network). The TCP port of the server's local text console, which only this PC can reach. Do not open it in the firewall or the router. It is not in the panel's Ports section, so change it here, and give each server on this PC its own.

Example: `-EchoPort=18888`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Soulmask: `-MULTIHOME`

**Listen address** (Network). Makes the server use one specific IP address of this PC. Only useful on a PC with several network cards; leave it off to use them all.

Example: `-MULTIHOME=0.0.0.0`

### `-rconpsw`

**Remote console password** (Network). Turns on the game's remote console (RCON) and sets its password. Without it RCON is off. The panel cannot use this RCON; it is for outside tools. It also needs -rconaddr or -MULTIHOME.

Example: `-rconpsw="rconpass"`

### `-rconaddr`

**Remote console address** (Network). The IP address the remote console listens on. If it is not given the -MULTIHOME address is used, and if neither is given the remote console stays off.

Example: `-rconaddr=127.0.0.1`

### Soulmask: `-rconport`

**Remote console port** (Network). The TCP port the remote console listens on; 19000 when not given. Other PCs must also be listed under [Server.SafeIP] in WS\Saved\Config\WindowsServer\Engine.ini to connect. Do not open it to the internet without a strong password.

Example: `-rconport=19000`

### `-saving`

**World snapshot interval (seconds)** (Saves and backups). How often the world is saved into the server's memory, ready to be written out. It is not on disk yet. The wiki's sample uses 600 (10 minutes); one guide says 300.

Example: `-saving=600`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-backup`

**Write to disk every (seconds)** (Saves and backups). How often the world in memory is written to world.db on disk. This is what a Stop from the panel can lose: closing the window can roll the world back to the last write. The wiki's sample uses 900 (15 minutes); a smaller number loses less.

Example: `-backup=900`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-initbackup`

**Back up the world at every start** (Saves and backups). Makes a copy of world.db each time the server starts. The server never deletes these copies, so clear them out by hand now and then.

### `-backupinterval`

**Extra backup copies (minutes)** (Saves and backups). Makes a backup copy of world.db on disk this often. The server never deletes the old copies, so clear them out by hand now and then to save disk space.

Example: `-backupinterval=60`

### `-coef`

**Official settings template** (Advanced). Loads a named settings template that matches an official server. The names are the GameXishu_Template_`<name>`.json files in WS\Config\GameplaySettings. The game then saves its settings to GameXishu_`<name>`.json instead of GameXishu.json. Add it by editing the start script.

Example: `-coef=PvE_10P_3x`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-serverid`

**Server number** (Advanced). A whole number that identifies this server; each server in a cluster needs its own. Characters are tied to it: changing it after players have made characters makes them start over. Add it by editing the start script, and only before players join.

Example: `-serverid=1`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-mainserverport`

**Cluster: main server port** (Advanced). Makes this the main server of a cluster of servers, listening on this TCP port. Never open that port to the internet. Adding or removing it on a server that already has players changes how their data is saved. Add it by editing the start script.

Example: `-mainserverport=20000`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-clientserverconnect`

**Cluster: join a main server** (Advanced). Makes this a member of the cluster whose main server is at this address and port. Adding or removing it on a server that already has players changes how their data is saved. Add it by editing the start script.

Example: `-clientserverconnect=192.168.1.5:20000`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Garry's Mod

Garry's Mod is started with `+word value` console commands (the map, the gamemode, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Garry's Mod: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Garry's Mod: `-game`

**Game folder** (Required). Tells srcds which game to run. For Garry's Mod this has to be garrysmod. The Facepunch examples for Windows leave it out, but the Linux example and the community guides include it, so the panel always writes it.

Example: `-game garrysmod`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Garry's Mod: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to (UDP). Source's remote console would use the same number over TCP. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 27145`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Garry's Mod: `-strictportbind`

**Stop if the port is taken** (Network). If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take the next free port and players would not find it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Garry's Mod: `-ip`

**Listen address** (Network). The network address the server listens on. It has to be an address of this PC, or 0.0.0.0 for all of them. Only needed with several network cards; it has nothing to do with the address players use from outside.

Example: `-ip 0.0.0.0`

### `-tickrate`

**Tick rate** (Performance). How many times a second the server updates the game. Facepunch recommends 30 to 128 and says the default is about 66.67. Higher is smoother and uses more CPU.

Example: `-tickrate 66`

### Garry's Mod: `+maxplayers`

**Max players** (Server). The number of player slots. The most the game allows is set by the game and gamemode; the Facepunch examples use 12 to 32.

Example: `+maxplayers 16`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+gamemode`

**Gamemode** (Server). The gamemode the server starts with, named by its folder in garrysmod/gamemodes (or in an addon). Sandbox and terrortown (Trouble in Terrorist Town) come with the game; a gamemode from the Workshop is named by its folder.

Values: `undefined`, `undefined`. Other values are accepted too.

Example: `+gamemode sandbox`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Garry's Mod: `+map`

**Start map** (World). The map the server starts on: the map file's name without .bsp, from garrysmod/maps or from an addon. For a Workshop map, use the file name given on its Workshop page.

Example: `+map gm_construct`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Garry's Mod: `+sv_setsteamaccount`

**Game Server Login Token** (Server). The Game Server Login Token for this server. Facepunch says every server should have one: without it the server ranks very low in the server list, and an invalid or expired one stops the server from starting. Create one at steamcommunity.com/dev/managegameservers with app ID 4000, one token per server. Treat it like a password.

Example: `+sv_setsteamaccount …`

### `+host_workshop_collection`

**Workshop collection** (Mods). The id of a Steam Workshop collection. The server downloads it and mounts all its addons every time it starts. The collection has to be Public or Unlisted. Players only download an addon's content from your server if it is marked for download in a Lua file.

Example: `+host_workshop_collection 157384458`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Garry's Mod: `-condebug`

**Write the console to a file** (Saves and logs). Writes everything the console prints to console.log in the garrysmod folder. The Logs tab reads that file.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-disableluarefresh`

**No Lua auto-refresh** (Performance). Stops the server reloading Lua files when they change on disk.

### `-noworkshop`

**Ignore Workshop addons** (Troubleshooting). Starts without the Workshop addons, to find out whether one of them is the problem.

### `-noaddons`

**Ignore hand-made addons** (Troubleshooting). Starts without the addons in the garrysmod/addons folder, to find out whether one of them is the problem.

### `-noconclr`

**No console colours** (Troubleshooting). Turns off the colour codes in the server console, so a program that shows its text does not show strange characters.

### `-allowlocalhttp`

**Allow web requests to the local network** (Advanced). Lets Lua scripts on the server fetch web pages from addresses like 192.168.x.x. Only for addons that need to talk to another program on your network.

### `-nocrashdialog`

**No crash message boxes** (Advanced). Stops some of the error message boxes Windows would show if the server crashes, so an unattended server is not left waiting for someone to click.

### Garry's Mod: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line.

## Barotrauma

Barotrauma's server name, ports, player limit and password are given on the command that starts it, and they override the same settings in `serversettings.xml`. The rest of its options are in that file, which the server writes itself and the Settings tab cannot edit. Changes apply the next time the server starts. These arguments are on the `DedicatedServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Barotrauma: `-name`

**Server name** (Server). The name shown in the server list and the lobby. The game cuts a name longer than 60 characters. It overrides the name in serversettings.xml.

Example: `-name "My Sub Crew"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Barotrauma: `-port`

**Game port** (Network). The UDP port players connect to. The game's own default is 27015. Change it from the server's Ports section so the panel can check for clashes and open the firewall.

Example: `-port 27215`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Barotrauma: `-queryport`

**Query port** (Network). The UDP port Steam's server list asks for the server's details on. The game's own default is 27016. The server only opens it while it is listed publicly. Change it from the server's Ports section so the panel can check for clashes.

Example: `-queryport 27217`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Barotrauma: `-public`

**Listed publicly** (Server). Whether the server appears in the in-game server list. The panel starts a new server as not listed. Without this argument the server uses the setting in serversettings.xml.

Values: `True` (Listed in the public server list), `False` (Not listed (players join by IP address)).

Example: `-public False`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Barotrauma: `-maxplayers`

**Max players** (Server). The number of player slots. The game allows 1 to 16 and uses a limit of 10 when nothing else says otherwise.

Example: `-maxplayers 10`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Barotrauma: `-password`

**Join password** (Server). What players type to join. It overrides the password in serversettings.xml. It is written on this line, so anyone who can open the start script or see the server's process list can read it. To remove the password, clear this and add the 'No password' switch.

Example: `-password "secret"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-nopassword`

**No password** (Server). Clears the join password, even one saved in serversettings.xml. The panel puts it on the line when the server has no password. When both this and -password are on the line, the one that comes last wins.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-upnp`

**Open the ports automatically (UPnP)** (Network). Asks the router to forward the server's ports by itself. The official wiki warns that this does not work on every router, so forward the ports by hand if players cannot connect.

Values: `True` (Ask the router to open the ports), `False` (Do not).

Example: `-upnp True`

### `-enableupnp`

**Open the ports automatically (UPnP), long spelling** (Network). The same as -upnp: the game reads both spellings with the same code. Use -upnp in the form.

Values: `True` (Ask the router to open the ports), `False` (Do not).

Example: `-enableupnp True`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-playstyle`

**Play style label** (Server). The label shown in the server list so players know what to expect. The names are the game's own, and a value it does not know falls back to Serious.

Values: `Serious`, `Casual`, `Roleplay`, `Rampage`, `SomethingDifferent` (Something different).

Example: `-playstyle Casual`

### `-banafterwrongpassword`

**Ban after wrong password** (Access). Whether a player who types the wrong password too many times is banned. The number of tries is the MaxPasswordRetriesBeforeBan setting in serversettings.xml (3 in the game's code). Always give a value after it.

Values: `True` (Ban a player who gets the password wrong too many times), `False` (Never ban for wrong passwords).

Example: `-banafterwrongpassword True`

### `-karma`

**Karma system** (Access). Turns the karma system on: players who grief lose karma and can be kicked or banned automatically. Off in the game's own defaults.

Values: `True` (On), `False` (Off).

Example: `-karma True`

### `-karmaenabled`

**Karma system, long spelling** (Access). The same as -karma; this is the spelling the game's own Host Server menu uses. Use -karma in the form.

Values: `True` (On), `False` (Off).

Example: `-karmaenabled True`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-karmapreset`

**Karma preset** (Access). Which set of karma rules is used. They come from the game's Data\karmasettings.xml, which has these three presets. It only matters when karma is turned on.

Values: `default` (Default), `strict` (Strict), `custom` (Custom).

Example: `-karmapreset default`

### `-language`

**Server language** (Server). The language shown for the server in the server list. It is only used when it matches a name in the game's Data\languageoptions.xml; anything else is ignored.

Values: `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`, `undefined`. Other values are accepted too.

Example: `-language English`

## Necesse

Necesse's world, port, player limit and password are given on the command that starts it, and they win over the same settings in `cfg\server.cfg`. That file is written by the server itself and is not offered here. The world's rules (difficulty, death penalty, raids) are in the world's save and are changed in the game with the admin commands. Changes apply the next time the server starts. These arguments are on the `java.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `-nogui`

**Text console** (Required). Runs the server as a text console instead of opening the server's own graphical window. A server run from a start script needs this.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-localdir`

**Keep data in the server's folder** (Required). Keeps the server's settings, saves and logs in the server's own folder instead of the Windows user's AppData\Roaming\Necesse, so each server on this PC has its own. The panel's backups and Logs tab read them there, so leave it on.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Necesse: `-mod`

**Mods folder** (Required). The folder the server loads mod .jar files from. The panel makes a mods folder in the server's folder; copy mods into it while the server is stopped. Players need the same mods.

Example: `-mod .\mods`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Necesse: `-world`

**World name** (Server). Which saved world to load. If there is none with that name, a new one is made. A new name starts a new world and keeps the old one. Without this argument the server stops at start and asks questions in its console.

Example: `-world "MyWorld"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-slots`

**Player slots** (Server). The most players that can be on the server at once, from 1 to 250. More players need more memory and a faster PC.

Example: `-slots 10`

### Necesse: `-password`

**Server password** (Server). What players type to join. Take the argument off the line for a server anyone can join. The owner can also change it in the game with /password.

Example: `-password "secret"`

### `-owner`

**Owner player name** (Server). Anyone who joins using exactly this player name gets the owner's full rights (admin commands, giving others permissions with /permissions). It is a player name, not an account, so anyone who types it can claim it: set a password.

Example: `-owner Alex`

### `-motd`

**Message of the day** (Server). The message shown to players when they join. Write \n for a new line. An admin can change it in the game with /motd.

Example: `-motd "Welcome!"`

### Necesse: `-port`

**Game port** (Network). The UDP port players connect to; 14159 is the game's own default. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports.

Example: `-port 14159`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Necesse: `-ip`

**Bind address** (Network). Makes the server listen only on one IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all.

Example: `-ip 192.168.1.20`

### `-pausewhenempty`

**Pause when empty** (Performance). When on, the world stands still while nobody is online, so crops, settlers and timers do not run with no one there. Not on the line by default: the server then uses the value in its server.cfg (the game's own default file has it on).

Values: `1` (Pause the world while nobody is online), `0` (Keep the world running).

Example: `-pausewhenempty 1`

### `-logging`

**Write log files** (Saves and logs). Whether the server writes a log file each time it starts. On by default. The Logs tab reads the logs folder, so it shows nothing with this off.

Values: `1` (Write a log file for each start), `0` (Do not write log files).

Example: `-logging 1`

### `-logs`

**Log folder** (Saves and logs). Moves the log files to another folder. The Logs tab reads the logs folder in the server's folder, so it would then show nothing.

Example: `-logs C:\necesse\logs`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-datadir`

**Data folder** (Saves and logs). Sets the folder where the server keeps its cache, logs and saves. The panel uses -localdir instead, so its backups and Logs tab find them; leave this off.

Example: `-datadir .\data`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-settings`

**Settings file** (Saves and logs). A different file to read the server's settings from, instead of cfg\server.cfg. Anything given on the launch line still wins over it.

Example: `-settings C:\necesse\server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-ignoreseasons`

**No seasonal content** (Advanced). Turns off seasonal content, such as the Christmas Present and Christmas Hat.

## Left 4 Dead 2

Left 4 Dead 2 is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Left 4 Dead 2: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Left 4 Dead 2: `-game`

**Game folder** (Required). Tells srcds which game to run. For Left 4 Dead 2 this has to be left4dead2. The panel always writes it.

Example: `-game left4dead2`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Left 4 Dead 2: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to (UDP). Source's remote console would use the same number over TCP. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 27245`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Left 4 Dead 2: `-strictportbind`

**Stop if the port is taken** (Network). If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Left 4 Dead 2: `-ip`

**Listen address** (Network). The network address the server listens on. It has to be an address of this PC, or 0.0.0.0 for all of them. Only needed with several network cards; it has nothing to do with the address players use from outside.

Example: `-ip 0.0.0.0`

### `-nohltv`

**No SourceTV** (Network). Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020.

### `-nomaster`

**Hide from the server list** (Network). Keeps the server out of the master server list, so it does not show in the server browser. Players can still connect by address.

### Left 4 Dead 2: `+maxplayers`

**Max players** (Server). The number of player slots. The game supports 4 in Co-op and 8 in Versus; set 8 for Versus or Scavenge. It is only read when the server starts.

Example: `+maxplayers 4`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Left 4 Dead 2: `+map`

**Start map** (World). The map the server starts on: the first map of a campaign, such as c1m1_hotel (Dead Center) or c8m1_apartments (No Mercy), or the name of a map from an addon.

Example: `+map c1m1_hotel`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the left4dead2\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `+sv_gametypes`

**Allowed game modes** (Server). The game modes lobbies and players may start on this server, separated by commas without spaces. Valve's default list is coop, realism, survival, versus, scavenge, dash, holdout, shootzones. Leave it out to keep the default.

Example: `+sv_gametypes coop,versus`

### Left 4 Dead 2: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server. It is optional: third-party guides say the server runs and accepts players without one, but without a valid one it may not be listed or may not use VAC. Create one at steamcommunity.com/dev/managegameservers with app ID 550, one token per server. Treat it like a password.

Example: `+sv_setsteamaccount …`

### Left 4 Dead 2: `-condebug`

**Write the console to a file** (Saves and logs). Writes everything the console prints to console.log in the left4dead2 folder. The Logs tab reads that file.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-conclearlog`

**Start console.log afresh** (Saves and logs). Empties console.log every time the server starts. It only works together with the option above.

### Left 4 Dead 2: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line.

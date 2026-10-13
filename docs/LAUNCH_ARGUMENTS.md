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

## Valheim

Valheim has no settings file: a dedicated server is set up entirely by the arguments on the command that starts it. Changes apply the next time the server starts. These arguments are on the `valheim_server` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Valheim: `-nographics`

**No graphics** (Required). Runs without a graphics window. A dedicated server needs this, together with -batchmode.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Valheim: `-batchmode`

**Batch mode** (Required). Runs without a user interface so it can run in the background. A dedicated server needs this, together with -nographics.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-name`

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

### `-public`

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

### `+server.secure`

**Anti-cheat** (Server). Easy Anti-Cheat. Leave it on for a public server.

Values: `undefined`, `undefined`.

Example: `+server.secure true`

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

**World seed** (World). A number that decides what a new world looks like. 0 makes a random one.

Example: `-worldseed 0`

### `-worldmode`

**World mode** (World). How hard a new world is. It's chosen once, when the world is made.

Values: `0` (Normal), `1` (Hard). Other values are accepted too.

Example: `-worldmode 0`

### `-gameid`

**Game ID** (Server). A code players can join with through Steam's relay. Leave it off to have one made.

Example: `-gameid ABCDEF`

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

### `-multihome`

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

### `-adminpassword`

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

### `-NoBattlEye`

**No BattlEye** (Dash arguments). Turns BattlEye anti-cheat off. Players must then also start their game without it.

### ARK: Survival Ascended / Evolved: `-log`

**Log window** (Dash arguments). Shows the server's log in its console window.

## Conan Exiles

Conan Exiles is set up in `ServerSettings.ini` (the Settings tab). The launch line only gives the ports and how the program runs. Both can be changed in the start script (Edit Batch Files). These arguments are on the `ConanSandboxServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Conan Exiles: `-Port`

**Game port** (Network). The UDP port players connect to. Change it from the server's Ports section so the panel can check for clashes.

Example: `-Port=7777`

### `-QueryPort`

**Query port** (Network). The UDP port the server list asks for details on.

Example: `-QueryPort=27015`

### `-RconPort`

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

### `-players`

**Max players** (Server). The most players that can be on at once. Overrides the setting in the settings file.

Example: `-players=32`

### `-publicip`

**Public IP** (Network). The public address of this PC, shown in the community list.

Example: `-publicip=203.0.113.9`

### `-publicport`

**Public port** (Network). The public port, if your router maps a different one.

Example: `-publicport=8211`

### `-useperfthreads`

**Performance threads** (Performance). Uses extra threads for better performance on a PC with many cores.

### `-NoAsyncLoadingThread`

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

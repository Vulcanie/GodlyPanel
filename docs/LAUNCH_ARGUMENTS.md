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
- [Squad](#squad)
- [Arma Reforger](#arma-reforger)
- [VEIN](#vein)
- [Space Engineers](#space-engineers)
- [Terraria (tModLoader)](#terraria-tmodloader)
- [Sven Co-op](#sven-co-op)
- [Counter-Strike: Source](#counter-strike-source)
- [Half-Life 2: Deathmatch](#half-life-2-deathmatch)
- [Avorion](#avorion)
- [Minecraft (vanilla)](#minecraft-vanilla)
- [Terraria (vanilla)](#terraria-vanilla)
- [The Forest](#the-forest)
- [Wurm Unlimited](#wurm-unlimited)
- [Mordhau](#mordhau)
- [Team Fortress 2](#team-fortress-2)
- [Counter-Strike 2](#counter-strike-2)
- [Insurgency: Sandstorm](#insurgency-sandstorm)
- [Left 4 Dead](#left-4-dead)
- [Zombie Panic! Source](#zombie-panic-source)
- [BrainBread 2](#brainbread-2)
- [Day of Defeat: Source](#day-of-defeat-source)
- [Fistful of Frags](#fistful-of-frags)
- [No More Room in Hell](#no-more-room-in-hell)
- [Insurgency (2014)](#insurgency-2014)
- [Pirates, Vikings, and Knights II](#pirates-vikings-and-knights-ii)
- [Dystopia](#dystopia)
- [Empires](#empires)
- [Double Action: Boogaloo](#double-action-boogaloo)
- [Half-Life Dedicated Server](#half-life-dedicated-server)
- [IOSoccer](#iosoccer)
- [BATTALION: Legacy](#battalion-legacy)
- [Black Mesa](#black-mesa)
- [Military Conflict: Vietnam](#military-conflict-vietnam)
- [SCP: Secret Laboratory](#scp-secret-laboratory)
- [Rising World](#rising-world)
- [Natural Selection 2](#natural-selection-2)
- [Chivalry: Medieval Warfare](#chivalry-medieval-warfare)
- [Hurtworld](#hurtworld)
- [Euro Truck Simulator 2](#euro-truck-simulator-2)
- [American Truck Simulator](#american-truck-simulator)
- [Stationeers](#stationeers)
- [Wreckfest](#wreckfest)
- [Operation: Harsh Doorstop](#operation-harsh-doorstop)
- [Rising Storm 2: Vietnam](#rising-storm-2-vietnam)
- [Miscreated](#miscreated)
- [Craftopia](#craftopia)
- [Age of Chivalry](#age-of-chivalry)
- [HumanitZ](#humanitz)
- [The Front](#the-front)
- [Empyrion - Galactic Survival](#empyrion---galactic-survival)
- [ATLAS](#atlas)

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

### Rust: `+rcon.ip`

**Remote console address** (Network). The address the remote console listens on. 127.0.0.1 keeps it to this PC, which is what GodlyPanel needs.

Example: `+rcon.ip 127.0.0.1`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Rust: `+rcon.port`

**Remote console port** (Network). The port of the remote console (TCP). Only for the panel on this PC; never open it in your router.

Example: `+rcon.port 28018`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Rust: `+rcon.password`

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

### Satisfactory: `-BeaconPort`

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

### 7 Days to Die: `-dedicated`

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

### ARK: Survival Ascended / Evolved: `-mods`

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

### Soulmask: `-server`

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

### Barotrauma: `-language`

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

### Necesse: `-settings`

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

### Left 4 Dead 2: `-nohltv`

**No SourceTV** (Network). Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020.

### Left 4 Dead 2: `-nomaster`

**Hide from the server list** (Network). Keeps the server out of the master server list, so it does not show in the server browser. Players can still connect by address.

### Left 4 Dead 2: `+maxplayers`

**Max players** (Server). The number of player slots. The game supports 4 in Co-op and 8 in Versus; set 8 for Versus or Scavenge. It is only read when the server starts.

Example: `+maxplayers 4`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Left 4 Dead 2: `+map`

**Start map** (World). The map the server starts on: the first map of a campaign, such as c1m1_hotel (Dead Center) or c8m1_apartments (No Mercy), or the name of a map from an addon.

Example: `+map c1m1_hotel`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Left 4 Dead 2: `+exec`

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

### Left 4 Dead 2: `-conclearlog`

**Start console.log afresh** (Saves and logs). Empties console.log every time the server starts. It only works together with the option above.

### Left 4 Dead 2: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line.

## Squad

Squad is started with arguments written `Name=value` with no dash in front (`Port=7787`), plus `-log` and `-fullcrashdump`. The game's wiki writes them in this exact spelling, so keep it. The server's name and the other settings are in `SquadGame\ServerConfig\Server.cfg`, not here. Changes apply the next time the server starts. These arguments are on the `SquadGameServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `Port`

**Game port** (Network). The port players connect to (UDP). The wiki's firewall list says the game uses the next port up too (7788), so keep both free. The panel writes it first on the line, on purpose: the other port arguments also end in "port=". To change it, edit the start script by hand and keep it first; the Ports section cannot rewrite this form of argument.

Example: `Port=7787`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Squad: `QueryPort`

**Steam query port** (Network). The port the Steam server list and query tools ask for the server's details on. The wiki's firewall list opens it and the next one up (27166) for both UDP and TCP. To change it, edit the start script by hand; the Ports section cannot rewrite this form of argument.

Example: `QueryPort=27165`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `beaconport`

**Beacon port** (Network). Written in lower case, as the wiki spells it. Every server on the same PC must have its own beacon port; the wiki suggests spacing them 5 apart. It lists the port as open for UDP and TCP. The wiki does not explain what it is used for. To change it, edit the start script by hand.

Example: `beaconport=15000`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `MULTIHOME`

**Bind IP address** (Network). Makes the server use one specific IP address of this PC. Only needed if the PC has several addresses; leave it off to use them all.

Example: `MULTIHOME=192.168.1.20`

### `FIXEDMAXPLAYERS`

**Hard player limit** (Server). The most players that can be on the server, whatever else says. The panel also writes the same number as MaxPlayers in Server.cfg when it creates the server; the wiki does not say how the two interact, so keep them equal.

Example: `FIXEDMAXPLAYERS=80`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `RANDOM`

**Shuffle the map rotation** (Server). Whether the rotation of maps (layers) is shuffled. The panel starts the server with NONE, which every example in the wiki uses. Server.cfg also has its own settings for the rotation (MapRotationMode, RandomizeAtStart).

Values: `NONE` (Never shuffle), `ALWAYS` (Always shuffle), `FIRST` (FIRST (the wiki does not explain this choice)).

Example: `RANDOM=NONE`

### `FIXEDMAXTICKRATE`

**Maximum tick rate** (Performance). The most server updates per second. A higher number is smoother but uses more of the CPU. The wiki's example is 40; leave it off to let the game choose.

Example: `FIXEDMAXTICKRATE=40`

### Squad: `-log`

**Show server window** (Saves and logs). Opens a console window that shows the server log, and keeps the server in a window the panel can close. All the wiki's examples have it. The panel also needs it on the line to read the other arguments here.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-fullcrashdump`

**Full crash dump** (Saves and logs). If the server crashes, saves a full dump file for finding the cause. These files can get quite large.

### Squad: `RCONIP`

**Remote console address** (Remote console). The IP address the remote console (RCON) listens on; 0.0.0.0 is the default public address. The same as IP in Rcon.cfg, according to the file's own comment.

Example: `RCONIP=0.0.0.0`

### Squad: `RCONPORT`

**Remote console port** (Remote console). The port of the remote console. The same as Port in Rcon.cfg; the wiki's default there is 21114. A second server on this PC needs its own. The panel does not use the remote console.

Example: `RCONPORT=21114`

### Squad: `RCONPASSWORD`

**Remote console password** (Remote console). Turns on the remote console with this password; with no password it stays off. A password on the launch line can be read by anyone who can see the PC's running programs, so setting Password in Rcon.cfg is the safer way. Choose a long one: whoever has it can run admin commands.

Example: `RCONPASSWORD=…`

### `RCONMAXCONNECTIONS`

**Remote console connections** (Remote console). How many remote console sessions can be open at once. The same as MaxConnections in Rcon.cfg, where the wiki's default is 5.

Example: `RCONMAXCONNECTIONS=5`

### `RCONSECONDSBEFORETIMEOUTCHECK`

**Remote console idle check (seconds)** (Remote console). Seconds without contact from a connected console before the server checks it is still there. The wiki says it takes 30 to 3600; the same as SecondsBeforeTimeoutCheck in Rcon.cfg (default 120).

Example: `RCONSECONDSBEFORETIMEOUTCHECK=120`

## Arma Reforger

Arma Reforger's server is set up in its JSON file (the Settings tab); the launch line points it at that file and tunes how it runs. Arguments are written with a dash and a space before the value, like `-maxFPS 60`. Changes apply the next time the server starts. These arguments are on the `ArmaReforgerServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Arma Reforger: `-config`

**Settings file** (Required). The JSON file the server reads all its settings from (the Settings tab edits it). With -server instead, the server would ignore this file, so that argument is not offered.

Example: `-config ".\Configs\server-config.json"`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-maxFPS`

**Frame rate limit** (Required). Limits how many times a second the server updates. The wiki says to always set it, to a value from 60 to 120: without it the server can try to use all the resources of the PC. Do not clear this.

Values: `60` (60 (the usual)), `90`, `120` (120 (the most the wiki suggests)). Other values are accepted too.

Example: `-maxFPS 60`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-profile`

**Profile folder** (Saves and logs). The folder where the server keeps its logs and, by default, the add-ons (mods) it downloads. Without it the game uses one folder in Documents shared by every Reforger server on this PC. The panel sets a folder inside this server's own folder, which its backups and Logs tab look in.

Example: `-profile "C:\Servers\reforger\profile"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-logsDir`

**Logs folder** (Saves and logs). The folder, by name inside the profile folder or by full path, where the server keeps its logs, crash dumps and temporary files. The Logs tab looks in the profile folder, so change this only if you know why.

Example: `-logsDir logs`

### `-keepNumOfLogs`

**Logs to keep** (Saves and logs). The most log files the server keeps. The default is 10.

Example: `-keepNumOfLogs 10`

### `-logAppend`

**Keep the log between starts** (Saves and logs). The log is not emptied when the server starts, so the history of earlier runs stays in it.

### `-logLevel`

**Log detail** (Saves and logs). How much the log says. Each level also includes the more serious ones below it: normal logs everything, fatal only the worst problems.

Values: `normal` (Normal: everything), `warning` (Warnings and worse), `error` (Errors and worse), `fatal` (Only fatal problems).

Example: `-logLevel warning`

### `-logTime`

**Time in log lines** (Saves and logs). What each log line starts with: nothing, the time of day, or the date and the time.

Values: `none` (No time), `time` (Time of day (the default)), `datetime` (Date and time).

Example: `-logTime datetime`

### `-logStats`

**Log performance every (milliseconds)** (Saves and logs). Writes performance numbers, such as the server's frame rate, to the log at this interval in milliseconds. Leave it empty to log none.

Example: `-logStats 5000`

### `-logVoting`

**Log votes** (Saves and logs). Adds lines to the log about the voting system: who started a vote, who voted and against whom.

### `-listScenarios`

**List scenarios in the log** (Server). Prints the .conf paths of the available scenarios in the log when the server starts, so you can copy one into the Scenario setting. Workshop scenarios are listed only if no scenario is being loaded.

### `-backendFreshSession`

**Start a new session** (Server). Skips loading the server's earlier session, so it starts like a brand new one. Saves and loads that happen later work as usual.

### `-playerLimits`

**Players per faction** (Server). Sets the most players each faction may have. Written as FactionKey:Number, with several entries separated by commas. This needs a recent game version (1.7.0).

### `-nds`

**Network dynamic simulation** (Network tuning). The server sends each player only the things that matter to them. This number is how many cells wide that area is; the default is 2. A larger number gives a longer network view range but slower server performance. 0 turns the feature off.

Example: `-nds 2`

### `-nwkResolution`

**Network cell size (meters)** (Network tuning). The size of the cells used to decide what to send to a player, from 100 to 1000 meters. Smaller cells mean less pop-in but a shorter network view range. For a long view range use big cells with a small -nds.

Example: `-nwkResolution 500`

### `-staggeringBudget`

**Cells processed per tick** (Network tuning). How many stationary (not moving) cells may be processed in one server update, from 1 to 10201. Left out, it follows the -nds diameter.

Example: `-staggeringBudget 100`

### `-streamingBudget`

**Streaming budget** (Network tuning). The streaming budget shared equally by all connections. It cannot go below 100, so the system does not stall.

Example: `-streamingBudget 1000`

### `-streamsDelta`

**Streams per player limit** (Network tuning). Limits how many streams are opened for a player. If the server has this many more streams open than the player has, it opens no more in that update. From 1 to 1000, default 100.

Example: `-streamsDelta 100`

### `-rpl-timeout-ms`

**Connection timeout (milliseconds)** (Network tuning). The timeout of the connection between the server and a player's game, in milliseconds.

Example: `-rpl-timeout-ms 10000`

### `-addonTempDir`

**Temporary folder for add-ons** (Mods). Where add-ons (mods) are unpacked while they download. The wiki suggests setting it when downloading large mods fails with a curl error 23, so the server has a folder it may write to.

Example: `-addonTempDir "C:\Temp\reforger"`

### `-addonDownloadDir`

**Download folder for add-ons** (Mods). Where the server downloads add-ons (mods) from the Workshop to. They are stored in an addons folder inside it.

Example: `-addonDownloadDir "D:\ReforgerMods"`

### `-addonsVerify`

**Check the mods at start** (Mods). Checks every installed add-on. If one is damaged, the server shuts down and writes the damaged files to the log.

### `-addonsRepair`

**Repair the mods at start** (Mods). Checks every installed add-on and repairs a damaged one by itself. If the repair fails, the server shuts down.

### `-freezeCheck`

**Freeze detection (seconds)** (Troubleshooting). How many seconds the server may freeze before it is forced to crash, from 0 to 600. The default is 300. The wiki says this setting can also switch the detection off completely.

Example: `-freezeCheck 300`

### `-freezeCheckMode`

**When the server freezes** (Troubleshooting). What happens when freezing is detected. Kill is more reliable than crash but gives no information about the freeze.

Values: `crash` (Crash the server on purpose), `minidump` (Save a crash dump and keep running (Windows only)), `kill` (Kill the server without any report).

Example: `-freezeCheckMode crash`

### `-noThrow`

**No error pop-ups** (Troubleshooting). Turns off all error message windows: script errors, failed checks and crashes.

## VEIN

VEIN's ports are given on the command that starts it; its name, password, player limit and admins are in Game.ini and its world rules in Engine.ini (the Settings tab). The official wiki lists only a few launch arguments and says the rest are still pending testing. Changes apply the next time the server starts. These arguments are on the `VeinServer-Win64-Test.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### VEIN: `-log`

**Show the log window** (Required). Gives the server a console window that shows its log. Keep it: the panel asks that window to close when it stops the server, and one host notes the server prints no console output without it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### VEIN: `-Port`

**Game port** (Network). The UDP port players connect to (the game's own default is 7777). Change it from the server's Ports section so the panel can check for clashes and open the firewall. Written with an equals sign, -Port=8960.

Example: `-Port=8960`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### VEIN: `-QueryPort`

**Query port** (Network). The UDP port the Steam server browser asks for the server's details on. The wiki says to keep it at the game port plus 2 and not between 27020 and 27050, which Steam uses on a PC that runs Steam. Change it from the server's Ports section.

Example: `-QueryPort=8962`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### VEIN: `-multihome`

**Bind address** (Network). Makes the server use one specific IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all.

Example: `-multihome=192.168.1.20`

### `-onethread`

**Single-threaded** (Performance). Runs the server on a single thread. A hosting guide says it is useful when one machine hosts several servers.

### VEIN: `-MaxPlayers`

**Max players** (Server). The most players that can be on at once. The wiki's example uses 64. The panel sets the limit in Game.ini (Max players on the Settings tab) instead; it is not documented which of the two wins, so set it in one place only.

Example: `-MaxPlayers=16`

## Space Engineers

Space Engineers' dedicated server takes its game port and data folder from the command that starts it, and can take a player limit there too. Its other options (name, admins, password, world rules, mods) are in the server's own config file and worlds, which the panel does not edit after creating them. Changes apply the next time the server starts. These arguments are on the `SpaceEngineersDedicated.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Space Engineers: `-console`

**Console mode** (Required). Starts the server straight away in a console window. Without this (or -noconsole) the game opens its setup window and waits for someone to press Start, so a panel-run server would never come up. The console window is also what the panel closes to stop the server.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-path`

**Data folder** (Required). The folder the server keeps its config file (SpaceEngineers-Dedicated.cfg), worlds, mods and logs in. It has to exist: the game quits at once, without a message, when it does not. The panel makes it when it creates the server, and its backups and Logs tab look in the Data folder of the server, so leave it as it is.

Example: `-path "D:\Servers\space\Data"`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Space Engineers: `-port`

**Game port** (Network). The UDP port players connect to, and the one the game answers Steam's server-list queries on. It replaces the port in the config file (the panel's config does not set one). Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports.

Example: `-port 27116`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Space Engineers: `-maxPlayers`

**Max players** (Server). The most players that can be on the server at once. It replaces the limit stored in the world (the panel's config set that to 8, or to the number you chose when creating the server, when the world was first made; on a real server the server list showed the number from this line). A whole number, written with a capital P.

Example: `-maxPlayers 8`

### Space Engineers: `-ip`

**Listen address** (Network). Makes the server use one specific IP address of this PC, instead of the one in the config file (0.0.0.0, which is all of them). Only useful on a PC with several network cards or addresses. A value that is not an IP address is ignored.

Example: `-ip 192.168.1.20`

### `-ignorelastsession`

**Ignore the last session** (Saves and logs). By default the server starts the world it ran last. With this, it ignores that and builds the world from the config file again. The panel's config file has no LoadWorld and names a ready-made world to copy, so turning this on may make the server start a new world instead of continuing yours. Not tried on a real server; leave it off unless you know you want that.

### `-session:`

**Load this world** (Saves and logs). Starts the world in the given folder instead of the last one. Only the wiki documents it (Keen's source has no such argument), so how it treats quotes and spaces is not known. Set LoadWorld in the config file instead.

Example: `-session:D:\Servers\space\Data\Saves\MyWorld`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-noconsole`

**No console window** (Advanced). Used instead of -console, to run without the console window. Not offered: the panel then has no window to ask to close, so a Stop may end the server without saving the world. The line needs one of -console and -noconsole, never both.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-plugin`

**Plugin file** (Advanced). Loads a plugin (.dll) into the server. Keen does not support plugins and any plugin has full access to this PC, so only use one you trust. The wiki adds that game clients then need a password; what that means is not explained. The line may hold several.

Example: `-plugin C:\plugins\Example.dll`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-eos`

**Epic Online Services network** (Network). Makes the server use Epic's online network layer instead of Steam's. The wiki lists it with no further explanation, so what it does for a normal Steam server is not known.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-np`

**Epic network parameter** (Network). Sets one network setting of the Epic layer, written as name:value, and repeated for each. The wiki names globalMaxUpload and peerMaxUpload (600 by default), and statWindow and peakStatWindow (60 seconds). It only matters with -eos.

Example: `-np globalMaxUpload:1000`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Terraria (tModLoader)

The game port and the player limit are given on the command that starts the server, and only there. The world, its name and the password are in serverconfig.txt. The line starts tModLoader's own start script, which cannot take a value with a space in it, so keep every value here to one word. Changes apply the next time the server starts. These arguments are on the `busybox64.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Terraria (tModLoader): `-nosteam`

**No Steam** (Required). Tells tModLoader's start script not to use Steam and not to ask about it. Without it the script stops and waits for an answer typed into the console, which the panel cannot give.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Terraria (tModLoader): `-config`

**Settings file** (Required). The text file with the world, password and the other settings. The Settings tab edits serverconfig.txt in the server's folder.

Example: `-config serverconfig.txt`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-tmlsavedirectory`

**Data folder** (Required). Where worlds, mods and each mod's settings are kept: a Worlds, a Mods and a ModConfigs folder below it. The panel keeps it in the server's own folder, so its backups find them. Changing it hides the existing worlds.

Example: `-tmlsavedirectory tmldata`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Terraria (tModLoader): `-port`

**Game port** (Network). The TCP port players connect to; the game's own default is 7777, which other servers here use. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports.

Example: `-port 7878`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Terraria (tModLoader): `-players`

**Max players** (Server). The most players that can be on the server at once, from 1 to 255. More players need more memory and a faster PC. (The game also accepts -maxplayers for the same thing.)

Example: `-players 8`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Terraria (tModLoader): `-ip`

**Bind address** (Network). Makes the server listen only on one IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all.

Example: `-ip 192.168.1.20`

### Terraria (tModLoader): `-noupnp`

**No auto port-forward** (Network). Turns off the automatic port-forwarding attempt (UPnP) when the server starts. Useful if you forward the port by hand.

### Terraria (tModLoader): `-secure`

**Extra cheat protection** (Server). Adds additional cheat protection to the server (the game's description of it). The same setting can be turned on in serverconfig.txt.

### `-banlist`

**Ban list file** (Saves and logs). The file that keeps banned players; banlist.txt in the server's folder if left off. No spaces: the start script that tModLoader ships splits a value with a space in it into two.

Example: `-banlist banlist.txt`

### `-worldrollbackstokeep`

**Rolling world backups to keep** (Saves and logs). How many automatic rolling backup copies of the world the game keeps; tModLoader's own menu starts its servers with 2. Not listed on the Terraria wiki, so whether a value given here is honoured was not tested. The copies are in the Worlds folder's Backups.

Example: `-worldrollbackstokeep 2`

### Terraria (tModLoader): `-language`

**Server language** (Server). The language of the server's own console messages. The same setting is a line in serverconfig.txt.

Values: `en-US` (English), `de-DE` (German), `it-IT` (Italian), `fr-FR` (French), `es-ES` (Spanish), `ru-RU` (Russian), `zh-Hans` (Chinese), `pt-BR` (Portuguese), `pl-PL` (Polish).

Example: `-language en-US`

### Terraria (tModLoader): `-disableannouncementbox`

**No announcement boxes** (Advanced). Stops the Announcement Box block from sending text messages to players when wire triggers it.

### Terraria (tModLoader): `-announcementboxrange`

**Announcement box range** (Advanced). How far, in pixels, an Announcement Box's message reaches. -1 means the whole server.

Example: `-announcementboxrange -1`

### `-modpack`

**Mod pack** (Mods). Loads only the mods in this named mod pack instead of the list in enabled.json. No spaces: the start script that tModLoader ships splits a value with a space in it into two.

Example: `-modpack friendsplaythrough`

### `-modpath`

**Mods folder** (Mods). The folder tModLoader loads .tmod files from. The panel leaves it at the Mods folder inside the data folder, where its backups look.

Example: `-modpath D:\Mods`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-steamworkshopfolder`

**Workshop mods folder** (Mods). Where Steam Workshop mods downloaded with SteamCMD are read from. The panel adds it when Workshop mods were asked for at creation. Use forward slashes and no spaces.

Example: `-steamworkshopfolder steamapps/workshop`

### `-savedirectory`

**Data folder (adds tModLoader)** (Advanced). Like the data folder above, but tModLoader is added to the end of the path. The panel uses -tmlsavedirectory instead; leave this off.

Example: `-savedirectory D:\srv`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Sven Co-op

Sven Co-op is started with `+word value` commands (the map, the player limit, the config file) and `-word` options (the port, the console). "Arguments start with a hyphen and parameters start with a plus sign", as the manual puts it. They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `SvenDS.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Sven Co-op: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. Required, or the server starts in graphical mode. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Sven Co-op: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to (UDP). The manual also lists TCP on the same number for the remote console. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 27355`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Sven Co-op: `+ip`

**Listen address** (Network). The network address the server listens on. Only needed if the computer has more than one IP address (virtual network cards such as VirtualBox, VMware and Hyper-V count) and you must choose which one to listen on.

Example: `+ip 0.0.0.0`

### `-sport`

**Anti-cheat port** (Network). The port for Valve Anti-Cheat (VAC) traffic. It starts at 26900 and, per the manual, moves up to the next free port if that one is taken, so it rarely needs setting.

Example: `-sport 26900`

### Sven Co-op: `+maxplayers`

**Max players** (Server). The most players on the server at one time, from 2 to 32. It is 12 if you do not give a number. The manual says most maps become overcrowded with more than 12 players.

Example: `+maxplayers 12`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Sven Co-op: `+map`

**Start map** (World). The map the server starts on: the map file's name without .bsp. Required: without it the server stays in a state nobody can connect to. A name that starts with a hyphen has to be put in quotes.

Example: `+map stadium4`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+servercfgfile`

**Config file** (Required). The server's settings file, which the Settings tab edits. The wiki says it has to be named on the launch line to be used when the server starts. The panel always writes it.

Example: `+servercfgfile server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Sven Co-op: `+log`

**Server log** (Saves and logs). Starts a log file for the server console. The manual recommends it. Only on is documented.

Values: `undefined`. Other values are accepted too.

Example: `+log on`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+logsdir`

**Log folder** (Saves and logs). The folder the server's logs are kept in. It starts as logs. Only useful with several servers sharing one install; the Logs tab looks in the svencoop\logs folder.

Example: `+logsdir logs`

### Sven Co-op: `-game`

**Game folder** (Advanced). Only needed if you run a mod on Sven Co-op's engine; otherwise leave it out. How a mod is installed for the server is not described anywhere the research could find.

Example: `-game svencoop`

## Counter-Strike: Source

Counter-Strike: Source is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Counter-Strike: Source: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Counter-Strike: Source: `-game`

**Game folder** (Required). Tells srcds which game to run. For Counter-Strike: Source this is cstrike. The panel always writes it.

Example: `-game cstrike`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Counter-Strike: Source: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to. Valve's page says Source also uses it for the remote console. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 27515`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Counter-Strike: Source: `-strictportbind`

**Stop if the port is taken** (Network). If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Counter-Strike: Source: `-ip`

**Listen address** (Network). The network address the server listens on, so players can reach it. It has to be an address of this PC. Only needed with several network cards; it has nothing to do with the address players use from outside.

Example: `-ip 0.0.0.0`

### Counter-Strike: Source: `-nohltv`

**No SourceTV** (Network). Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020.

### Counter-Strike: Source: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 10`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Counter-Strike: Source: `+map`

**Start map** (World). The map the server starts on, such as de_dust2. Give the map's name, with or without .bsp.

Example: `+map de_dust2`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Counter-Strike: Source: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the cstrike\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Counter-Strike: Source: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server. Valve's page says you need one if the server stops with the Steam connection error 18 or 106. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password.

Example: `+sv_setsteamaccount …`

### Counter-Strike: Source: `-nobots`

**No bots** (Game). Turns bots off for the whole server, which also saves CPU time on a weak PC.

### Counter-Strike: Source: `-condebug`

**Write the console to a file** (Saves and logs). Writes everything the console prints to console.log in the cstrike folder. The Logs tab reads that file.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Counter-Strike: Source: `-conclearlog`

**Start console.log afresh** (Saves and logs). Empties console.log every time the server starts. It only works together with the option above.

### Counter-Strike: Source: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line.

## Half-Life 2: Deathmatch

Half-Life 2: Deathmatch is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Half-Life 2: Deathmatch: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Half-Life 2: Deathmatch: `-game`

**Game folder** (Required). Tells srcds which game to run. For Half-Life 2: Deathmatch this is hl2mp. The panel always writes it.

Example: `-game hl2mp`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Half-Life 2: Deathmatch: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to. Valve's page says Source also uses it for the remote console. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 27435`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Half-Life 2: Deathmatch: `-strictportbind`

**Stop if the port is taken** (Network). If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Half-Life 2: Deathmatch: `-ip`

**Listen address** (Network). The network address the server listens on, so players can reach it. It has to be an address of this PC. Only needed with several network cards; it has nothing to do with the address players use from outside.

Example: `-ip 0.0.0.0`

### Half-Life 2: Deathmatch: `-nohltv`

**No SourceTV** (Network). Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020.

### Half-Life 2: Deathmatch: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts. Valve's examples use 24, while Linode's guide says the game officially supports 16.

Example: `+maxplayers 16`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Half-Life 2: Deathmatch: `+map`

**Start map** (World). The map the server starts on, such as dm_lockdown. Give the map's name without .bsp.

Example: `+map dm_lockdown`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Half-Life 2: Deathmatch: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server. Valve's page says you need one if the server stops with the Steam connection error 18 or 106. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password.

Example: `+sv_setsteamaccount …`

### Half-Life 2: Deathmatch: `-condebug`

**Write the console to a file** (Saves and logs). Writes everything the console prints to console.log in the hl2mp folder. The Logs tab reads that file.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Half-Life 2: Deathmatch: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line.

## Avorion

Avorion's galaxy, ports, name, player limit and admin are given on the command that starts it. The rest of its settings are in the galaxy's server.ini (the Settings tab). Whether a launch argument beats the same setting in server.ini is not documented. Changes apply the next time the server starts. These arguments are on the `bin\AvorionServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `--galaxy-name`

**Galaxy name** (Required). The galaxy to load or create. It is the folder name under galaxy, so a new name makes a new galaxy and keeps the old one. Changing it also moves where the panel looks for server.ini.

Example: `--galaxy-name "Avorion"`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `--datapath`

**Galaxies folder** (Required). The folder the galaxies are kept in, counted from the server's folder. The panel's backups and Settings tab expect it to be galaxy, so leave it.

Example: `--datapath galaxy`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `--server-name`

**Server name** (Server). The name shown when the server is queried and in the server list.

Example: `--server-name "My Avorion Server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--admin`

**Admin Steam ID** (Server). The 17-digit Steam64 id of the player who is the server's administrator. Without it nobody is admin. The wiki says the argument takes the id of the administrators; how to give several was not found.

Example: `--admin 76561198000000000`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--max-players`

**Max players** (Server). The most players that can be online at once. The default is 10.

Example: `--max-players 10`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--port`

**Game port** (Network). The port players connect to, UDP and TCP. The default is 27000, and a direct-IP join works only on that port. The panel's Ports section does not rewrite this argument: change it here and in the Ports section together.

Example: `--port 27000`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--query-port`

**Query port** (Network). The UDP port used to answer server queries. Only the Pterodactyl egg uses this argument and no page describes it; the panel sets it to the game port plus 4.

Example: `--query-port 27004`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--steam-query-port`

**Steam query port** (Network). The UDP port for Steam's server browser. Only the Pterodactyl egg uses this argument and no page describes it; the panel sets it to the game port plus 2.

Example: `--steam-query-port 27002`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--steam-master-port`

**Steam master port** (Network). The UDP port for Steam networking. Only the Pterodactyl egg uses this argument and no page describes it; the panel sets it to the game port plus 3.

Example: `--steam-master-port 27003`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--difficulty`

**Difficulty** (Rules). The difficulty of a new galaxy, from -3 to 3. The default is 0. The names come from one hosting site; the wiki gives only the numbers.

Values: `-3` (-3 Beginner), `-2` (-2 Easy), `-1` (-1 Normal), `0` (0 Veteran), `1` (1 Expert), `2` (2 Hardcore), `3` (3 Insane).

Example: `--difficulty 0`

### `--seed`

**Seed** (Rules). The seed a new galaxy is made from (letters and numbers). Only used when the galaxy is first made; changing it for an existing galaxy breaks its saves.

Example: `--seed MySeed1`

### `--infinite-resources`

**Infinite resources** (Rules). Gives all players unlimited resources. The wiki's table gives no default; the server.ini setting is off by default.

Values: `true` (Yes), `false` (No).

Example: `--infinite-resources true`

### `--collision-damage`

**Collision damage** (Rules). How much damage objects take when they collide, from 0 (none) to 1 (full). The default is 1.

Example: `--collision-damage 1`

### `--same-start-sector`

**Same start sector** (Rules). Whether all players start in the same sector. When false, each new player gets a random empty sector on the outer rim.

Values: `true` (Yes), `false` (No).

Example: `--same-start-sector true`

### `--save-interval`

**Save every (seconds)** (Saves). The time between automatic saves, in seconds. The default is 300 (5 minutes). The server.ini setting of the same purpose has a default of 600.

Example: `--save-interval 300`

### `--threads`

**Sector update threads** (Performance). How many threads update the sectors. Keep it at or below the number of processor cores.

Example: `--threads 4`

### `--public`

**Public** (Network). Whether the server lets other players join.

Values: `true` (Yes), `false` (No).

Example: `--public true`

### `--listed`

**List publicly** (Network). Whether the server shows up in the public server lists. It also needs Steam networking.

Values: `true` (Yes), `false` (No).

Example: `--listed true`

### `--use-steam-networking`

**Use Steam networking** (Network). Whether players join and are checked through Steam. A direct-IP join on a port other than 27000 needs this.

Values: `true` (Yes), `false` (No).

Example: `--use-steam-networking true`

### `--exit-on-last-admin-logout`

**Shut down when the last admin logs out** (Advanced). Shuts the server down when the last administrator leaves. The panel does not restart it, and the world is not saved by the panel on the way.

### `--stderr-to-log`

**Error output to the log file** (Saves). Sends the console's error output to the log file instead of the console window.

### `--stdout-to-log`

**Console output to the log file** (Saves). Sends the console's normal output to the log file instead of the console window. The window then shows nothing, but /save and /stop can still be typed into it.

## Minecraft (vanilla)

The server's own options are in `server.properties` (the Settings tab). The options here are the server program's arguments, which come after `server.jar` on the launch line. Changes apply the next time the server starts. The memory the server may use is set by the Max Memory field when the server is made. These arguments are on the `java` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `--nogui`

**No window** (Required). Starts the server without its own small window. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `--world`

**World name** (World). Uses this world folder instead of the one named in server.properties. The panel's backup follows the name in server.properties, so a backup will not include a world chosen here.

Example: `--world world`

### `--universe`

**Universe folder** (World). The folder the world name is relative to. Leave it off to use the server's own folder.

Example: `--universe C:\Minecraft\worlds`

### `--bonusChest`

**Bonus chest** (World). Adds the bonus chest to a world the first time it is made. Has no effect on a world that already exists.

### `--demo`

**Demo mode** (Advanced). Runs the server as the demo: players get a demo pop-up, and after five in-game days they cannot break or place blocks.

### `--safeMode`

**Vanilla data packs only** (Advanced). Makes the server load only the vanilla data pack, so other data packs are not loaded.

### `--serverId`

**Server ID** (Advanced). A name shown in crash reports, to tell this server's reports apart from others'.

Example: `--serverId main`

### `--eraseCache`

**Erase cached data** (Maintenance). Deletes the cached light and biome data so the server makes it again. The next start is slower.

### `--forceUpgrade`

**Upgrade the world** (Maintenance). Converts the world to the newest save format. After that, older versions of the game can no longer open the world. Make a backup first.

### `--recreateRegionFiles`

**Rebuild region files** (Maintenance). Like Upgrade the world, but also rewrites every chunk into fresh region files. Takes longer, and the same warning about older versions applies.

## Terraria (vanilla)

The game port and the player limit are given on the command that starts the server, and only there. The world, its name and the password are in serverconfig.txt. Changes apply the next time the server starts. These arguments are on the `TerrariaServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Terraria (vanilla): `-config`

**Settings file** (Required). The text file with the world, the password and the other settings. The Settings tab edits serverconfig.txt in the server's folder. The panel always writes it.

Example: `-config serverconfig.txt`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Terraria (vanilla): `-port`

**Game port** (Network). The TCP port players connect to. The game's own default is 7777, which two other servers here use, so this server starts at 7790. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 7790`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Terraria (vanilla): `-maxplayers`

**Max players** (Server). The most players that can be on the server at once, from 1 to 255. The wiki's default is 16 when this is left out, and more players need more memory.

Example: `-maxplayers 16`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Terraria (vanilla): `-ip`

**Bind address** (Network). Makes the server listen only on one IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all.

Example: `-ip 192.168.1.20`

### Terraria (vanilla): `-noupnp`

**No auto port-forward** (Network). Turns off the automatic port-forwarding attempt (UPnP) when the server starts. Useful if you forward the port by hand.

### Terraria (vanilla): `-disableannouncementbox`

**No announcement boxes** (Advanced). Stops the Announcement Box from sending its text messages when wire triggers it.

### Terraria (vanilla): `-announcementboxrange`

**Announcement box range** (Advanced). How far, in pixels, an Announcement Box's message reaches. -1 sends it to the whole server.

Example: `-announcementboxrange -1`

## The Forest

The arguments that start The Forest's server. The panel writes them when the server is created, and the first two are the ones the game needs to find its files. Changes apply the next time the server starts. These arguments are on the `TheForestDedicatedServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### The Forest: `-batchmode`

**Batch mode** (Required). Runs the server without a game window, as the egg does. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### The Forest: `-nographics`

**No graphics** (Required). Starts the server without drawing graphics, which a server does not need. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-nosteamclient`

**No Steam client** (Required). Runs the server without the Steam client, as the egg does. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-serverPasswordAdmin`

**Admin password** (Required). The password that unlocks the in-game admin commands. Set when the server is created; it is not shown here so it stays out of view.

Example: `-serverPasswordAdmin (your password)`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-inittype`

**Start type** (Save). New starts a new world. Continue loads the one already saved in the save folder. The dossier gives the two values only; what a New start does to an existing save is not known.

Values: `New` (New (start a new world)), `Continue` (Continue (load the saved world)).

Example: `-inittype New`

### `-savefolderpath`

**Save folder** (Folders). The folder the saves are kept in, counted from the server's folder. The panel writes the same folder it backs up.

Example: `-savefolderpath TheForestDedicatedServer_Data`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-configfilepath`

**Config file** (Folders). The config file the server reads, counted from the server's folder. The panel writes config.cfg at this path. Whether the game reads this path is not verified.

Example: `-configfilepath TheForestDedicatedServer_Data\forest\config\config.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Wurm Unlimited

Wurm Unlimited's launcher is started with arguments written `name=value`, with no dash in front. The world, ports, name, player limit and passwords are written by the panel when the server is created. The optional arguments below can be added here. Changes apply the next time the server starts. These arguments are on the `WurmServerLauncher.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `start`

**World** (Required). The world the server loads: the name of a folder in the server's folder, made first with the game's own launcher. Creative and Adventure are the names the research gives.

Example: `start=Creative`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `externalport`

**Game port (TCP)** (Network). The TCP port players connect through. The default is 3724. The panel's Ports section does not rewrite this argument: change it here and in the Ports section together.

Example: `externalport=3724`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Wurm Unlimited: `queryport`

**Steam query port (UDP)** (Network). The UDP port the Steam server browser asks for the server's details on. The research gives the range 27016 to 27030 for it.

Example: `queryport=27020`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Wurm Unlimited: `maxplayers`

**Max players** (Server). The most players that can be online at once. The panel writes the number chosen when the server is created.

Example: `maxplayers=25`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `servername`

**Server name** (Server). The name shown in the server browser, in quotes. The research gives a limit of 64 characters.

Example: `servername="My Wurm Server"`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `serverpassword`

**Server password** (Server). The password players must enter to join. Set when the server is created; it is not shown here so it stays out of view.

Example: `serverpassword=(your password)`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `adminpwd`

**Admin password** (Server). The password that unlocks the in-game admin commands. Set when the server is created; it is not shown here so it stays out of view.

Example: `adminpwd=(your password)`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Wurm Unlimited: `ip`

**Listen address** (Network). The IP address the server binds to. Leave it out unless the server's default network address is not the one players should use.

Example: `ip=0.0.0.0`

### `homekingdom`

**Home kingdom** (Server). The kingdom the server belongs to, when it is a home server. The numbers are the ones the game's own launcher lists.

Values: `0` (0 No kingdom), `1` (1 Jenn-Kellon), `2` (2 Mol-Rehan), `3` (3 Horde of the Summoned), `4` (4 Freedom).

Example: `homekingdom=4`

### `homeserver`

**Home server** (Server). Whether the server is a home server, which belongs to a single kingdom. The research gives no default.

Values: `true` (Yes), `false` (No).

Example: `homeserver=true`

### `pvp`

**Player versus player** (Rules). Turns player-versus-player fighting on or off on the server. The research gives no default.

Values: `true` (Yes), `false` (No).

Example: `pvp=true`

### `epicsettings`

**Epic settings** (Rules). When on, the server follows the rules of the official Epic servers, for example the skill curve. The research gives no default.

Values: `true` (Yes), `false` (No).

Example: `epicsettings=false`

### `loginserver`

**Login server** (Network). Whether this server acts as a login server. The default is on. Turn it off only if another server is meant to act as the login server.

Values: `true` (Yes), `false` (No).

Example: `loginserver=true`

## Mordhau

The arguments that start Mordhau's server. The map is the first word after the program and is not in this form; to change it, edit the start script by hand. The panel writes the ports when the server is created. Changes apply the next time the server starts. These arguments are on the `MordhauServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### `-MaxSlots`

**Max players** (Server). The most players that can be on the server at once. The Pterodactyl egg's example is 48. A hosting guide says going much past 64 tends to hurt performance.

Example: `-MaxSlots=48`

### Mordhau: `-Port`

**Game port** (Network). The UDP port players connect to. Written by the panel when the server is created. The form does not change it: edit the start script by hand and keep the flag.

Example: `-Port=25900`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Mordhau: `-queryport`

**Query port** (Network). The UDP port the server browser asks for the server's details. Written by the panel when the server is created; change it by editing the start script by hand.

Example: `-queryport=25902`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Mordhau: `-beaconport`

**Beacon port** (Network). The UDP port the server's beacon uses, one per server on a PC. Written by the panel when the server is created; change it by editing the start script by hand.

Example: `-beaconport=25903`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Team Fortress 2

Team Fortress 2 is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Team Fortress 2: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Team Fortress 2: `-game`

**Game folder** (Required). Tells srcds which game to run. For Team Fortress 2 this is tf. The panel always writes it.

Example: `-game tf`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Team Fortress 2: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to. The remote console uses the same number over TCP. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 27615`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Team Fortress 2: `-strictportbind`

**Stop if the port is taken** (Network). If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Team Fortress 2: `-ip`

**Listen address** (Network). The network address the server binds to. Only needed with several network cards or to pick one address of this PC. It is not the address players use from outside.

Example: `-ip 0.0.0.0`

### Team Fortress 2: `-nohltv`

**No SourceTV** (Network). Turns SourceTV (the spectator broadcast) off and closes its port, which is usually UDP 27020.

### Team Fortress 2: `+maxplayers`

**Max players** (Server). The number of player slots on the server, up to 32. It is only read when the server starts.

Example: `+maxplayers 24`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Team Fortress 2: `+map`

**Start map** (World). The map the server starts on, such as ctf_2fort. Give the map's name, with or without .bsp.

Example: `+map ctf_2fort`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Team Fortress 2: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the tf\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Team Fortress 2: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server. The dossier says one is needed to show in the public server browser; without it the server still runs. Create one at steamcommunity.com/dev/managegameservers (Team Fortress 2 is app 440). Treat it like a password.

Example: `+sv_setsteamaccount …`

### Team Fortress 2: `-condebug`

**Write the console to a file** (Saves and logs). Writes everything the console prints to console.log in the game's folder. The Logs tab reads that file.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Team Fortress 2: `-conclearlog`

**Start console.log afresh** (Saves and logs). Empties console.log every time the server starts. It only works together with the option above.

### Team Fortress 2: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server without Valve Anti-Cheat (VAC). VAC is on unless this is on the line.

## Counter-Strike 2

Counter-Strike 2 is started with `-word` launch options (the port, the player limit) and `+word value` console commands (the map, the settings file). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `cs2.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Counter-Strike 2: `-dedicated`

**Dedicated server** (Required). Runs the game as a dedicated server with no game window. Without it the game opens as a normal player program. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Counter-Strike 2: `-port`

**Game port** (Network). The UDP port players connect to and the server list uses. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 27065`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Counter-Strike 2: `-ip`

**Listen address** (Network). The address the server binds to, when this PC has several network cards and the server must use one of them. Leave it out otherwise.

Example: `-ip 0.0.0.0`

### Counter-Strike 2: `-maxplayers`

**Max players** (Server). The number of player slots on the server. It is read when the server starts.

Example: `-maxplayers 10`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Counter-Strike 2: `+sv_setsteamaccount`

**Steam login token** (Server). A Game Server Login Token (GSLT) for this server, from steamcommunity.com/dev/managegameservers with app ID 730. Without one the server is LAN-only and is not listed publicly. Each token belongs to one server, and it is a secret: do not share it.

Example: `+sv_setsteamaccount …`

### Counter-Strike 2: `+map`

**Start map** (World). The map the server starts on, such as de_dust2.

Example: `+map de_dust2`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+game_alias`

**Game mode** (World). The game mode the server starts in: competitive (the game's default), wingman, casual, deathmatch or custom. The Settings tab's mode file is the competitive one.

Example: `+game_alias casual`

### Counter-Strike 2: `+exec`

**Settings file** (Server). The settings file the server runs at start-up, from the game's cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Counter-Strike 2: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server with Valve Anti-Cheat (VAC) turned off. Leave it off unless you have a reason to change it.

## Insurgency: Sandstorm

The extra arguments that start Insurgency: Sandstorm's server. The map, the scenario and the player limit sit on the map address before the arguments, and the form does not change them: to change them, edit the start script by hand. The panel writes the ports, the server name and the login token when the server is created. These arguments are on the `InsurgencyServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Insurgency: Sandstorm: `-log`

**Log window** (Logging). Opens the server's log window, which shows what the server prints. The guide describes it as enabling the log window; the panel starts the server with it on.

### `-ruleset`

**Rule set** (Browser). Set to OfficialRules to list the server under the browser's official-rules filter, which the mod.io guide gives as the way to opt in. Leave it out for a custom server.

Example: `-ruleset=OfficialRules`

### `-mutators`

**Mutators (game variants)** (Game). Turns on game variants such as HeadshotOnly or HotPotato. List several with commas and no spaces. Each variant's own settings are in Game.ini, which this form does not show.

Example: `-mutators=HeadshotOnly`

### Insurgency: Sandstorm: `-Port`

**Game port** (Network). The UDP port players connect to. Written by the panel when the server is created. Change it by editing the start script by hand.

Example: `-Port=25940`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Insurgency: Sandstorm: `-QueryPort`

**Query port** (Network). The port the server browser asks for the server's details (UDP and TCP). Written by the panel when the server is created; change it by editing the start script by hand.

Example: `-QueryPort=25942`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-hostname`

**Server name** (Server). The name shown in the server browser. Written by the panel from the Server Name field when the server is created.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-GSLTToken`

**Steam login token** (Access). The Steam game-server login token, written from the form when the server is created. It is made for app 581320 at steamcommunity.com/dev/managegameservers.

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Left 4 Dead

Left 4 Dead is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Left 4 Dead: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Left 4 Dead: `-game`

**Game folder** (Required). Tells srcds which game to run. For Left 4 Dead this is left4dead. The panel always writes it.

Example: `-game left4dead`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Left 4 Dead: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to. Valve's page says Source also uses it for the remote console. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25950`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Left 4 Dead: `-ip`

**Listen address** (Network). The network address the server listens on. Valve's page allows an address of this PC or 0.0.0.0 for all of them. Only needed with several network cards.

Example: `-ip 0.0.0.0`

### Left 4 Dead: `-nohltv`

**No SourceTV** (Network). Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020.

### Left 4 Dead: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 8`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Left 4 Dead: `+map`

**Start map** (World). The map the server starts on, such as l4d_hospital01_apartment. Give the map's name, with or without .bsp.

Example: `+map l4d_hospital01_apartment`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Left 4 Dead: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the left4dead\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Left 4 Dead: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server. Valve's page says you need one if the server stops with the Steam connection error 18 or 106. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password.

Example: `+sv_setsteamaccount …`

### Left 4 Dead: `-nobots`

**No bots** (Game). Turns bots off for the whole server, which also saves CPU time on a weak PC.

### Left 4 Dead: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server without Valve Anti-Cheat (VAC). Valve's page says this is what the option does; leave it off unless you know you need it.

## Zombie Panic! Source

Zombie Panic! Source is started with `-word value` launch options (the game, the port, the player limit) and `+word value` console commands (the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Zombie Panic! Source: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Zombie Panic! Source: `-game`

**Game folder** (Required). Tells srcds which game to run. For Zombie Panic! Source this is zps. The panel always writes it.

Example: `-game zps`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Zombie Panic! Source: `-dedicated`

**Dedicated server** (Required). Starts the program as a dedicated server. The panel always writes it, as the community's Windows start line does.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Zombie Panic! Source: `-secure`

**Turn on Valve Anti-Cheat** (Advanced). Turns Valve Anti-Cheat (VAC) on. The ZPS guide says servers without VAC are hidden from the server browser's list but still show in Steam's. Remove it from the line to start without VAC.

### Zombie Panic! Source: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to. Valve's page says Source also uses it for the remote console. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25952`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Zombie Panic! Source: `-strictportbind`

**Stop if the port is taken** (Network). If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it.

### Zombie Panic! Source: `-maxplayers`

**Max players** (Server). The number of player slots on the server. The ZPS guide says 24 is the most ZPS supports. It is only read when the server starts.

Example: `-maxplayers 20`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Zombie Panic! Source: `+map`

**Start map** (World). The map the server starts on, such as zpo_biotec. Give the map's name, with or without .bsp.

Example: `+map zpo_biotec`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Zombie Panic! Source: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server. Valve's page says you need one if the server stops with the Steam connection error 18 or 106. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password.

Example: `+sv_setsteamaccount …`

### Zombie Panic! Source: `-nobots`

**No bots** (Game). Turns bots off for the whole server, which also saves CPU time on a weak PC.

### Zombie Panic! Source: `-nohltv`

**No SourceTV** (Network). Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020.

## BrainBread 2

BrainBread 2 is started with `-word value` launch options (the game, the port, the console) and `+word value` console commands (the map, the player limit, the address). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### BrainBread 2: `-console`

**Console window** (Required). Runs the server in console mode, a text window. The vendor guide says the server can only restart automatically in this mode. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### BrainBread 2: `-game`

**Game folder** (Required). Tells srcds which game to run. For BrainBread 2 this is BrainBread2. The panel always writes it.

Example: `-game BrainBread2`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### BrainBread 2: `-secure`

**Turn on Valve Anti-Cheat** (Advanced). Turns Valve Anti-Cheat (VAC) protection on for the server. The vendor guide says you can remove it if you do not want VAC.

### BrainBread 2: `+map`

**Start map** (World). The map the server starts on, such as bbc_termoil. The vendor guide says this command should not be removed. Give the map's name, with or without .bsp.

Example: `+map bbc_termoil`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### BrainBread 2: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 12`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### BrainBread 2: `-port`

**Game port** (Network). The port the server listens on. The vendor guide says it can be changed to anywhere from 27015 to 27020, and the panel's default is outside that range: test a server before relying on it (see the guide).

Example: `-port 25954`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### BrainBread 2: `+ip`

**Server address** (Network). The address the server listens on. The vendor guide says to use this PC's own address, not 127.0.0.1. 0.0.0.0 means all of this PC's addresses; the guide's advice is not confirmed for the panel's default.

Example: `+ip 0.0.0.0`

### BrainBread 2: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the brainbread2\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### BrainBread 2: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password.

Example: `+sv_setsteamaccount …`

## Day of Defeat: Source

Day of Defeat: Source is started with `-word` launch options (the game folder, the port, VAC) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Day of Defeat: Source: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Day of Defeat: Source: `-game`

**Game folder** (Required). Tells srcds which game to run. For Day of Defeat: Source this is dod. The panel always writes it.

Example: `-game dod`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Day of Defeat: Source: `-secure`

**Valve Anti-Cheat (VAC)** (Security). Runs the server with Valve Anti-Cheat (VAC) protection. The guides say to remove it only if you do not want VAC.

### Day of Defeat: Source: `-port`

**Game port** (Network). The port the server uses and players connect to. The guides allow 27015 to 27020; change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25965`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Day of Defeat: Source: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 32`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Day of Defeat: Source: `+map`

**Start map** (World). The map the server starts on, such as dod_anzio. Give the map's name, with or without .bsp.

Example: `+map dod_anzio`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Day of Defeat: Source: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the dod\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Day of Defeat: Source: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server, which other players need to find it in the public list. Create one at steamcommunity.com/dev/managegameservers for game id 232290. Treat it like a password.

Example: `+sv_setsteamaccount …`

## Fistful of Frags

Fistful of Frags is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Fistful of Frags: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Fistful of Frags: `-game`

**Game folder** (Required). Tells srcds which game to run. For Fistful of Frags this is fof. The panel always writes it.

Example: `-game fof`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Fistful of Frags: `-port`

**Game port** (Network). The port the server uses and players connect to. The guides use 27015 as the default; change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25975`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Fistful of Frags: `-insecure`

**Turn off Valve Anti-Cheat** (Security). Starts the server without Valve Anti-Cheat (VAC). Only use it if you know why you want that.

### `-norestart`

**Do not restart on a crash** (Advanced). Stops the server from trying to restart itself after it fails.

### Fistful of Frags: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 16`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Fistful of Frags: `+map`

**Start map** (World). The map the server starts on, such as fof_fistful or fof_revenge. Give the map's name, with or without .bsp.

Example: `+map fof_fistful`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Fistful of Frags: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the fof\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## No More Room in Hell

No More Room in Hell is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### No More Room in Hell: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### No More Room in Hell: `-game`

**Game folder** (Required). Tells srcds which game to run. For No More Room in Hell this is nmrih. The panel always writes it.

Example: `-game nmrih`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### No More Room in Hell: `-port`

**Game port** (Network). The port the server uses and players connect to. The generic default is 27015; change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25985`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### No More Room in Hell: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 8`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### No More Room in Hell: `+map`

**Start map** (World). The map the server starts on, such as nmo_broadway. Give the map's name, with or without .bsp.

Example: `+map nmo_broadway`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### No More Room in Hell: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the nmrih\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### No More Room in Hell: `+sv_setsteamaccount`

**Steam login token** (Server). A Steam Game Server Login Token for this server, which other players need to join. Create one at steamcommunity.com/dev/managegameservers for game id 317670. Treat it like a password.

Example: `+sv_setsteamaccount …`

## Insurgency (2014)

Insurgency (2014) is started with `-word` launch options (the console window, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Insurgency (2014): `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Insurgency (2014): `-port`

**Game port** (Network). The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes.

Example: `-port 25934`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Insurgency (2014): `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 32`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Insurgency (2014): `+map`

**Start map** (World). The map the server starts on, such as market_coop. Give the map's name, with or without .bsp.

Example: `+map market_coop`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Insurgency (2014): `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the insurgency\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Insurgency (2014): `-insecure`

**Run without Valve Anti-Cheat** (Security). Starts the server without Valve Anti-Cheat (VAC). Leave it off unless you know you need it; the Valve page only describes what the flag does.

### Insurgency (2014): `-nobots`

**No bots** (Server). Turns bots off on the server, so only real players fill the slots.

### Insurgency (2014): `-nohltv`

**No SourceTV** (Network). Turns off SourceTV, the spectator broadcast, and closes its port (usually 27020).

## Pirates, Vikings, and Knights II

Pirates, Vikings, and Knights II is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds_win64.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Pirates, Vikings, and Knights II: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Pirates, Vikings, and Knights II: `-game`

**Game folder** (Required). Tells srcds which game to run. For Pirates, Vikings, and Knights II this is pvkii. The panel always writes it.

Example: `-game pvkii`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Pirates, Vikings, and Knights II: `-strictportbind`

**Stop if the port is taken** (Network). Makes the server quit with an error if it cannot use its port, rather than starting on another one. Keeps a clash visible.

### Pirates, Vikings, and Knights II: `-port`

**Game port** (Network). The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes.

Example: `-port 25922`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Pirates, Vikings, and Knights II: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 24`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Pirates, Vikings, and Knights II: `+map`

**Start map** (World). The map the server starts on, such as bt_island. Give the map's name, with or without .bsp.

Example: `+map bt_island`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Pirates, Vikings, and Knights II: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the pvkii\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Dystopia

Dystopia is started with `-word` launch options (the console window, the game folder, the port, VAC) and `+word value` console commands (the map, the settings file). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Dystopia: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Dystopia: `-game`

**Game folder** (Required). Tells srcds where the game's folder is, relative to the server's bin\win32 folder. The panel always writes it.

Example: `-game ..\..\dystopia`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Dystopia: `-port`

**Game port** (Network). The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes.

Example: `-port 25924`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Dystopia: `+map`

**Start map** (World). The map the server starts on, such as dys_vaccine. Give the map's name, with or without .bsp.

Example: `+map dys_vaccine`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Dystopia: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the dystopia\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Dystopia: `-insecure`

**Run without Valve Anti-Cheat** (Security). Starts the server without Valve Anti-Cheat (VAC). Leave it off unless you know you need it; the Valve page only describes what the flag does.

### Dystopia: `-nobots`

**No bots** (Server). Turns bots off on the server, so only real players fill the slots.

### Dystopia: `-nohltv`

**No SourceTV** (Network). Turns off SourceTV, the spectator broadcast, and closes its port (usually 27020).

## Empires

Empires is started with `-word` launch options (the game folder, the port, the console) and `+word value` console commands (the map, the player limit). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Empires: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Empires: `-game`

**Game folder** (Required). Tells srcds which game to run. For Empires this is empires. The panel always writes it.

Example: `-game empires`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-toconsole`

**Send output to the console** (Saves and logs). Sends the server's output to its console window, where the panel's window shows it. Kept from the research's example launch line.

### Empires: `-secure`

**Use Valve Anti-Cheat** (Advanced). Starts the server with Valve Anti-Cheat (VAC) protection. It came from the research's example launch line; the research could not confirm it on the current build.

### Empires: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25926`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Empires: `+maxplayers`

**Max players** (Server). How many people can be on the server at once, from 1 to 64. It is only read when the server starts.

Example: `+maxplayers 62`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Empires: `+map`

**Start map** (World). The map the server starts on, such as con_district402. Give the map's name, without .bsp.

Example: `+map con_district402`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Empires: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the empires\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Double Action: Boogaloo

Double Action is started with `-word` launch options (the game folder, the port, the console) and `+word value` console commands (the map, the player limit). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Double Action: Boogaloo: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Double Action: Boogaloo: `-game`

**Game folder** (Required). Tells srcds which game to run. For Double Action this is dab. The panel always writes it.

Example: `-game dab`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Double Action: Boogaloo: `-port`

**Game port** (Network). The port the server listens on and tells players to connect to. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25928`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Double Action: Boogaloo: `+maxplayers`

**Max players** (Server). How many players can be on the server at once. It is only read when the server starts. The research's largest figure is 24.

Example: `+maxplayers 10`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Double Action: Boogaloo: `+map`

**Start map** (World). The map the server starts on, such as da_rooftops. Give the map's name, without .bsp.

Example: `+map da_rooftops`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Double Action: Boogaloo: `+exec`

**Settings file** (Server). The settings file the server runs when it starts. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Double Action: Boogaloo: `+ip`

**Listen address** (Network). The network address of this PC the server listens on. Only needed with several network cards. It has to be an address of this PC, not 127.0.0.1.

Example: `+ip 0.0.0.0`

### Double Action: Boogaloo: `-nohltv`

**No SourceTV** (Network). Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020.

### Double Action: Boogaloo: `-insecure`

**Turn off Valve Anti-Cheat** (Advanced). Starts the server without Valve Anti-Cheat (VAC). Servers run with VAC on unless this is on the line.

### `-ignoresigint`

**Ignore Ctrl+C** (Advanced). Stops Ctrl+C from quitting the server (Valve's list says it prevents Ctrl+C quitting). Not confirmed for this game.

## Half-Life Dedicated Server

Half-Life Dedicated Server is started with `-word` launch options (the game folder, the port, the settings file) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. These arguments are on the `hlds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Half-Life Dedicated Server: `-console`

**Console window** (Required). Runs the server in console mode, a text window you can type commands into. The guide says this works on Windows; the panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Half-Life Dedicated Server: `-game`

**Game folder** (Required). Tells the server which game to run. cstrike is Counter-Strike 1.6. The panel always writes it.

Example: `-game cstrike`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Half-Life Dedicated Server: `-port`

**Game port** (Network). The port the server uses and players connect to. The default in the guides is 27015; change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25944`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Half-Life Dedicated Server: `-nomaster`

**Hide from the server browser** (Network). Keeps the server out of the public server browser. Its guide also says it turns off server queries.

### Half-Life Dedicated Server: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 32`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Half-Life Dedicated Server: `+map`

**Start map** (World). The map the server starts on, such as de_dust2. Give the map's name without .bsp.

Example: `+map de_dust2`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Half-Life Dedicated Server: `-exec`

**Settings file** (Server). The settings file the server runs when it starts, from the cstrike folder. The panel writes it, and the Settings tab edits it.

Example: `-exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## IOSoccer

IOSoccer is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds_win64.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### IOSoccer: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### IOSoccer: `-game`

**Game folder** (Required). Tells srcds which game to run. For IOSoccer this is iosoccer. The panel always writes it.

Example: `-game iosoccer`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### IOSoccer: `-port`

**Game port** (Network). The port the server uses and players connect to. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 25948`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### IOSoccer: `+maxplayers`

**Max players** (Server). The number of player slots on the server, from 2 to 33 (spectators included, per a hosting guide). It is only read when the server starts.

Example: `+maxplayers 32`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### IOSoccer: `+map`

**Start map** (World). The map the server starts on, such as 8v8_vienna. Give the map's name, without .bsp.

Example: `+map 8v8_vienna`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### IOSoccer: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the iosoccer\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## BATTALION: Legacy

The arguments that start BATTALION: Legacy's server. The panel writes them when the server is created, and the Launch options form can add more at the end of the line. Changes apply the next time the server starts. These arguments are on the `BattalionServer.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### BATTALION: Legacy: `-Port`

**Game port** (Network). The UDP port players connect to. The server also opens the port above it. The panel writes it when the server is created. Change it from the server's Ports section so the panel can check for clashes.

Example: `-Port=25956`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### BATTALION: Legacy: `-QueryPort`

**Query port** (Network). The UDP port the server browser asks for the server's details. The panel writes it when the server is created. Change it from the server's Ports section so the panel can check for clashes.

Example: `-QueryPort=25958`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### BATTALION: Legacy: `-SteamServerName`

**Server name** (Server). The name shown in the server browser. Up to 60 characters, the limit the Pterodactyl egg for this game uses. Written with quotes around it.

Example: `-SteamServerName="My Battle Server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### BATTALION: Legacy: `-AdminPassword`

**Admin password** (Access). The password a player types in the game's console, with Server.Login followed by it, to get admin commands. Up to 20 characters, the limit the Pterodactyl egg uses. It is kept on the start command, so anyone who can read the start script can see it.

Example: `-AdminPassword="secret"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Black Mesa

Black Mesa is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Black Mesa: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Black Mesa: `-game`

**Game folder** (Required). Tells srcds which game to run. For Black Mesa this is bms, and the guides say not to change it. The panel always writes it.

Example: `-game bms`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Black Mesa: `-strictportbind`

**Stop if the port is taken** (Network). Makes the server quit with an error if it cannot use its port, rather than starting on another one. Keeps a clash visible.

### Black Mesa: `-port`

**Game port** (Network). The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes.

Example: `-port 25916`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Black Mesa: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 24`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Black Mesa: `+map`

**Start map** (World). The map the server starts on, such as dm_crossfire. Give the map's file name without .bsp.

Example: `+map dm_crossfire`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Black Mesa: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the bms\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## Military Conflict: Vietnam

Military Conflict: Vietnam is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line. These arguments are on the `srcds_x64.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Military Conflict: Vietnam: `-console`

**Console window** (Required). Runs the server in console mode: a text window you can type commands into. The panel always writes it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Military Conflict: Vietnam: `-game`

**Game folder** (Required). Tells srcds which game folder to run. For Military Conflict: Vietnam this is vietnam. The panel always writes it.

Example: `-game vietnam`

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Military Conflict: Vietnam: `-port`

**Game port** (Network). The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes.

Example: `-port 25970`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Military Conflict: Vietnam: `+maxplayers`

**Max players** (Server). The number of player slots on the server. It is only read when the server starts.

Example: `+maxplayers 24`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Military Conflict: Vietnam: `+map`

**Start map** (World). The map the server starts on, such as mcv_bridge. Give the map's name, without .bsp.

Example: `+map mcv_bridge`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Military Conflict: Vietnam: `+exec`

**Settings file** (Server). The settings file the server runs when it starts, from the vietnam\cfg folder. The panel writes it, and the Settings tab edits it.

Example: `+exec server.cfg`

Not offered in the Launch options form; the panel sets it and it is best left alone.

## SCP: Secret Laboratory

LocalAdmin starts the game and keeps it running. Its options are written after the port on the start line. They are read when the server starts, so a change applies the next time the server starts. The two options marked as always written are set by the panel so the server starts without stopping to ask a question. These arguments are on the `LocalAdmin.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### `--acceptEULA`

**Accept the end user licence** (Required). Accepts the game's end user licence agreement, so LocalAdmin does not stop to ask. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--useDefault`

**Use the default settings** (Required). If LocalAdmin has no configuration yet, it uses the default one instead of asking questions in its window. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `--restartsLimit`

**Automatic restart limit** (Restarts). How many times LocalAdmin restarts the game within the time window below. 0 turns automatic restarts off, and -1 removes the limit. The default is 4.

Example: `--restartsLimit 4`

### `--restartsTimeWindow`

**Restart time window (seconds)** (Restarts). The length of the time, in seconds, that the restart limit counts over. 0 stops the count from ever resetting. The default is 480.

Example: `--restartsTimeWindow 480`

### `--logLengthLimit`

**Log size limit** (Logs). The most characters LocalAdmin's own log file can hold. The suffixes k, M, G and T are allowed, and 0 removes the limit. The default is 25G.

Example: `--logLengthLimit 25G`

### `--logEntriesLimit`

**Log entry limit** (Logs). The most entries LocalAdmin's own log file can hold. The same suffixes are allowed, and 0 removes the limit. The default is 10G.

Example: `--logEntriesLimit 10G`

### `--noLogs`

**Turn off LocalAdmin's logs** (Logs). Stops LocalAdmin writing its own log files. The game's own output is not affected by this option.

## Rising World

The panel starts the server with the two flags a Unity server needs to run with no window. Everything else is set in server.properties, not on the launch line: the old Java server's `+serverport` and similar arguments are ignored by this build. These arguments are on the `RisingWorldServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Rising World: `-batchmode`

**Run without a window** (Required). Starts the Unity program in batch mode, with no interactive window. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Rising World: `-nographics`

**No graphics** (Required). Tells Unity not to start a graphics device, which a server does not have. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Natural Selection 2

The panel writes the name, the map, the player limit, the port and the config folder. Map and player limit can be changed here. Workshop mods go in with -mods and are added at the end of the line. These arguments are on the `Server.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Natural Selection 2: `-name`

**Server name** (Required). The name shown in the server list. The panel writes it from the Server Name you typed when you created the server.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-map`

**Start map** (World). The map the server starts on. The name is case sensitive, such as ns2_summit. The server then follows MapCycle.json.

Example: `-map ns2_summit`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-limit`

**Player limit** (Players). The most players who can join at once. The dossier's example is 20; the game's own default is not in the sources.

Example: `-limit 20`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Natural Selection 2: `-port`

**Game port** (Network). The port the server listens on and players connect to. Change it from the server's Ports section so the panel can check for clashes.

Example: `-port 27040`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-config_path`

**Config folder** (Files). The folder the server reads its config files from. The panel points it at the config folder inside the server's folder, so the settings can be edited here.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### `-logdir`

**Log folder** (Files). The folder the server writes its log to. The panel points it at the serverlogs folder inside the server's folder so the Logs tab can show it.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Natural Selection 2: `-mods`

**Workshop mods** (Mods). Steam Workshop IDs of mods to load, in hexadecimal, separated by spaces. The server downloads them when it starts. Remove the flag to run without mods.

Example: `-mods 706d242 812f004`

## Chivalry: Medieval Warfare

The panel starts the server with the map, the ports and two flags the dossier says the server needs. The launch line is not editable yet: the game's full list of options is not confirmed. These arguments are on the `UDK.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### `-dedicated=true`

**Dedicated server** (Required). Tells the program to run as a dedicated server, with no player window. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-seekfreeloadingserver`

**Seek-free loading** (Required). A flag the game's own setup asks for. Removing it can stop the server from starting, so the panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Hurtworld

The panel starts the server headless and passes the ports and the server name in one -exec string. Every flag here is written by the panel, so none can be changed from this form. These arguments are on the `Hurtworld.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Hurtworld: `-batchmode`

**Run without a window** (Required). Starts the game in batch mode, with no interactive window. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Hurtworld: `-nographics`

**No graphics** (Required). Tells the game not to start a graphics device, which a server does not have. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Hurtworld: `-exec`

**Startup commands** (Server). A quoted list of commands separated by semicolons. The panel writes the game port (host), the query port and the server name from the Ports and Server Name fields.

Example: `-exec "host 12871;queryport 12881;servername My Server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Hurtworld: `-logfile`

**Log file** (Logs). The file the server writes its log to, in the server's folder. The panel reads it for the Logs tab.

Example: `-logfile "gamelog.txt"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Euro Truck Simulator 2

The panel starts the server with one flag: the folder that holds its settings, package files and log. Nothing else on that line is set from here, so it cannot be changed in this form. These arguments are on the `eurotrucks2_server.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Euro Truck Simulator 2: `-homedir`

**Server home folder** (Files). The folder the server keeps its server_config.sii, its package files and its log in. The panel sets it to the data folder inside the server's folder.

Example: `-homedir "C:\Servers\ets2\data"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## American Truck Simulator

The panel starts the server with one flag: the folder that holds its settings, package files and log. Nothing else on that line is set from here, so it cannot be changed in this form. These arguments are on the `amtrucks_server.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### American Truck Simulator: `-homedir`

**Server home folder** (Files). The folder the server keeps its server_config.sii, its package files and its log in. The panel sets it to the data folder inside the server's folder.

Example: `-homedir "C:\Servers\ats\data"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Stationeers

The panel starts the dedicated server headless with a save called Panel (made the first time from the world type you pick, then loaded on every start), and passes the name, the ports, the visibility and the password on one -settings line. Every flag here is written by the panel, so none can be changed from this form. These arguments are on the `rocketstation_DedicatedServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### `-LOAD`

**Save and world type** (World). The save name (always Panel) and the world type from the World Type field: Mars2, Europa3, Lunar, MimasHerschel, Venus or Vulcan2. The first start creates the save; every later start loads it, so the world survives restarts.

Example: `-LOAD Panel Mars2`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Stationeers: `-settings`

**Settings** (Server). The server's settings as Name value pairs: the server name, whether it is listed, the two ports, and the password if one is set. The panel writes them from the create form.

Example: `-settings ServerName "My Station" ServerVisible true GamePort 27816 UpdatePort 27818`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Wreckfest

The panel starts the server with -s, which tells it to read the settings file named by server_config=. Every setting is in server_config.cfg, not on the launch line. These arguments are on the `Wreckfest_x64.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### `-s`

**Run as a server** (Required). Starts the program as a dedicated server, reading the settings file that the next argument names. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Operation: Harsh Doorstop

The panel starts the server with the map, the server name and the ports. Every flag here is written by the panel, so none can be changed from this form. The flags are the ones the community start line uses; their meaning is only partly documented. These arguments are on the `HarshDoorstopServer-Win64-Shipping.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Operation: Harsh Doorstop: `-SteamServerName`

**Server name** (Server). The name shown in the server browser. The panel writes it from the Server Name you typed, in quotes.

Example: `-SteamServerName "Friends Server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Operation: Harsh Doorstop: `-Port`

**Game port** (Network). The port players connect to. The panel writes the Game Port you set. Its protocol (TCP or UDP) is not confirmed.

Example: `-Port 27050`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Operation: Harsh Doorstop: `-MULTIHOME`

**Listen address** (Network). The address the server listens on, given as 0.0.0.0 (all addresses), as the community start line gives it. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Operation: Harsh Doorstop: `-QueryPort`

**Steam query port** (Network). The port the Steam server browser asks for the server's details on. The panel writes the Steam Query Port you set.

Example: `-QueryPort 27052`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Rising Storm 2: Vietnam

The panel starts the server with the map, the max player count and the two ports. The form below only shows the switches the panel writes; it cannot add others yet. These arguments are on the `VNGame.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Rising Storm 2: Vietnam: `-Port`

**Game port** (Network). The port players connect to. The panel writes the Game Port you set. The community guides say changing it also changes the query port by the same amount unless the query port is given too.

Example: `-Port 27070`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Rising Storm 2: Vietnam: `-QueryPort`

**Steam query port** (Network). The port the Steam server browser asks for the server's details on. The panel writes the Steam Query Port you set.

Example: `-QueryPort 27072`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Miscreated

The panel starts the server with the game port and the server name. Every argument here is written by the panel, so none can be changed from this form. Other settings are in hosting.cfg, which the panel does not edit. These arguments are on the `MiscreatedServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### `-mis_gameserverid`

**Game server ID** (Server). An ID for the server's database, set to a fixed number. The panel writes 1337. Changing it on a server that already has a world wipes that world.

Example: `-mis_gameserverid 1337`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-sv_port`

**Game port** (Network). The port the server listens on. The panel writes it from the Ports field when the server is created.

Example: `-sv_port 27960`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `+sv_servername`

**Server name** (Server). The name shown in the server browser. The panel writes it from the Server Name you typed.

Example: `+sv_servername "My Server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Craftopia

The panel starts the server with two flags from the setup guides. Every setting is in ServerSetting.ini, not on the launch line, so nothing here can be changed. These arguments are on the `Craftopia.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Craftopia: `-batchmode`

**Run without a window** (Required). Starts the Unity program in batch mode, with no interactive window. The panel always writes it. The setup guides use it; they do not say what it does.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-showlogs`

**Show logs in the console** (Logs). Prints the server's log to its console window, as the setup guides do. The panel always writes it. It does not write a log file.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Age of Chivalry

The panel starts the server with these arguments. Every one is written by the panel, so none can be changed from this form. The server name and the game port come from the server's own settings, and the rest of the settings are in server.cfg. These arguments are on the `srcds.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### Age of Chivalry: `-console`

**Console window** (Required). Runs the server as text in its own console window, the form the dossier's guide uses. The panel needs it to read the output.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Age of Chivalry: `-game`

**Game folder** (Required). Tells srcds which mod to run. For Age of Chivalry this is ageofchivalry. The panel always writes it.

Example: `-game ageofchivalry`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Age of Chivalry: `-secure`

**VAC protection** (Server). Turns on Valve Anti-Cheat for the server, as the dossier's guide has it. The panel always writes it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Age of Chivalry: `+map`

**Starting map** (World). The map the server loads when it starts. The panel writes aoc_siege, the map the guides use. Other map names are not listed in the dossier.

Example: `+map aoc_siege`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Age of Chivalry: `+log`

**Logging on** (Logs). Prints the server's output to the screen, which the guides say makes errors easier to find. The panel writes on.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Age of Chivalry: `+maxplayers`

**Max players** (Server). The most players the server takes. It can only be set when the server starts. The panel writes 32, the figure the guides use.

Example: `+maxplayers 32`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Age of Chivalry: `-port`

**Game port** (Network). The port the server listens on. The panel writes it from the Ports section when the server is created. Each server on one address needs its own port.

Example: `-port 27030`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Age of Chivalry: `+ip`

**Listen address** (Network). The address the server listens on. The panel writes 0.0.0.0, which means every address on this PC. The guides ask for the PC's own address instead, which the panel does not know.

Example: `+ip 0.0.0.0`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### Age of Chivalry: `+exec`

**Settings file** (Files). The file in the cfg folder that the server reads its settings from when it starts. The panel writes server.cfg.

Example: `+exec server.cfg`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## HumanitZ

The panel starts the server with three arguments. The panel writes these three arguments when it creates the server, and their values come from the Ports section. Nothing here can be changed from this form. The server name, passwords and the other settings are in GameServerSettings.ini. These arguments are on the `HumanitZServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### HumanitZ: `-log`

**Console window** (Required). Opens a console window and shows the server's output in it. The panel uses it to read the server's log.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### HumanitZ: `-port`

**Game port** (Network). The UDP port the server listens on, which players connect to. The panel writes it from the Game Port you set when the server was created.

Example: `-port=27090`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### HumanitZ: `-queryport`

**Steam query port** (Network). The UDP port the server browser asks for the server's details. The panel writes it from the Steam Query Port you set when the server was created.

Example: `-queryport=27092`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## The Front

The panel starts the server with the ports, the server name and the player cap. Every argument here is written by the panel, so none can be changed from this form. Other settings are in TheFrontManager\ServerConfig_.ini, which the Settings tab edits. These arguments are on the `TheFrontServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### The Front: `-port`

**Game port** (Network). The UDP port players connect to. The beacon, query and shutdown service ports are the three numbers above it. The panel writes it from the Ports section when the server is created.

Example: `-port=7900`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### The Front: `-ServerName`

**Server name** (Server). The name shown in the server browser. The panel writes it from the Server Name you typed.

Example: `-ServerName="My Server"`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-QueueThreshold`

**Player cap** (Server). The most players that can be on the server at once. The panel writes 8, the value the host guide uses.

Example: `-QueueThreshold=8`

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

## Empyrion - Galactic Survival

Empyrion's dedicated server is started with these arguments on the command that starts it. The server's name, ports and passwords are in dedicated.yaml, which the panel writes. Changes apply the next time the server starts. These arguments are on the `EmpyrionDedicated.exe` line of the server's start script.

The **Launch options** form on this game's Settings tab edits the arguments below that are offered in it. Everything else in the start script stays as it is.

### Empyrion - Galactic Survival: `-batchmode`

**Batch mode** (Required). Runs the server without a user interface, so it can run in the background.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Empyrion - Galactic Survival: `-nographics`

**No graphics** (Required). Runs the server without drawing anything on screen. The panel sets it with batch mode.

Not offered in the Launch options form; the panel sets it and it is best left alone.

### Empyrion - Galactic Survival: `-logFile`

**Log file** (Logs). Where the server writes its log. The Logs tab reads the default file, so change this only if you do not need the Logs tab.

Example: `-logFile "../Logs/server/server.log"`

## ATLAS

The panel starts ATLAS with the map and its settings on one long line (the map name, then ports and passwords joined by question marks), followed by a few flags. Nothing here can be changed from this form: the panel sets all of it. These arguments are on the `ShooterGameServer.exe` line of the server's start script.

This game has no Launch options form. To change an argument, open the server's start script (**Edit Batch Files** on its page) and edit the line.

### ATLAS: `-log`

**Log output** (Required). Set by the panel on every start, as in the guide examples. The developers do not describe this flag.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### ATLAS: `-server`

**Server mode** (Required). Set by the panel on every start, as in the guide examples. The developers do not describe this flag.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### ATLAS: `-NoBattlEye`

**BattlEye off** (Required). Starts the server with BattlEye anti-cheat turned off, as the guide examples do. The panel always sets it.

The panel puts this on the line when it creates the server. It is in the Launch options form, but change it with care.

### `-manualmanagedmods`

**Manual mod updates** (Mods). Turns off the automatic download and update of Workshop mods when the server starts. The developers' page gives this flag for that. Use it only if you manage the mod files yourself.

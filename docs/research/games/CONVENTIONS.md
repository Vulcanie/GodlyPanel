# GodlyPanel game-support conventions (read this first)

GodlyPanel (repo: C:\GodlyPanel, Windows, Node, React UI in `ui/`) creates and runs self-hosted game servers: it installs the
server with SteamCMD, writes a start script (.bat), and edits the game's own config files with a form. Hobbyist audience:
descriptions must be plain language.

## Hard rules learned the expensive way
1. **Never write a setting name, default, allowed value or argument from memory.** Every one needs a source you actually opened
   (official docs/wiki, the game's own shipped default config, the game's help output, a dev post, a well-maintained community
   guide). Record the URL per fact. In earlier work, names written from memory were wrong about one time in five (settings that
   belong to another game, renamed keys, invented dropdown values).
2. If you cannot confirm something, put it in an `UNVERIFIED` list. Do not guess a description. An unexplained setting is
   better than a wrong explanation.
3. Prefer the game's OWN shipped files as ground truth (default config files inside the server install, `-help` output, bundled
   documentation). If you can read them via a source, quote them.
4. Date today is 2026-10-14. Games change; note the game/server build the facts are for.
5. Do not touch C:\GodlyPanel unless your task says you are an implementation agent. Research agents write only under the game's folder in the vault, `docs/research/games/<slug>/`
   (earlier batches used a scratchpad research folder).
6. Never print or store real passwords/tokens. Never run anything on the user's PC that starts, stops, or changes their existing
   servers (anything under C:\GodlyPanelApp\ is the user's live install: do not read-write it).

## What the panel needs per game (so research can be shaped to it)
### A. Template (src/server/data/gameTemplates.js; see the `corekeeper` and `sotf` entries as the simplest examples)
`id, displayName, type, method ("process" | "rcon" | "gamedig"), updateAppId (SteamCMD dedicated-server app id), storeAppId,
sharedInstall, installLayoutRoot, fields (which of sessionName/serverPassword/adminPassword/rconPassword/mapCode/mods the create
form asks for), ports [{key,label,default}], implicitPorts (ports the game also takes beyond the listed ones, with offsets),
buildStartScriptFilename, buildStartScript(p) -> .bat text, optional buildConfigFile(p) (first config the panel writes),
buildServerEntry(p) -> the servers.json entry (processName = the real exe name, configPath(s), etc.)`.
For each game research: SteamCMD app id and whether `+login anonymous` works; install folder layout; the exact server exe name
(process name the panel must match); every port + protocol; the minimum/ideal start command; how it saves/where; how to stop it
gracefully (RCON, console command, Ctrl+C, nothing); whether a query protocol exists (A2S/Steam query, RCON, REST).
### B. Settings catalog (ui/src/configCatalog.js + ui/src/catalog/<game>.js)
Per config file: file name, location relative to the install, format (ini / xml / json / cfg key-value / properties / lua / yaml),
whether the game writes it on first run (and with which defaults) or the user must create it, and per setting:
`key (exact spelling and case), plain-language label, description (what it does and when you'd change it, units, sensible range),
group, default, type, allowed values (dropdown choices with plain labels; whether other values are accepted)`.
Catalog rows are `[key, label, description, group]`; dropdowns are `{ choices:[[value,label]...], allowCustom }`.
### C. Launch arguments (ui/src/catalog/launchArgs.js)
Per argument: `flag exactly as written, value form (space / equals / attached), kind (value or bool flag), label, description,
group, example, allowed values, whether the panel manages it (port/name/password/save path), whether it is only needed on first
creation, platform notes`.
### D. Modded servers
How a server gets mods: Steam Workshop (id list in config / launch arg / separate download step), Thunderstore/Nexus/CurseForge,
a mod loader (BepInEx, tModLoader, Oxide/uMod, Carbon, MelonLoader, Forge/Fabric...), manual folder drops, a mods.json/modlist
file; where mods go, how clients must match, what config lines enable them, any required loader install step, a safe default.
Also: popular mod loaders and the most-used mod categories (QoL, maps, admin tools) at the time of writing.

## Description style
Plain language for a hobbyist hosting for friends. Say what it does; give units and the default; say what changing it affects.
No marketing, no jargon without a word of explanation. 1-2 sentences. Don't tell people to "leave it" unless that is true.

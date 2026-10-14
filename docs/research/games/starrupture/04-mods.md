# StarRupture: modded servers (conventions section D)

Researched 2026-10-14. Game: StarRupture (Creepy Jar), Early Access since 6 Jan 2026. Facts below are for the server tool app 3809400 (build id 25642172 per Steam metadata) and the community mod ecosystem as of Sep-Oct 2026 (game version 0.3.4 hotfix, 17 Sep 2026, per GameServerKings). Nexus Mods pages returned HTTP 403 to my fetcher, so Nexus facts come from search snippets and third-party guides and are marked as such.

## 1. Verdict: is there a supported server mod path?

**No official one. There is a working community path.**
- Steam metadata for the store app 1631270 has no Steam Workshop category (category 30 absent), no workshop fields, no workshop depot. Source: https://api.steamcmd.net/v1/info/1631270 (fetched 2026-10-14).
- The same metadata for the server app 3809400 shows no workshop fields either (Tool, depots 228989 shared + 3809401 Windows 64). Source: https://api.steamcmd.net/v1/info/3809400.
- Creepy Jar's official dedicated-server article does not mention mods at all. Source: https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34
- A GameServerKings guide (28 Sep 2026) states Creepy Jar has not announced official mod support (it found only in-game weapon "mods" in studio posts). Source: https://www.gameserverkings.com/knowledge-base/starrupture/starrupture-mods/ . One hosting page claims official support is "expected to expand"; no Creepy Jar source backs that, ignore it.
- Community mods are distributed on Nexus Mods (128 listings on 28 Sep 2026 per GameServerKings; hub: https://www.nexusmods.com/games/starrupture , found via https://www.4netplayers.com/de/wiki/starrupture/mods-installieren/).
- So: no Workshop id list, no mods config line, no launch argument for mods in the game itself. Everything is "drop files into a folder" or "install a community mod loader".

## 2. Verified from a real install (SteamCMD anonymous, 2026-10-14)

Installed to `research\starrupture\server\` (build 25642172):
- Launcher `SRServerWithLog.bat` content is exactly `start .\StarRuptureServerEOS.exe -Log`.
- Real server binary: `StarRupture\Binaries\Win64\StarRuptureServerEOS-Win64-Shipping.exe` (next to `steam_api64.dll`, `tbb12.dll`, `tbbmalloc.dll`, folders `D3D12`, `DML`). Top-level `StarRuptureServerEOS.exe` is the small launcher.
- `StarRupture\Content\Paks\` holds only: `global.ucas`, `global.utoc`, `pakchunk0-WindowsServer.pak`, `.ucas`, `.utoc`. No `~mods` folder, no `ModLoader`, no `ue4ss`, no `Mods` folder, no `dwmapi.dll` ship with the server. Clean install = vanilla.
- The server executable contains the string `DSSettings.txt` (so that settings file name is real; its location/format is for the config step).
- Note: the server binary is named `...ServerEOS...`, NOT `StarRuptureGameSteam-Win64-Shipping.exe` (that is the client exe; the ModLoader README and ServerUtility README examples use the client exe name).

## 3. Mod types in use and where files go

Paths below are relative to the server install root (the folder containing `StarRuptureServerEOS.exe`), mapped from the client guides by replacing the client root with the server root (that mapping is an inference, see UNVERIFIED).

| Type | Files | Client location (source) | Server location |
|---|---|---|---|
| Pak mod | `.pak` + `.utoc` + `.ucas` with the same base name (keep together) | `StarRupture\Content\Paks` (some authors use a `~mods` or `mods` subfolder) - GameServerKings | `StarRupture\Content\Paks` - confirmed by hosts: ZAP `/gxxxxxxx/StarRupture/Content/Paks`, 4Netplayers `KonfigID/StarRupture/Content/Paks`, CreeperHost `rupture/StarRupture/Content/Paks` |
| AlienX Mod Loader plugin (DLL) | DLL in `ModLoader\Plugins`, per-plugin `Plugins\config\<name>.ini` | `StarRupture\Binaries\Win64\ModLoader\Plugins` | `StarRupture\Binaries\Win64\ModLoader\Plugins` (README: "Both builds use the same location") |
| UE4SS mod | script folder + UE4SS itself | `StarRupture\Binaries\Win64\ue4ss\Mods` (UE4SS installed into `StarRupture\Binaries\Win64` first) | Not established for servers. GameServerKings says server-side UE4SS "not expected to work yet" on their (Wine) hosts. |

Sources: https://www.gameserverkings.com/knowledge-base/starrupture/starrupture-mods/ , https://zap-hosting.com/guides/docs/starrupture-mods , https://www.4netplayers.com/de/wiki/starrupture/mods-installieren/ , https://www.creeperhost.net/help/docs/starrupture/modding , https://github.com/AlienXAXS/StarRupture-ModLoader

Pak mod facts: host guides say stop the server, upload (unpacked, files extracted, not zipped; 4Netplayers: "Mods müssen vor dem Hochladen entpackt werden"), start; the server picks them up at startup (ZAP). Nobody tells you to edit any config file for pak mods. GameServerKings says it has not tested a pak mod on its StarRupture servers yet, so the pak server path rests on three host how-tos rather than a hands-on report.

## 4. The AlienX Mod Loader (the "mod loader" of this game)

Source: https://github.com/AlienXAXS/StarRupture-ModLoader (README fetched 2026-10-14; MIT license shown on the page; C++).
- What it is: a `dwmapi.dll` proxy (DLL injection at start-up); "no game files are modified".
- Releases page showed v1.22.0 (5 Oct 2026, latest), v1.21.4 and v1.21.3 (24 Sep 2026). Source: https://github.com/AlienXAXS/StarRupture-ModLoader/releases . Asset file names were not shown to me.
- Dedicated server install: download the release zip named `StarRupture-ModLoader-Server-*.zip` (the client one is `StarRupture-ModLoader-Client-*.zip`) and extract directly into `StarRupture\Binaries\Win64\`. Result: `dwmapi.dll` next to the exe, plus `ModLoader\` containing `StarRupture-ModLoader-Core.dll`, `modloader.ini` (made on first launch), `Logs\`, `Plugins\`, `Preload\`. `StarRupture-ImGui.dll` is client builds only.
- Plugins ship disabled. Run once, then open `ModLoader\Plugins\config\<PluginName>.ini`, set `Enabled=1`, restart.
- Client plugins do not load on servers and server plugins do not load on clients (README).
- `modloader.ini` keys named in README: `[Logging] Level`, `GameLogCategories`; `[Network] ConnectionTimeout`, `InitialConnectTimeout` (both default 300.0 seconds, 0 = engine default, range 1-3600; helps only if host and clients both have the loader); `[Preload] Enabled`.
- Launch options the loader reads: `-console` (console window with `help`, `plugins`, `reload`, `load`, `unload`, `rescan`, `stop`; `stop` shuts the server down cleanly), `-NoPreload`, `-PluginLogLevel=`.
- Logs: `ModLoader\Logs\ModLoader.log` (last ten runs).
- Linux/Wine: needs `WINEDLLOVERRIDES=dwmapi=n,b` (not relevant for the Windows-only panel).
- Antivirus: Windows Defender can flag it as `Trojan:Script/Wacatac.B!ml`; author says false positive (GameServerKings, and the Nexus listing as quoted in search results). Matters for a panel that would auto-download it.
- Plugin SDK: https://github.com/AlienXAXS/StarRupture-Plugin-SDK (builds typed Client / Server / generic). Source repos listed on https://github.com/AlienXAXS : Plugin-ServerUtility, Plugin-KeepTicking, Plugin-Compass, Plugin-BetterSaving (not all read by me).

### Notable server-side plugin: ServerUtility
Source: https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility (README) and Nexus mod 112 (search snippet only: https://www.nexusmods.com/starrupture/mods/112).
- Dedicated servers only. Adds command-line settings, RCON, Steam A2S query, an HTTP Admin API, and a patch for a known remote-code-execution bug in the game's built-in HTTP server (on by default).
- Install: extract `ServerUtility-Server-*.zip` into `Binaries\Win64\` next to `dwmapi.dll` (loader required first), run once, set `Enabled=1` in `Plugins\config\ServerUtility.ini`. Other keys: `AdminPanelEnabled=1`, `ApiKey=`.
- Launch args (README): `-SessionName=<name>` (required; its presence turns command-line mode on), `-SaveGameInterval=<seconds>` (default 300), `-RconPort=<port>` (default 27015, shared by RCON over TCP and A2S over UDP), `-RconPassword=<password>`. RCON is disabled unless both `-RconPort` and `-RconPassword` are given. Save file is always `AutoSave0.sav`.
- Relevance for GodlyPanel: this is the only found route to a graceful stop / query / RCON for this game, which belongs to the launch and basics steps as well. It is a mod-loader plugin, so it depends on the loader being installed. Required loader version for ServerUtility: README gives none (UNVERIFIED).

## 5. Do clients have to match?

Sources conflict, so do not promise either:
- GameServerKings: gameplay pak mods generally need to be on the server AND every player, same version; client-only plugins (Compass, Better Drone Plugin) need only the client; if a mod page doesn't say, assume everyone needs it. A Nexus page for Better Construction Drone says "Both the server and all clients need to have the same mod version installed" (quoted via search result for https://www.nexusmods.com/starrupture/mods/ , exact page URL not confirmed).
- 4Netplayers: "not currently necessary to install mods on both the player and server sides. Installing them on the server is sufficient."
- ZAP-Hosting: "Most locally installed mods remain active when connecting to servers"; some mods need local install.
- Conclusion: it depends per mod (data-only tweaks like stack sizes are likely safest with both sides matching). Tell users to read each mod's page.

## 6. Popular loaders and mod categories (Sep-Oct 2026)

Loaders: AlienX StarRupture Mod Loader (plugin DLLs, #1 on the Nexus "top" list per a search result for https://www.nexusmods.com/starrupture/mods/top), UE4SS (generic Unreal script system, installed in `Binaries\Win64`), and plain pak files.
Categories (GameServerKings): mostly number tweaks (stack sizes, inventory slots, storage capacity, generator output, drone range); newer plugin-loader group.
Named examples (GameServerKings table): 1K Item Stacks, Player Tweaks, No Stability Needed, Enhanced Turrets, Better Construction Drone (pak); Bigger Inventory (pak + UE4SS); Compass Plugin, Better Drone Plugin (loader, client-only). From search snippets of Nexus: mod 77 (stacks to 1000), mod 134 (building-material stacks), mod 16 Bigger Inventory (slots 24 -> 56; a Magic Game World guide says 64, versions differ), StarCheat, Faster Leveling (mod 12), Server Manager "SWIFTSTEPS" (mod 55, install/auto-restart/backups), ServerUtility (mod 112).
Admin tools: ServerUtility (RCON/query/command-line) and SWIFTSTEPS Server Manager are the server-side ones found.

## 7. Risks

- Version drift: mods target a specific game version; several already say "next update for v0.4"; GameServerKings expects breakage on Update 3. After a patch, remove any mod not updated, from the server and every PC; if launch crashes, remove all and re-add one by one. (GameServerKings)
- Mod version mismatch between server and client has been linked to server crashes (Nexus post for mod 55, via search result).
- Mod conflicts: mods editing the same item data are incompatible (mod 77 and 134 pages via search snippets); mod 64 conflicts with Bigger Inventory.
- Save compatibility: GameServerKings does not say whether a new game is needed; Nexus/GamePressure snippets say Bigger Inventory requires a new game. Back up saves before adding/removing mods. Storage mods can misbehave with boxes built before install.
- Anti-cheat: I found NO evidence either way that StarRupture uses Easy Anti-Cheat or bans mod users (a search returned nothing relevant). The server exe name contains "EOS" (Epic Online Services) but that does not imply EAC. Treat as UNVERIFIED.
- Security: the loader is a DLL proxy flagged by Defender; the game's built-in HTTP server has a reported unauthenticated RCE (ServerUtility README), so the panel should be careful which ports it exposes. The advisory itself was not read.
- Updates: Steam updates (`+app_update`) leave extra files in place, but `validate` may restore/delete modified or extra files in some games; for this game only the Klei-style warning applies to DST (candidates.md), so for StarRupture this is UNVERIFIED. `SRServerWithLog.bat` args may reset after updates (official article), so the panel should use its own start script and not rely on that .bat.

## 8. UNVERIFIED list

1. That the loader's Server zip extracts into the SERVER install's `StarRupture\Binaries\Win64\` (beside `StarRuptureServerEOS-Win64-Shipping.exe`). README says "folder containing StarRuptureGameSteam-Win64-Shipping.exe" and "both builds use the same location"; the server install has no such exe, so the target is inferred. Needs a real test.
2. That `dwmapi.dll` injection actually works with `StarRuptureServerEOS.exe` launched from the root launcher on native Windows (a ServerUtility screenshot/log not seen).
3. That pak mods in the server `Content\Paks` load on a native Windows server (only host how-tos; GameServerKings says untested by them). Whether subfolders such as `~mods` work on the server: unconfirmed.
4. UE4SS on a dedicated server: no source; likely unsupported/untested.
5. Client-match requirement per mod class (sources conflict, section 5).
6. Whether mods change the save so it can't be loaded without them, and whether a new game is needed: no authoritative statement.
7. Anti-cheat presence / ban policy for mod users.
8. Latest ModLoader/ServerUtility release asset names and required loader version for ServerUtility; ServerUtility's RCON command set (in `src/RCON_README.md`, not read).
9. Popularity ranking of mods (Nexus pages blocked, HTTP 403); download counts.
10. Whether `app_update ... validate` removes mod files in the install folder.
11. Whether Creepy Jar plans official mod support or Workshop (no source).
12. Exact Nexus URL for the "Better Construction Drone" quote.

## 9. Recommendation for GodlyPanel

- Do NOT add a Workshop id list or a `mods` field in the create form: the game has no Workshop and no config line for mods.
- Ship StarRupture with no mod support in v1 (`fields` without `mods`), and say so in the UI text.
- Optional second step (only after the UNVERIFIED items 1-3 are tested on a real install): an "Open server folder" / "Mods folder" button that points to `StarRupture\Content\Paks` for manual pak drops, plus a short warning "clients usually need the same mods, mods break on game updates, back up your save".
- If a loader step is ever added, make it a manual, opt-in "Install AlienX ModLoader (server)" that downloads the GitHub release zip into `StarRupture\Binaries\Win64\`, with a warning about the Defender false positive. Do not auto-install; the plugin enable step (`Enabled=1` ini edits) fits the existing form-over-ini editing pattern.
- The most valuable mod-adjacent item for a panel is ServerUtility (RCON + A2S + `-SessionName`/`-SaveGameInterval` args). Report to the launch/basics steps: with it, graceful stop and a query protocol exist; without it, neither was found.

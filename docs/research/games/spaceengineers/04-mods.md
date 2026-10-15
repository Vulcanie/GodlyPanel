# Space Engineers (store 244850, Windows dedicated server tool 298740): modded servers (DRAFT 1)
Researched 2026-10-14, read-only web research. Facts are for SE1 (the original game) dedicated server; no build number was
found in any source, so "current 2026 server" is assumed.

## 1. Summary
- Workshop mods are officially supported on the vanilla dedicated server. They are a `<Mods>` list of `<ModItem>` entries
  (Workshop id in `PublishedFileId`). The server downloads them at startup, clients download them automatically on join.
- Plugins are a different thing (C# DLLs with full access). Keen does NOT support or endorse them. The only practical
  server-side path is Torch (third-party wrapper). The old client-side Plugin Loader is shut down; Pulsar replaced it for clients.
- Cross-platform (console-compatible) mode cannot use Steam Workshop mods (uses mod.io instead, in the world's file).

## 2. Workshop mods in the config
ModItem format (3 sources agree: GameServerKings, XGamingServer, ZAP-Hosting):
```xml
<Mods>
  <ModItem FriendlyName="Build Info">
    <Name>1500385986.sbm</Name>
    <PublishedFileId>1500385986</PublishedFileId>
    <PublishedServiceName>Steam</PublishedServiceName>
  </ModItem>
</Mods>
```
- `Name` = `<WorkshopID>.sbm`; `PublishedFileId` = the Workshop id; `PublishedServiceName` = `Steam`; `FriendlyName` attribute is a label.
  (https://www.gameserverkings.com/knowledge-base/space-engineers/how-to-install-mods/ ,
  https://www.gameserverkings.com/knowledge-base/space-engineers/how-to-install-mods-space-engineers/)
- ZAP-Hosting's example omits the `FriendlyName` attribute, so it looks optional (https://zap-hosting.com/guides/docs/en/spaceengineers_addmods). Not confirmed by Keen.
- Id = number after `?id=` in the Workshop URL.
- Order matters ("The order of mods in this list matters"; mod authors document the order). Dedicated GUI/save files show the real load order top to bottom, reversed compared to single player (https://spaceengineers.wiki.gg/wiki/Mods).
- Dependencies are added automatically but load after the mod that requested them (same wiki Mods page).
- Mod collections: no source found describing collection ids in the config. UNVERIFIED (see list).

### WHICH FILE (conflict between sources)
- GameServerKings: server list lives in `SpaceEngineers-Dedicated.cfg`; "every world save also carries its own" list in `Sandbox_config.sbc`; "a world that already exists brings its mod list with it" and can override the cfg, so keep both identical.
- XGamingServer: mods in `SpaceEngineers-Dedicated.cfg`; also says `Sandbox_config.sbc` takes priority over the cfg session settings.
- ZAP-Hosting: edit the mods in the sandbox file inside `config/Saves/<save name>/`.
- Loafhosts (via search snippet, page 404 when opened): mods in `Sandbox.sbc`. Not confirmed.
- Result: the authoritative file for an EXISTING world is not established by any official source. UNVERIFIED. Safe design = write the same list to both the cfg and the world's `Sandbox_config.sbc` (or test on a real install).

### File locations
- `SpaceEngineers-Dedicated.cfg` is in the server's AppData: "contains all the settings you see in the GUI"; Steam installs keep logs/saves in `%appdata%\SpaceEngineersDedicated\`; SteamCMD installs use `<InstallFolder>\TempContent\` (https://spaceengineers.wiki.gg/wiki/Setting_up_a_Space_Engineers_Dedicated_Server).
- Hosting panels use a `config/` or `instance/` folder with `Saves/<World>/`. This is a hosting-panel layout, not the stock one. GodlyPanel should use `-path` to pin it (see launch args).
- Downloaded mods land at `...\content\244850\<modid>\...` (Workshop content path; https://spaceengineers.wiki.gg/wiki/Dedicated_Server). Manifest `appworkshop_244850.acf`; log `DedicatedServer64\logs\workshop_log.txt`.

### Client matching
- Clients download the server's mods automatically when joining, regardless of whether they subscribed (GameServerKings how-to-install-mods).
- Console/cross-play: cannot use Steam Workshop mods (https://spaceengineers.wiki.gg/wiki/Dedicated_Server). mod.io mods need cross-play enabled and are `<PublishedServiceName>mod.io</PublishedServiceName>` with the mod.io resource id (Host Havoc: https://hosthavoc.com/wiki/game-servers/space-engineers/add-modio-mods; example id 451208). Host Havoc places mod.io mods in the save's `Sandbox_config.sbc`, not the cfg. Third-party only.
- Script mods on a dedicated server let console players join only if the scripts compile server-side only (wiki Mods page).

### Troubleshooting (official wiki, Dedicated_Server page)
- DS "comes with some outdated steam files" that can break Workshop downloads: copy `steamclient64.dll`, `tier0_s64.dll`, `vstdlib_s64.dll` into `DedicatedServer64`.
- Deleting `appworkshop_244850.acf` forces a re-download of all mods.

### Risks
- Removing a mod that added blocks can orphan/damage those grids or corrupt the world; snapshot first (GameServerKings).
- A wrong but well-formed id is not a syntax error (silently fails to load).
- XGamingServer says `ExperimentalMode` must be `true` for mods. Not confirmed elsewhere, UNVERIFIED.

## 3. Plugins
### Policy (https://spaceengineers.wiki.gg/wiki/Plugins)
- Plugins not permitted on Keen's Official Servers; no Keen support for plugin problems.
- Keen removed plugin support and all plugins from Steam Workshop and Mod.io.
- Plugins' "access to your PC, the game world, and generic programming of features is unrestricted"; "Currently (2026) there is no trusted, endorsed repository."
- Server-side features need the admin to install the plugin; client-only plugins affect only that player.

### Built-in DS plugin hook
- `-plugin <filepath>` "loads a .dll as a plugin for DS (requires a password for game client)" (Dedicated_Server wiki page). The DS GUI also has a Plugins tab.

### Torch (https://github.com/TorchAPI/Torch , https://torchapi.com/)
- Community server wrapper, "not affiliated with Keen Software House". Successor to SE Server Extender; WPF UI, chat/command access without joining, entity manager, config editor, plugin system. Apache-2.0.
- Install (README): download `torch-server.zip` (build.torchapi.com), unzip to its own dir, run the exe, it downloads the DS and generates files; or unzip into the folder that contains `DedicatedServer64`.
- GitHub releases page shows 1.3.1 "Stable release / Latest", published 22 Dec (year not shown), by Bishbash777.
- Plugins (GameServerKings how-to-install-torch): download plugin `.zip` from torchapi.com/plugins (note its GUID), stop server, put the zip UNEXTRACTED in `Plugins` folder, add `<guid>` in the `<Plugins>` block of `Torch.cfg`, start and read the console. Both zip and cfg entry required.
- Popular plugins named on torchapi.com: Rewards, Essentials (votes, custom commands, ranks permissions), NexusV3 (sector syncing). GameServerKings mentions Concealment (performance).
- Torch and Magnetar plugins are not interchangeable (third-party skills page via search; weak source).
- Linux/Wine: wiki.torchapi.com has a Linux/Wine page but its content was not retrieved. UNVERIFIED. Irrelevant for GodlyPanel (Windows).

### Plugin Loader and Pulsar (client side)
- Plugin Loader: "shut down and will no longer receive any updates"; repo archived (https://github.com/sepluginloader/PluginLoader). It never documented dedicated-server use.
- Pulsar (https://github.com/SpaceGT/Pulsar): hard fork for SE1 and SE2, MIT, plugin source PluginHub; page does not mention dedicated servers. Hence NOT a server option.
- A third-party skills page mentions "Magnetar" as a Pulsar fork for SE1 dedicated servers (and "Quasar" web control plane). Weak source, UNVERIFIED.
- SE2: no dedicated server / Torch equivalent per third-party page. Keep out of scope.

## 4. UNVERIFIED (draft)
(see final file)

# Managing servers

Open a server from the dashboard (click its card) or from the **Servers** list in the left-hand menu. Press
**Ctrl+K** anywhere to jump to any server, any of its tabs, or to start, stop or restart one without looking for it.
**Start**, **Restart** and **Stop** are at the top of every server page.

Its tabs are along the top: **Overview** (the controls, the console where the game has one, game updates, and
CPU, memory and player charts), **Settings** (administrators: the game's settings with an explanation for each, its
launch options, and a version history of every save), **Players**, **Backups**, **Schedules**, **Logs**, **Network**
(ports and the firewall), **Mods**, **Files** (browse and edit the server's folder), **Activity**, **Automation**
and **Advanced** (the server's window, its start script, moving it to another PC, and removing it). People see the
ones their [role](ACCOUNTS_AND_ROLES.md) allows: a moderator sees Overview, Players, Backups, Schedules, Logs,
Network and Activity, and an administrator sees all of them.

Every setting in the panel's own Settings and in these tabs has a small **(i)** beside it: hover it for what the
setting does and a link to the part of the guides that explains how to use it. The settings inside a game
are explained underneath each one; see the [game settings guide](GAME_SETTINGS.md). Mods and plugins have no
explanations, since they depend on the mod.

## Where a server's files are

A server's own **Settings** tab says where it is installed ("Installed in …", with a button that copies the path), and
whether that folder is still there. `Settings → Folders` lists every server beside the one setting that decides where *new*
servers go:

- **Server install folder** only affects servers you create from now on. Changing it never moves a server that already exists.
- **Where your servers are now** lists each server's folder, how big it is (measured every hour in the background, so a
  brand-new server says "not measured yet" for a while), and flags a folder that has gone missing, a folder shared with
  other servers (several ARK maps share one install, so that size is for all of them), and servers that live outside the
  new-servers folder.

## Start, stop and restart

- **Start** runs the server's start script, or the program itself if it's set to "No window"
  (see below). The tile shows **Starting…** until the game answers, then **Online**.
- **Stop** asks the game to save and exit where it has a way to do that: a console command
  (RCON) for most games, Telnet for 7 Days to Die, or a polite "please close" request to the
  program for games with no console (Valheim, Enshrouded and similar). If the game hasn't
  exited after 15 seconds (30 for Satisfactory, which saves its whole world on the way out) the panel forces it closed. The tile shows **Stopping…** meanwhile.
- **Restart** is a stop followed by a start.

While something is in progress the server won't accept a second action; it says what it's
busy with (**Starting…**, **Stopping…**, **Backing up…**, **Restoring…**, **Updating…**).

Closing the panel's window doesn't stop your servers. They are separate programs and keep
running.

## Backups

Open the **Backups** tab.

- **Back up now** makes a backup straight away. The panel archives the game's save folders (or
  folders you chose under **What is backed up**), then reads the archive back to check it is
  good. If it can't be read back, it is thrown away and you're told.
- **Format and compression.** Backups are `.zip` by default, which opens anywhere. Under `Settings → Backups`
  (*Backup file format* and *How hard to compress backups*), or per server on the Backups tab (**Format**
  and **Compression**), you can choose `.tar.zst` (zstd) or `.tar.xz`, which are smaller but are opened by this panel
  and by modern tools such as Windows' own `tar`, and a level: fast, balanced or max. A change applies to new backups;
  existing ones are never altered, and restoring works for all three. **Recompress older backups** rewrites the existing
  ones in the format you picked (each is checked before the old file is removed, and it needs free space about as large
  as your biggest backup).
- Games that can't be saved while running are **stopped for the copy and started again**, so
  the backup is consistent. For games that can save on command, the panel saves first and
  copies while the game keeps running.
- **How many to keep** is under `Settings → Backups`, and each server can override it on its Backups tab:
  *Scheduled backups to keep* (default 10), *Delete scheduled backups older than (days)* (default: never), and *Refuse
  backups below this much free space (GB)* (default 2) so a backup can't fill your drive. Instead of "the newest N", you
  can **keep a spread**: one backup a day for so many days, one a week for so many weeks, and one a month for so many
  months (any of the three above 0 turns this on and replaces the count and age settings). Backups you take by hand are
  never deleted automatically unless you set *Manual backups to keep*.
- **Skip a scheduled backup when nothing has changed** saves space and wear on a server that sits idle. A backup you ask
  for by hand is always made.
- **Going back to a backup.** Beside each backup is a button: **Restart and use this backup** while
  the server is running, **Use this backup** while it is stopped. One click, then one confirmation, and the
  panel does the rest: it stops the server (the same clean stop as the Stop button), takes a **safety backup of
  what is there now**, puts the backup back, and starts the server again. A stopped server is only started
  afterwards if you leave "Start the server afterwards" ticked.
  - **It erases everything newer than the backup.** Progress, builds and settings changed since then are
    replaced. The safety backup is what lets you change your mind: it appears in the list as **Before a
    restore**, with the same button, so going back is one more click. The last three are kept.
  - Players on the server when you click are disconnected; the dialog says how many.
  - Everything that can be checked is checked **before** the server is stopped (the backup reads back, its
    folders are still this server's folders, there is room), so a backup that can't be restored never takes
    the server down. If the replacing itself fails, everything is put back and a server the panel stopped is
    started again on its old files.
  - Logs and crash reports aren't in a backup, so a restore leaves the ones already on disk alone.
  - Unticking the safety backup removes the undo, so the panel then asks you to type the server's name.
  - Some games keep their saves in a folder every server of that game on the PC shares (Valheim, 7 Days to Die
    without a `-UserDataFolder`). Restoring replaces their worlds too, so the dialog asks you to say you
    understand.
  - Moderators can take backups but not restore them.
- **Copies off this PC** (same tab) copy every backup to another drive, a network share, a
  cloud-sync folder (OneDrive, Dropbox, Google Drive) or S3-compatible storage (Backblaze B2,
  Wasabi, Cloudflare R2, MinIO, Amazon S3). Failed copies are shown and retried. If a backup is
  still not there a day later (the drive is unplugged, the share is full, the cloud key was revoked), you get
  a notification naming the place and the last error, a reminder daily while it lasts, and another when it
  has caught up. The time is `Settings → Notifications`, *Warn when a backup hasn't reached its off-site
  destination*; 0 turns it off. A backup on a drive that has died can be fetched back and restored.

A backup is only worth something once you've restored from one. Try it once on a quiet day.

### What each game's backup holds

The panel knows where each game keeps its world and settings. **What is backed up** at the top of the Backups tab
lists the exact folders for your server, and **Choose folders & rules** changes them.

| Game | In the backup | While it runs |
|---|---|---|
| ARK: Survival Ascended | This map's own save folder (named in its launch line), the server settings, this map's own settings files, the cluster's transfer folder | Told to save, then copied |
| ARK: Survival Evolved | The `Saved` folder (worlds and settings) | Told to save, then copied |
| Conan Exiles | `ConanSandbox/Saved` | Stopped for the copy |
| Valheim | The worlds folder (shared by all Valheim servers on the PC unless the start script sets `-savedir`) | Stopped for the copy |
| Enshrouded | `savegame` and `enshrouded_server.json` | Stopped for the copy |
| RuneScape: Dragonwilds | `RSDragonwilds/Saved` | Stopped for the copy |
| Windrose | `R5/Saved` and `ServerDescription.json` | Stopped for the copy |
| Subsistence | `UDKGame/SaveData` and `UDKGame/Config` | Stopped for the copy |
| 7 Days to Die | The saved worlds and generated maps (shared unless the start script sets `-UserDataFolder`) and `serverconfig.xml` | Stopped for the copy |
| Palworld | `Pal/Saved` | Told to save, then copied |
| Minecraft (modpacks) | The world named by `level-name` in `server.properties` (and its `_nether` and `_the_end` folders where a server keeps them separately), mod settings, the operator, whitelist and ban lists | Autosave switched off, saved, copied, switched back on |
| Rust | The `server` folder (world, settings, player data) | Told to save, then copied |
| Project Zomboid | The world, the server settings and the player accounts | Told to save, then copied |
| Satisfactory | `FactoryGame/Saved/SaveGames` and the server settings | Stopped for the copy |
| V Rising | `save-data` | Stopped for the copy |
| Core Keeper | `data` (worlds) | Stopped for the copy |
| Sons of the Forest | `userdata` | Stopped for the copy |

"Told to save" needs the game's console (RCON) to be set up for the server; without it the panel stops the game for the copy instead.
"Stopped for the copy" means the game has no way to be told to save while it runs, so the panel stops it,
copies, and starts it again (a minute or so). Backups taken while a game is running without that (you chose
"Keep it running") are marked **copied while running**; they usually load fine, but are the first suspects if
one doesn't.

The table above is the first seventeen games. The other 76 have their save folders and settings files listed in the same
place, at the top of the Backups tab (**What is backed up**). Many Source-engine games have no world to save, so their backup
is only their settings and ban lists. A few games (BATTALION: Legacy, SCP: Secret Laboratory, Hurtworld and HYPERCHARGE:
Unboxed) have no folder list yet: use **Choose folders & rules** to name the folders you care about.

## Updating a game

On a server's **Overview** tab, the **Game updates** card shows whether Steam has a newer version and has the **Update**
button. An update stops the server, downloads the new files with SteamCMD and starts the server again; a game that
shares one install with other servers (several ARK maps) updates them together. Anyone whose role has the "Update the game" permission can run it.

- **Back up this server before every game update** (on the same card, and for all servers under `Settings → Backups`). The
  panel stops the server, backs up its save folders, and only then updates. If that backup fails it asks whether to update
  without one; if you say no, nothing changes.
- **After the update the panel waits for the server to come back online.** It waits for as long as `Settings → More settings`, *Wait for a server
  to come back after an update*, says (default 10 minutes). The card then says **Came back online** or **Did not come back**, and
  you get a notification if it didn't.
- **Roll back saves.** If an update goes wrong, **Roll back saves** puts the save files back from the backup taken just before
  it. The server has to be stopped (the card says so), a safety backup of what is there now is taken first, and you can choose
  to start the server again afterwards. **The game's own files are not rolled back**, only the saves, so this fixes "the new
  version damaged my world" but not "the new version doesn't run". It only exists when a backup was taken before that update.
- **Recent updates** lists what ran, from which version to which, and how it ended.
- **Auto-update** (on the Automation tab) updates a server by itself when Steam has a new version, with a countdown in the
  game first ("updating in 15, 10, 5 minutes"). It needs *Check Steam for game updates* in `Settings → Refresh rates`.

## Schedules

The **Schedules** tab runs jobs by itself: backups, restarts, game updates and console
commands, daily, on chosen days, every few hours, or once. A **restart** can warn players in
game ("restarting in 10, 5, 1 minutes") first. Schedules are edited by administrators; moderators
can see them.

## Looking after itself

On the **Automation** tab:

- **Restart it if it crashes.** If the program disappears, the panel starts it again. It gives up
  after a number of tries so a server that crashes every time it starts doesn't loop forever; you
  get a notification when that happens. The limits are under `Settings → Crash recovery`.
- **Restart it if it stops responding.** For a server whose program is still running but no longer
  answers. Give it a generous time: a world can look frozen while saving or loading.
- **Start it when GodlyPanel starts.** With *Start GodlyPanel when I sign in to Windows*
  (`Settings → Starting with Windows`), the servers come up when the PC does, spaced apart so a
  dozen games don't all load at once.
- **Message of the day**, **presets** (save a server's settings as "PvE" or "hardcore" and apply
  them to another server of the same game) and **cloning**.

### Cloning

**Clone this server** makes a full copy with its own name, ports and RCON password. It works for
servers the panel created, in a folder of their own, and the original must be stopped. The copy
uses as much disk as the original.

### Changing the RCON password

**Change the RCON password** (also on the **Automation** tab, administrators only) gives the
server a new, long, random RCON password, in the panel *and* in the game's own files, so a password
that has been shared or leaked stops working. Things to know:

- The server must be **stopped**, and the new password takes effect the next time it starts. A
  running game keeps the password it started with.
- Servers that **share files** (for example several ARK maps from one install, which share a
  settings file) change together, to one new password. The card tells you which.
- Servers that merely have the same password but share no files are left alone; change each on
  its own.
- If anything goes wrong part-way, everything is put back as it was.
- Anything else that uses the old password (a tool of your own, a script) needs the new one. You
  can read it in the server's settings.

## Windows and consoles

Under **Window & console** (or **Launch & console**) on the server's **Settings** tab, each server
can be run three ways:

| Mode | What you see |
|---|---|
| **Minimized** | The game's console window sits minimized on the taskbar. Use it if you like watching the console. |
| **Hidden** *(default)* | The window is hidden the moment it appears and kept hidden while the game finishes starting. Works with any start script. |
| **No window** | The panel starts the game program itself. No window exists, and the game's console output is shown in the panel. |

Some details worth knowing:

- Some games start a second console of their own a moment after launch (Palworld's launcher does).
  The panel keeps looking for such windows for a while after a start, and after an automatic
  restart, and hides them.
- **No window** needs to know the program, its arguments and its folder. The panel can read these
  out of most start scripts, can copy them from a *running* server, or you can type them in.
  It **skips anything else your script does** (such as a SteamCMD update check first), so use the
  panel's own update or a schedule for that.
- A game's own log file is still the best place to look for problems. In **No window** mode the
  panel also keeps what the program printed, under **Logs**.
- You can switch mode at any time, even while the server runs.

## Ports

The **Settings** tab's ports editor changes a server's ports safely. Every change is checked as you
type against the server's own other ports, the ports its game quietly takes for itself, every other
server, and the panel's own port. It then updates the start script, the game's config and the panel's
record together, keeping a `.bak` of each file. The server must be stopped, because a running game
keeps the ports it started with. For which ports to open on your router, see
[Ports and firewall](PORTS_AND_FIREWALL.md).

## Logs, console and players

- **Logs** follows the game's log live, and you can search it. Passwords are masked for everyone but
  administrators.
- The **console** (on **Overview**, when the game has RCON or Telnet) sends a command to
  the game and shows its reply. A [custom role](ACCOUNTS_AND_ROLES.md#limiting-the-console-commands) can be limited to
  some commands, and the console says so when a command is refused.
- **Players** shows who is on and who has been. For the games that support it you can **kick**,
  **ban**, and edit whitelist and admin lists. Every one of these is recorded in **Activity**.
  On Minecraft, **operators have levels** (1 can build in the spawn area; 2 can use cheats like `/gamemode` and `/tp`;
  3 manages players with `/op`, `/kick` and `/ban`; 4 can do everything, including `/stop`). The list shows each operator's
  level, and a new one gets the level in `op-permission-level` in `server.properties` (4 if it isn't set) unless you pick
  another. Choosing a different level, changing someone's level, or removing an operator is done with the server
  **stopped**, because a running Minecraft server keeps its operator list in memory and would lose the change; adding one at
  the default level works either way.
- **Activity** is the running record of what the panel did and what happened to the server: crashes,
  restarts, backups, updates, kicks, who changed what. It can be **searched** (the whole log, not only what is on screen),
  narrowed by kind, level, server and time, and sorted either way; "Show more" loads older entries.
- **Stats** charts CPU, memory and player counts over time.

## Settings files, and getting changes back

The **Settings** tab edits a game's config files through a form when the panel knows the format, or
as raw text. Every edit keeps a `.bak` of what it replaced. The **History** tab keeps every change
with a line-by-line difference, so you can see who changed what and put an old version back.

A running game often rewrites its settings when it stops, which would undo your edit. The panel asks
you to **stop the server first** before it will save a settings change.

## Mods

The **Mods** tab (administrators) manages the mods of a game. A game reads its mods when it starts, so **stop the server
before changing them**; the tab says so.

**Folder-based games** (Minecraft modpack servers, 7 Days to Die, Palworld, Garry's Mod, Left 4 Dead and Left 4 Dead 2, HumanitZ):

- **Paste a link or a name** into *Mod address or name* and choose **Install**. The panel works out where it is from and
  fetches it: Modrinth and CurseForge (Minecraft), GitHub releases, or a direct link to a file. Anything the mod needs
  (its required dependencies) is installed with it, each file is checked against the maker's checksum, and if any part
  fails everything that call installed is taken back out. If a release has several files that could be meant, it lists
  them and asks you to pick. A link from a site the panel doesn't know shows *This address isn't one of the known mod
  sites*; tick **I trust this address** only for a place you trust. The panel never fetches from a private-network address.
- **Or add a file** you have downloaded yourself.
- **Installed** lists what is there. A mod can be **turned off** (kept on disk, but not loaded) and on again, or **removed**.
  Mods that are only for players (a client-side mod) aren't installed on the server.
- The panel remembers what it installed, where from, and a checksum of each file, in a record kept in its own data folder
  (`data\modlocks`), not in the game's folders. That record is how it can tell you that a file **was changed or is missing**,
  and which files in the mods folder it did not put there.
- **Check for updates** asks each source what is newest (nothing is downloaded), and **Update** on a mod replaces it with
  the new version. If the update fails, the old mod is put back as it was. A mod added by a direct link, or a Steam Workshop
  item, can't be checked from here (Workshop items update through SteamCMD).

**Other games:**

- **Conan Exiles:** Steam Workshop item numbers; the panel keeps `modlist.txt`. Some items need a signed-in Steam account and
  can't be fetched this way.
- **Valheim:** Thunderstore packages (`Owner-Name`); BepInEx is added automatically with the first mod.
- **ARK (both):** mod numbers in the start script.
- **Minecraft modpacks:** the server export of a CurseForge pack, and the free CurseForge key
  (`Settings → CurseForge API key`) the panel needs to download its mods.
- **Games with no mods support in the panel** say so on the tab. Mods can still be added by hand with the **Files** tab.

### Sharing the mods with your players

For games where players need the same mods as the server (Minecraft and the folder-based games above), the Mods tab has
**Share with players**. Turn it on and it gives you a link on your [community address](REMOTE_ACCESS.md) (turn the community
view on in Settings first). Anyone with the link can download, **without an account**: a zip of the mods, a manifest, a plain list of
what to install, or, for Minecraft, a Modrinth pack (`.mrpack`) that launchers such as Prism open directly. Only mods meant for
players are included; server-only mods never leave the server. A mod that has changed or gone missing since the panel
installed it is left out and named. A CurseForge mod is listed by name rather than copied, because CurseForge's terms don't let
the panel hand the file on. **Make a new link** if the link gets out; the old one stops working at once.

Settings that belong to a mod show up in the server's Settings with no explanation, because they depend on the mod; the mod's
own page says what they do.

## Files

The **Files** tab shows the contents of the server's folder, and lets you work on them without leaving the panel (or opening
Explorer on the PC). You need the "Browse files" permission to look, "Edit files" to change things, and "Delete files" to
delete or use the trash; moderators don't have these unless an administrator gives them a [custom role](ACCOUNTS_AND_ROLES.md#custom-roles) that does.

- **Open** a folder or a text file, **Edit** a text file and save (the previous version is kept next to it as `.bak`). A file
  that isn't text, or is bigger than 2 MB, can be downloaded but not edited here.
- **Upload** a file (up to 100 MB), make a **New folder**, **Rename**, and **Download** a file, or a whole folder as a zip.
- **Unpack here** extracts a zip into the folder. Nothing is overwritten: if any file in the zip already exists, nothing is
  unpacked. A zip with a path that would escape the folder is refused.
- **Delete** moves an item to the **Trash** (a hidden folder inside the server's folder, so it uses disk space), from which it can be
  **restored** to where it came from. Nothing is removed for good until you choose **Empty trash**.
- **Only an administrator can save, upload or rename a file that can run** (`.bat`, `.cmd`, `.ps1`, `.exe`, `.dll`, `.js`
  and similar), and only an administrator can unpack a zip, because a script in a server's folder runs on the PC.
- Some things are shown but never changed here: the panel's own settings file for the server, its trash, and any `.bak` file.
- It cannot leave the server's folder: a link or junction that points outside it is refused, and so is a path with `..`, a
  drive letter, an alternate data stream or a reserved Windows name. A server whose folder is the panel's own data
  folder can't be browsed.

## Moving a server to another PC

Open the server's **Advanced** tab and find **Move to another PC**. (Administrators only, and only for a server the panel created, in a folder of its own: servers that share one install, such as several ARK maps, and servers you added by hand can't be exported.)

1. **Stop the server.** The card won't export a running one.
2. Choose what to include. **Saves and settings** is the small choice: the world, the settings, mods and schedules. The
   game itself is downloaded again on the new PC. **Everything** is the whole server folder, game files included: bigger, but
   no download on the new PC. (A game that can't be downloaded again, such as Minecraft or Terraria, needs **Everything**.)
3. Leave **Include passwords** unticked unless you want them to travel; new ones are made on the new PC.
4. Choose **Export**. When it's ready, **Download** the file (`.gpserver`). It can be downloaded once, and the temporary
   copy on this PC is removed afterwards. Nothing about this server changes.
5. On the new PC (running GodlyPanel), choose **Create server → Import a server file**, pick the file (or type its full path
   on that PC), choose **Check file**, set the new server's name and ports (the panel picks free ones), and choose **Import server**.
   If the export held only saves and settings, SteamCMD is used to fetch the game afterwards (the panel tells you if SteamCMD isn't
   installed yet).

**Only import a file you trust.** A server file contains a start script, which will run on the PC that imports it. The panel treats
the file as hostile while it reads it: it refuses names that would write outside the new folder, links, and files made by a newer
GodlyPanel than the one importing; and if anything fails part-way, everything it made is removed and no existing folder is touched.
A server file never holds a path from the old PC; the new paths are filled in on import. A backup folder outside the server's own folder is
not carried.

## Deleting a server

**Delete** on the server's settings removes it from the panel. You can also delete its files, but
only for servers the panel created, never for a shared install that other servers use, and only after
you type the server's exact name. Servers you added by hand are only ever removed from the panel; their
files are left alone.

## Keeping the panel itself up to date

`Settings → Panel updates` shows your version and whether a newer one exists, and has an **Update now** button. It
downloads only what changed (a few megabytes), checks it, restarts the panel by itself and puts the old version back if
the new one doesn't start. Your game servers keep running. Nothing happens until you press the button. The details, and
when it can't update itself, are in [Updating GodlyPanel](UPDATING.md).

# Managing servers

Click a server on the dashboard to open it. Its tabs are along the top: **Settings**
(administrators) or **Controls** (moderators), **Backups**, **Schedules**, **Logs**,
**Players**, **Stats**, **Network**, **Mods**, **Activity**, **History** and **Automation**.
Moderators see the ones they're allowed to use.

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
  exited after 15 seconds the panel forces it closed. The tile shows **Stopping…** meanwhile.
- **Restart** is a stop followed by a start.

While something is in progress the server won't accept a second action; it says what it's
busy with (**Starting…**, **Stopping…**, **Backing up…**, **Restoring…**, **Updating…**).

Closing the panel's window doesn't stop your servers. They are separate programs and keep
running.

## Backups

Open the **Backups** tab.

- **Back up now** makes a backup straight away. The panel zips the game's save folders (or
  folders you chose under **What is backed up**), then reads the zip back to check it is
  good. If it can't be read back, it is thrown away and you're told.
- Games that can't be saved while running are **stopped for the copy and started again**, so
  the backup is consistent. For games that can save on command, the panel saves first and
  copies while the game keeps running.
- **How many to keep** is under `Settings → Backups`: *Scheduled backups to keep* (default 10),
  *Delete scheduled backups older than (days)* (default: never), and *Refuse backups below this
  much free space (GB)* (default 2) so a backup can't fill your drive. Backups you take by hand
  are never deleted automatically.
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
  Wasabi, Cloudflare R2, MinIO, Amazon S3). Failed copies are shown and retried. A backup on a
  drive that has died can be fetched back and restored.

A backup is only worth something once you've restored from one. Try it once on a quiet day.

### What each game's backup holds

The panel knows where each game keeps its world and settings. **What is backed up** at the top of the Backups tab
lists the exact folders for your server, and **Choose folders & rules** changes them.

| Game | In the backup | While it runs |
|---|---|---|
| ARK: Survival Ascended | This map's own save folder (named in its launch line), the server settings, the cluster's transfer folder | Told to save, then copied |
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
- The **console** (on **Settings** or **Controls**, when the game has RCON or Telnet) sends a command to
  the game and shows its reply.
- **Players** shows who is on and who has been. For the games that support it you can **kick**,
  **ban**, and edit whitelist and admin lists. Every one of these is recorded in **Activity**.
- **Activity** is the running record of what the panel did and what happened to the server: crashes,
  restarts, backups, updates, kicks, who changed what.
- **Stats** charts CPU, memory and player counts over time.

## Settings files, and getting changes back

The **Settings** tab edits a game's config files through a form when the panel knows the format, or
as raw text. Every edit keeps a `.bak` of what it replaced. The **History** tab keeps every change
with a line-by-line difference, so you can see who changed what and put an old version back.

A running game often rewrites its settings when it stops, which would undo your edit. The panel asks
you to **stop the server first** before it will save a settings change.

## Mods

The **Mods** tab (administrators) manages mods for the games that have them: folders of mods
(Minecraft, 7 Days to Die, Palworld), Steam Workshop items for Conan Exiles, Thunderstore packages
for Valheim, and mod numbers in ARK's start script. Minecraft modpacks need a free CurseForge key
(`Settings → CurseForge API key`) and the pack's **server** export. A game reads its mods when it
starts, so stop the server before changing them.

## Deleting a server

**Delete** on the server's settings removes it from the panel. You can also delete its files, but
only for servers the panel created, never for a shared install that other servers use, and only after
you type the server's exact name. Servers you added by hand are only ever removed from the panel; their
files are left alone.

## Keeping the panel itself up to date

`Settings → Panel updates` shows your version and whether a newer one exists. **It never installs
anything by itself.** It can download the new zip and check it against the checksum in the release
notes; you then unzip it over the old app (leaving the `data` folder alone). Back up `data` first.

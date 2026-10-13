<!-- Generated from the help text in the interface (ui/src/help). Edit it there, then run `npm run build:guides`. -->

# Server options guide

The controls on a server's own page (window, ports, backups, schedules, automation, network, players, mods) and on the People page. This is what the (i) icons beside those controls link to.

For the settings inside a game itself, see the [game settings guide](GAME_SETTINGS.md). For ports and firewalls in depth, see [Ports and firewall](PORTS_AND_FIREWALL.md). For day-to-day running, see [Managing servers](MANAGING_SERVERS.md).

## Contents

- [Name and tags](#name-and-tags)
- [Window and launch](#window-and-launch)
- [Ports](#ports)
- [Backups](#backups)
- [Schedules](#schedules)
- [Automation](#automation)
- [Network](#network)
- [Logs](#logs)
- [Players](#players)
- [Mods](#mods)
- [People](#people)

## Name and tags

### Session label

What the dashboard and Discord show as this server's session. Blank means the public address and game port.

A label only: it does not rename the server inside the game (change that in Settings). Handy for a friendly name such as "Friday ARK".

### Tags

Free labels for finding and grouping servers on the dashboard.

Up to 10 per server, 24 characters each, letters, numbers, spaces, dots, dashes and underscores. Use them for things like "modded" or "friends", then group the dashboard by tag.

## Window and launch

### Window mode

How the server's console window behaves: Minimized, Hidden or No window.

Minimized keeps a taskbar entry. Hidden hides the window the moment it opens and works with any start script. No window starts the game program directly with nothing on screen and shows its live output in the panel, but it skips anything else the start script does (a SteamCMD update check, for example). Use the Update button or auto-update instead.

### Program

The server's .exe.

Used by No window. Copy it from a running server or type the full path.

### Arguments

Exactly what follows the program on the launch line.

The same text that comes after the program name in your start script.

### Start in folder

The folder the program starts in. Blank uses the program's own folder.

Some games look for their files relative to this folder, so set it if the game cannot find its data.

### Priority

How much CPU time Windows gives this server compared with other programs.

Normal is right for most. Raise to above normal for a busy server on a PC that also does other work; lower it for a background server.

## Ports

The ports this server uses. Changes are checked against the server's other ports, the ports its game takes for itself, every other server and the panel.

Saving updates the start script, the game's own config and the panel's record together, and keeps a .bak of each file. Change ports while the server is stopped. After changing the game port, update your router and firewall (see the Ports and firewall guide).

## Backups

### While the server is running

Stop it for the copy, or keep it running.

Stopping gives a consistent backup and the server comes back by itself (a minute or so). Keeping it running is gentler on players but may produce an inconsistent copy for games that cannot be saved on command; those backups are marked "copied while running".

### What is backed up

The folders and files included in each backup.

The panel knows each game's save folders. Untick "Use this game's usual save folders" to add your own paths (full paths, one per row).

### Scheduled backups to keep (this server)

Overrides the panel-wide number for this server only.

Leave blank to follow Settings → Backups.

### Delete older than (days) (this server)

Overrides the panel-wide age limit for this server only.

Leave blank to follow Settings → Backups.

### Keep a safety backup

Takes a backup of what is there now before restoring, so the restore can be undone.

Recommended. It appears in the list as "Before a restore". Without it you must type the server's name to confirm, because nothing can bring back what is replaced.

### Start the server afterwards

Starts the server again once the restore finishes.

A server that was running is always restarted by "Restart and use this backup"; this box is for a stopped server.

### Restore over the shared folder

Some games keep every server's worlds in one shared folder.

Valheim and 7 Days to Die (without a custom save folder) share worlds between all servers of that game on this PC. Restoring replaces them all, so you must confirm.

## Schedules

### What to do

Back up, restart, update, announce or send a console command.

A restart can warn players in game first. An update stops the server, runs the update and starts it again.

### Name

A label for the schedule. Optional.

Shown in the list and in the activity log.

### When

At a time of day, every so many hours, or once.

Times use this PC's clock. Daily can be limited to chosen days.

### Warn players this many minutes before

Minutes before a restart to tell players, such as 10, 5, 1.

Comma-separated; blank for no warning. Only games with an in-game chat or broadcast command can show warnings.

### Messages

The announcements to rotate through, one per line.

Each time the schedule runs it says the next message, then starts over.

### Console command

Sent over RCON when the server is running.

Exactly as you would type it in the game's console.

### Servers

Which servers the schedule applies to.

One schedule can cover several servers, for example a nightly backup of everything.

## Automation

### Restart it if it crashes

If the program disappears, the panel starts it again.

It gives up after the number of tries set in Settings → Crash recovery, so a server that crashes at every start does not loop forever. You are notified when it gives up.

### Also restart it if it is running but stops answering

Restarts a server whose program is alive but no longer responds.

Give it a generous time: a world can look frozen while it saves or loads, and restarting mid-save can damage it.

### After (minutes)

How long it must be unresponsive before it is restarted.

10 or more is safer for big worlds.

### Start it when GodlyPanel starts

Brings this server up when the panel starts.

Together with "Start GodlyPanel when I sign in to Windows" your servers come up after a reboot, spaced apart by the delay in Settings.

### Auto-update

Updates this server by itself when Steam has a new version.

Needs "Check Steam for game updates" turned on in Settings → Refresh rates. The server is stopped, updated and started again.

### Message of the day

The message players see when they join.

Where the game stores it differs; the panel writes it in the right place for each game.

### Name for these settings

Saves this server's settings as a preset you can apply to other servers of the same game.

Good for "PvE" or "hardcore". Passwords and ports are not applied unless you untick the box below.

### Keep this server's own name, passwords and ports when applying

Applies a preset without changing who the server is.

Leave it ticked: you almost never want a preset to overwrite a server's name, passwords or ports.

### Name for the copy

Makes a full copy of this server with its own name, ports and RCON password.

Works for servers the panel created, in a folder of their own, and the original must be stopped. The copy uses as much disk as the original.

### Session name (optional)

The in-game name for the copy.

Blank keeps the original's.

### Change the RCON password

Gives the server a new RCON password and updates the panel with it.

Do this if the password may have leaked. The server must be stopped for the game's config to be rewritten.

## Network

### Also on public networks (less safe)

Allow the firewall rule on public Wi-Fi profiles as well as private ones.

Leave off unless this PC's network is classed as Public by Windows. Public profiles cover networks you do not trust.

## Logs

### Log

Which log file to read.

Some games write several. The panel's own captured output is listed first when the server was started without a window.

### Lines

How many of the latest lines to show.

More lines take longer to load and redraw.

### Follow live

Keeps the view scrolled to the newest lines.

Turns off while you search. Passwords in logs are masked for everyone except administrators.

### Search this log

Finds lines containing your text in the end of the file.

Case-insensitive. Searches the last part of very large logs rather than the whole file.

## Players

### Player

Who to kick, ban or list.

A name, or the id the game uses (Steam ID, UUID). Names are checked so nothing can end a console command and start another.

### Reason

Shown to the player where the game supports it and kept in the activity log.

Optional.

## Mods

### Add a mod

Install a mod by number, package name or file.

What you enter depends on the game: a Steam Workshop number (Conan Exiles), Owner-Name from Thunderstore (Valheim), a mod number in the start script (ARK) or a file or folder (Minecraft, 7 Days to Die, Palworld). The panel does not explain the settings inside mods.

## People

### Access

Administrator does everything; Moderator runs servers day to day; Viewer can only look.

Moderators can start, stop, restart, update, back up, read logs and use the console, kick and ban, but cannot see passwords or settings, delete or restore. A moderator can be limited to chosen servers. Viewers cannot see join passwords, config files or anything that changes state.

### Servers a moderator can use

Every server, or just the ones you tick.

Limits what a moderator can open and control. The server checks it on every request.

### Password

At least 8 characters.

Setting a new password signs that person out everywhere, so tell them the new one.

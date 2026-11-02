# What the messages mean

A message that isn't clear is a bug in the panel, not something you should have to work out. This page
explains the ones people ask about, grouped by what you were doing, with what to do next. Wording can be a
little different on screen; the start of each message is what to look for.

If a message isn't here, or the explanation doesn't help, please
[open an issue](https://github.com/Vulcanie/GodlyPanel/issues) and quote the message.

**Jump to:** [Signing in](#signing-in) · [A page that says "private"](#pages-that-say-no) ·
[Passwords and accounts](#passwords-and-accounts) · [Starting and stopping](#starting-stopping-and-consoles) ·
[Backups and restores](#backups-and-restores) · [Settings and ports](#settings-and-ports) ·
[Community view](#community-view-and-tunnels) · [Mods](#mods) · [Files](#files) ·
[Roles and console commands](#roles-and-console-commands) · [Game updates](#game-updates) ·
[Moving a server](#moving-a-server-export-and-import) · [Panel updates](#panel-updates) ·
[The data folder](#the-data-folder)

---

## Signing in

**Incorrect username or password.**
Either one is wrong, or the account doesn't exist, or it has been suspended. The panel deliberately doesn't say
which, so strangers can't use the page to find out who has an account. Check caps lock. If you've forgotten your
password, an administrator can set a new one for you under **People**.

**Too many failed sign-in attempts. Try again in N minute(s).**
Too many wrong passwords in a short time, for that account or from that address. Wait the time it says; it
clears by itself. This protects against someone guessing. Your real password still works once the wait is over.

**Your password is right, but admin accounts can't sign in on this public address…** *(or "moderator accounts")*
You're on the **community address** (the public page for friends), and administrator and moderator accounts
aren't allowed to sign in there unless the owner allowed it. Nothing is wrong with your account. Open the panel
on your own network (`http://<the PC's address>:8765`), through your VPN, or ask the owner to switch on
*Let administrators and moderators sign in here too* (`Settings → Community view`). See
[Security checklist](SECURITY_GUIDE.md#staff-sign-in-from-outside) before they do.

**That code isn't right…** / **That code isn't accepting new people any more. Ask the owner for a new one.**
The community code is mistyped, has been replaced, has expired, or has reached its limit of sign-ups. A code
looks like `ABCD-EFGH`. Ask the owner for the current one.

**Too many wrong codes. Try again in N minute(s).**
Guesses at the community code are slowed down for everyone. Wait, then try again with the right code.

**A code, a username and a password are all needed.**
You left one of the three boxes empty on the "I have a community code" form.

---

## Pages that say no

These appear when you open the panel from somewhere it won't answer. They are the panel working as designed.

**"This panel is private"** *(reference `lan_only`)*
You opened the panel's address from a device that isn't on the owner's network, such as mobile data or
another house. The panel never serves anyone outside the network it runs on. Guests and friends should use the
**community address** the owner gave them. Administrators and moderators can use the community address only if the
owner has allowed staff to, or a VPN such as Tailscale. If you're the owner and you're at home, check the device is on
the same network as the PC (not a guest Wi-Fi, not mobile data). The page shows the address the panel saw, which helps
when working out which network you're on.

**"Open it by this PC's address"** *(reference `bad_host`)*
The panel only answers when it's opened by the address of the PC it runs on (for example `http://192.168.1.20:8765`),
not by some other web name pointed at it. This stops a trick where a website you visit talks to your panel behind
your back. Use the address the PC shows. If you set up your own name on purpose, the owner can add it under
`Settings → Network → Additional allowed names`.

**"Not available through a tunnel"** *(reference `tunnel_refused`)*
Traffic from a Cloudflare tunnel reached the *panel* instead of the community view's small page. The tunnel should
point at the community view's port (shown in `Settings → Community view`), not at the panel.

**That request came from a different website or page than the panel, so it was refused.**
Something other than the panel's own page tried to make a change: a different website, or a page served by another
program on the same PC. Use the panel's own page. If you see this when you didn't expect to, close other browser tabs
you don't recognise.

**You don't have access to that.** / **You don't have access to that server.**
Your role can't do this (see [Accounts and roles](ACCOUNTS_AND_ROLES.md)), or a moderator who has been limited to some
servers tried another. Ask an administrator.

**Sign in required.**
You've been signed out: the sign-in expired (7 days), or your password or role was changed. Sign in again.

**Initial setup can only be completed on the computer running GodlyPanel.**
Creating the first administrator is limited to the PC itself, so nobody else on your network can claim the panel
before you. Do it from that PC.

**Slow down a little.** *(on the community address)*
One visitor made a lot of requests in a minute. It clears after a moment.

---

## Passwords and accounts

**Choose a password of at least 8 characters.**
Longer is better. A few unrelated words (`river-lantern-quiet-moss`) are easy to remember and hard to guess.

**That password is too long: 72 bytes is the most that can be used.**
Passwords are stored in a form that only uses the first 72 bytes, so anything longer would be silently ignored. Accented
characters count for more than one byte each. Choose a shorter one.

**That password is one of the most common ones…**
It's on lists attackers try first (`password123`, `qwertyuiop`). Pick something less guessable.

**The password can't be the same as the username.**
A name plus a number or a symbol counts as the name.

**A username is 3 to 32 characters long and can use letters, numbers, dots, dashes and underscores (no spaces).**

**A user named "…" already exists.** Names aren't case-sensitive. Pick another.

**Your current password is incorrect.**
In **Change password** (your menu, at the bottom of the left-hand menu) you have to give your current password before choosing a new one.

**Cannot change the role of / disable / delete the only admin account.**
The panel won't let you lock yourself out. Make another administrator first.

---

## Starting, stopping and consoles

**Stop the server first…** *(several versions: restoring, changing ports, editing settings, mods, cloning, deleting, the RCON password)*
A running game holds its files, ports and settings in use, and often writes its settings back when it stops, which
would undo your change. Stop the server (and wait for **Stopping…** to finish), then do it again.

**The panel doesn't know how to start this server, because it has no start script.**
Add a start script in the server's **Settings**, or set up the program under **Window & console** → **No window**.

**RCON isn't set up for this server.** / **The Telnet console isn't set up for this server.**
There is no console password and port recorded. Games without a console (Valheim, Enshrouded and others) can't take
commands.

**RCON authentication failed (wrong password): the game refused the password the panel has for it…**
The password the panel has doesn't match the one the game is using. This usually means it was changed in the game's own
files (or the game hasn't been restarted since the panel changed it). Make the two match: set the password in the
server's settings to what the game has, or use **Change the RCON password** on the **Automation** tab with the server
stopped, then start it.

**The RCON connection to the game was closed…**
The game closed the connection. It may be restarting or shutting down. Try again in a moment.

**This game has no console to do that from.** / **This game can't kick/ban players from here.**
Not every game offers those commands over the console. Where it doesn't, the panel doesn't pretend.

**SteamCMD isn't installed yet. Download it from Settings first.**
SteamCMD is the tool that downloads game servers. The panel fetches it for you, once, when you agree to it.

**Type the server's exact name to confirm.**
For anything that can't be undone (deleting, restoring) you type the name to show you meant it.

---

## Backups and restores

**None of this server's save folders exist yet, so there is nothing to back up. Start the server once so it creates them.**
A new game hasn't made its save folders. Start it, let it run a minute, then back up.

**No folders are set up to back up for this server.**
Choose folders under **What is backed up** on the **Backups** tab.

**The backup was written but couldn't be read back, so it was discarded.**
The panel checks every backup by reading it back. This one failed the check, so it kept nothing rather than
something it can't trust. The usual cause is a full or failing drive. Check free space and try again.

**Not enough room on the backup drive…** / **Not enough free space to restore…**
The drive would be left with less than your minimum free space (`Settings → Backups → Refuse backups below this
much free space`). Free some space, move the backup folder, or lower the minimum.

**That backup has no readable record of what it holds, so it can't be restored safely.**
The backup file is damaged or isn't one the panel made.

**That folder is inside (or contains) the local backup folder, so it wouldn't be a separate copy.**
A copy kept in the same place isn't protection against losing the drive. Pick a folder on another drive, share or
cloud-sync folder.

**Each backup folder needs a path. Remove any blank entry.**
A row in the folder list is empty.

---

## Settings and ports

**Port N is right after the game port. The game may use it for itself, so it's kept free.**
Games quietly use the port next to their game port. The panel stops you putting a query or RCON port there, so
nothing clashes. Choose a different number.

**Port N is used by <game> itself (…), so it can't be used for anything else.**
Same idea for a port the game is known to take.

**Choose a port from 1024 to 65535.**
Ports below 1024 belong to system services, so the panel keeps clear of them.

**That setting wasn't found in the file, so nothing was changed.** / **The settings file doesn't exist yet. Start the server once so the game creates it.**
Some games only make their settings file the first time they run. Start the server once, then edit.

---

## Community view and tunnels

**cloudflared isn't installed yet. Download it first.**
The tunnel program is downloaded from Cloudflare once, when you agree to it in the set-up dialog.

**Paste the tunnel token first.** / **That doesn't look like a tunnel token. Copy it whole from the Cloudflare dashboard.**
The token is long (over 40 characters) and has no spaces. Copy all of it.

**Enter the public address this tunnel serves.** / **That isn't a valid web address (use a name such as panel.example.com).**
Type the name only, such as `panel.example.com`.

**Port N is in use by something else. Choose another port for the community view.**
Another program holds the listener's port. Choose a different one in the set-up dialog.

**Another cloudflared on this PC is also running the tunnel "…".**
Two programs serving one tunnel split visitors between them, so about half land on the wrong one. Stop the other.

**This address isn't served here.** *(421)*
Someone opened the community listener by its number or under a name it doesn't answer to. Use the public address.

---

## Mods

**Stop the server first: a game reads its mods when it starts.**
Stop it, change the mods, start it.

**No CurseForge API key set. Add one in Settings (free, from console.curseforge.com) to install modpacks.**
Modpacks from CurseForge need a free key. Create one at console.curseforge.com and paste it under
`Settings → CurseForge API key`.

**manifest.json not found at the root of the zip — is this a CurseForge modpack export?**
Upload the pack's **server** export (the zip with `manifest.json` at its top), not a folder or the client download.

**I don't recognise that link.**
The pasted text isn't a mod page, a release or a file address the panel knows how to read. Paste the mod's own page address, or a direct file link.

**This address isn't one of the known mod sites. Only install from an address you trust.**
The panel installs without asking only from places it knows. Tick **I trust this address** if you do trust it. An address that leads to a private
network address, or one with a username and password in it, is never fetched.

**That address isn't one of the ones the panel will download from.**
The address (or a redirect from it) was refused by the download guard: it isn't https, names a port other than the usual one, or points inside a private network.

**This mod is for players only, so it isn't installed on the server.** / **This mod pulls in too many other mods.** / **This mod has too many files.**
The panel installs a mod, its required dependencies and its files up to a limit. A client-only mod belongs on the players' side.

**The mod couldn't be installed / updated. The panel's log has the details.**
The download, its checksum, or a dependency failed. Whatever that attempt had installed was taken back out, and for an update the old mod was put back.

**This game's mods can't be added from an address.** / **This game's mods can't be shared.** / **… can't be packed as a Modrinth pack.**
The game's mods are managed another way (Workshop numbers, Thunderstore, the start script) or the panel doesn't manage them. A Modrinth pack also needs the game version to be known.

---

## Files

**You don't have permission to see this server's files.**
Your role lacks "Browse files". Editing needs "Edit files", and deleting or using the trash needs "Delete files".

**Only an administrator can save that kind of file.** / **Only an administrator can unpack a zip.**
Scripts and programs (`.bat`, `.cmd`, `.ps1`, `.exe`, `.dll`, `.js` and similar) run on the PC, and a zip can hold them, so only an administrator may save, upload or unpack them.

**That path is outside this server's folder.**
The panel never leaves the server's folder, and treats a link or junction that points elsewhere, `..`, a drive letter or a reserved Windows name as outside.

**That file isn't text, so it can't be opened or changed here.** / **The panel keeps that item for itself, so it can't be changed here.**
Download a binary file instead of editing it. The panel's own files for the server (its settings file, the trash, `.bak` copies) are read-only here.

**Something is already there with that name.** / **The folder it would go in doesn't exist.**
Renaming, moving and unpacking never overwrite. Rename or remove what's there, or create the folder first.

**The zip holds a path that isn't allowed.** / **That isn't a zip file this panel can open.**
Unpacking refuses any entry that would land outside the folder. Nothing was extracted.

---

## Roles and console commands

**You can't give a role permissions you don't have yourself.**
You can edit roles only up to what you hold. Only an administrator can hand out more, or change a role's console command limits.

**Move the people holding it to another role first.** / **Built-in roles can't be deleted.**
A role in use can't be deleted. Change those people to another role on the **People** page, then delete it.

**Your role isn't allowed to run that command.**
The role's console limit (an allow-list or a deny-list) doesn't permit the first word of the command. Ask an administrator, or see
[Limiting the console commands](ACCOUNTS_AND_ROLES.md#limiting-the-console-commands).

**That command can't be sent here: one command at a time, no chaining.**
A role with console limits can't send a line with a second command attached (a line break, `;`, `|` or `&&`). Send the commands separately.

---

## Game updates

**There is no update to roll back for this server.** / **That update has already been rolled back.**
**Roll back saves** works on the newest update only, once.

**The panel did not back this server up before that update, so there is nothing to roll back to.**
That update ran without a backup. Turn on **Back up this server before every game update** for next time.

**The panel is still waiting to see if the server comes back after the update. Try again in a moment.**
Rolling back would race the check. Wait for the card to say **Came back online** or **Did not come back**.

**Stop the server first. Rolling back replaces files the game is using.**
Stop it and wait for **Stopping…** to finish.

**The backup before the update failed. Update without a backup?**
The panel stopped the server, tried to back it up, and couldn't (often disk space). Say no and fix the cause, or yes to go ahead without the safety net.

---

## Moving a server: export and import

**That is not a GodlyPanel server file.** / **This file has no manifest, so it isn't a GodlyPanel bundle.** / **The bundle's manifest isn't valid.**
The chosen file isn't a `.gpserver` made by GodlyPanel, or is damaged.

**That file was refused because it is not safe to open.** / **The bundle holds a link or special file, so it was refused.** / **The bundle holds a file name that isn't safe, so it was refused.**
The panel checks every name in a bundle before extracting anything. This one holds something that could write outside the new folder, so nothing was imported.

**That file was made by a newer GodlyPanel. Update this one first.**
Update the PC you are importing on (`Settings → Panel updates`).

**A server with that name already exists. Pick another name.** / **There is not enough free space for this server.**
Rename the import, or free some space, then try again.

**The uploaded file is gone. Choose it again.** / **The panel lost track of this import (it may have restarted).**
The temporary upload was swept or the panel restarted. Choose the file again; check the server list first, in case the import actually finished.

**Stop the server first, so its files are copied in one piece.** / **This game's servers share one install, so only a server in a folder of its own can be exported.**
Export needs a stopped server of the panel's own making, in a folder of its own. See [Moving a server](MANAGING_SERVERS.md#moving-a-server-to-another-pc).

---

## Panel updates

**The download doesn't match the checksum in the release notes (got …, expected …), so it was deleted.**
The file you downloaded isn't the one that was published (corrupted, or tampered with). It was deleted. Try again,
and if it keeps happening, download from the project's Releases page and compare the SHA-256 yourself.

**That download isn't from a place the panel trusts, so it was not fetched.**
The panel only downloads updates from the project's GitHub releases.

**The download is … bytes but should be …, so it was deleted** / **The download is larger than it should be.**
What arrived isn't the size the release says it is. It was deleted and nothing was changed. Try again.

**… isn't what its list says, so it was not used** / **The app update holds …, which isn't part of the app's own files.**
The update was downloaded and matched its checksum, but its contents don't match the list that comes with it. It was
thrown away before anything was replaced. If it happens again, report it: it may be a faulty release.

**Wait until … have finished, then update.**
A backup, restore, game update or install is running, and restarting the panel would cut it off. Try again when it's done.

**Version … didn't start properly (…), so … was put back.**
The update was installed but the new version didn't come up, so the old files were restored and the old version was
started again. Nothing was lost. `data\logs\update.log` says what happened; please report it.

**The update to … didn't work and was undone.**
The same thing, shown on the Panel updates card. Your servers were not affected.

**This copy of GodlyPanel isn't the installed app / This Windows account can't change the files in …**
**Update now** isn't available here. See [When it won't update](UPDATING.md#when-it-wont-update-and-why).

---

## The data folder

**GodlyPanel can't read … (EACCES / EPERM / EBUSY). Check that this Windows account may open it and that no other
program has it locked; the file was not changed.**
The panel found one of its own data files but couldn't open it. It stopped instead of treating it as empty, which would
have looked like a fresh install and could have overwritten your accounts or settings. The usual causes are that the file
was copied from another Windows account, or something (antivirus, a backup tool) is holding it open. Close that program, or
make sure your Windows account can open the `data` folder, then start the panel again.

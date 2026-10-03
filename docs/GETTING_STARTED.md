# Getting started

This takes about ten minutes, plus however long your first game takes to download.

## What you need

- A Windows 10 or 11 PC (64-bit). The PC has to stay on while people play.
- Free disk space. Game servers are big: a few gigabytes each, and some are tens of
  gigabytes. Pick a drive with room.
- That's all. GodlyPanel brings everything else with it.

## 1. Install

1. Download the latest `GodlyPanel-…-win.zip` from the
   [Releases page](https://github.com/Vulcanie/GodlyPanel/releases).
2. **Unblock the zip before you unzip it.** Right-click the zip → **Properties** → tick
   **Unblock** at the bottom → **OK**. This stops Windows from nagging you about every file
   inside. (If you skip it, you may see *"Windows protected your PC"* when you run the
   app. Choose **More info → Run anyway**. The app isn't code-signed yet, which is why.)
3. Unzip it somewhere with plenty of space, such as `D:\GodlyPanel`. Don't use
   `C:\Program Files`; Windows won't let programs save files there.
4. Run **`GodlyPanel.exe`**.

## 2. First run

The first screen asks two things.

**Where should your servers live?** Either inside the GodlyPanel folder, or somewhere
else, such as a bigger drive. You can change this later in `Settings`.

**Create the admin account.** This is the account that can do everything, so give it a
password you'd be happy to have protecting your PC:

- at least 8 characters, and no more than 72;
- not one of the usual ones (`password123`, `12345678`…), and not the same as the username;
- a few random words strung together works well and is easy to remember.

Only the PC itself can do this step, not another device on the network. That is on
purpose, so nobody else on your network can claim the panel before you do.

## 3. Create your first server

1. On the dashboard choose **Create Server**.
2. Pick a game. Each one shows the ports it needs, filled in for you.
3. Give it a name and, if the game asks, a session name and a join password.
4. Choose **Create**. The panel downloads the game with SteamCMD, which it fetches for you
   the first time (it asks first). This is the slow part, and you can watch the progress.
5. When it finishes, the server appears on the dashboard. Press **Start**.

The tile shows **Starting…** and then **Online** once the game answers. Some games take a
couple of minutes to load a world.

> **Already have servers set up by hand?** The panel can look after them without touching
> their files, but there is no import button in the interface yet; it is done through the
> panel's settings API. If you need that, ask in an [issue](https://github.com/Vulcanie/GodlyPanel/issues).
> Servers the panel *creates* have the most features (cloning, safe port changes, deleting
> with their files).

## 4. Let friends in

Two separate things, and people often mix them up:

- **Joining the game.** Friends connect to your *game server* using its game port. For
  friends outside your home you open that port on your router and in Windows Firewall.
  See [Ports and firewall](PORTS_AND_FIREWALL.md).
- **Seeing the panel.** Friends on your network can open `http://<this PC's address>:8765`
  and sign in with a **Viewer** account (`People`, then fill in the form and choose **Add**).
  Friends outside your home use the [community view](REMOTE_ACCESS.md), a small public page
  that shows status and how to join.

**Never open the panel's own port (8765) on your router.** The panel refuses connections
from outside your network anyway, but the point is not to expose it at all.

## 5. Set up a safety net

Before anything else goes wrong:

1. Open the server's **Backups** tab and take a backup. Then try a **restore** once, on a
   quiet day. The panel takes a safety backup of what it replaces first, so it is safe to
   try, and a backup you've never restored is a hope, not a backup.
2. Add a schedule for regular backups (the server's **Schedules** tab).
3. Switch on **Restart it if it crashes** (the server's **Automation** tab).
4. Optionally keep copies off this PC too, under **Copies off this PC** on the **Backups**
   tab: another drive, a network share, a cloud-sync folder or S3-compatible storage.

## 6. Day to day

- Close the window and the panel keeps running in the system tray. Your game servers keep
  running either way. Use the tray icon's **Quit** to exit the panel.
- The panel can start with Windows: **Settings**, then **Starting with Windows** → *Start
  GodlyPanel when I sign in to Windows*.
- It tells you when something needs attention (a crash, a failed backup, low disk space)
  through Windows notifications, and Discord or email if you set those up in `Settings`.

## Where your data is

Everything the panel owns lives in the `data` folder next to the app. Back that folder up
and you've backed up your accounts, settings and server list. Delete it and you have a
fresh install. The folder holds passwords and keys, so the panel limits it to your Windows
account; don't copy it to a place other people can read.

Next: [Accounts and roles](ACCOUNTS_AND_ROLES.md) · [Ports and firewall](PORTS_AND_FIREWALL.md) · [Managing servers](MANAGING_SERVERS.md)

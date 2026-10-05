# Updating GodlyPanel

When a new version of GodlyPanel is out, the **Settings → Panel updates** card (and a banner on the dashboard) says so.
Press **Update now** and the panel does the rest. You don't download a package or unzip anything.

## What happens when you press Update now

1. **It downloads only what changed.** Almost every release changes the app's own files, a few megabytes, and leaves the
   Electron program that runs them (about 250 MB) as it is. Only the few megabytes are downloaded. When a release moves to a
   newer Electron, the card says so and downloads the whole package instead (around 130 MB).
2. **It checks what it downloaded.** The download has to match the SHA-256 the release publishes, and then every file inside
   has to match the list that comes with it. Anything that doesn't match is thrown away, and nothing is changed.
3. **GodlyPanel closes, swaps its files, and starts the new version.** This takes about half a minute. The page shows
   "Updating GodlyPanel" and reloads by itself when the panel is back.
4. **If the new version doesn't start, the old one is put back.** The update waits for the new version to say it is running.
   If it closes again straight away, or says nothing for 90 seconds, the old files are restored, the old version is started
   again, and the card tells you the update was undone and why.

## What isn't touched

- **Your game servers keep running.** They are separate programs. The panel itself is unavailable for the half minute, so
  nothing is watching them (a crashed server isn't restarted until it is back), and anyone using the panel is
  disconnected.
- **Your `data` folder** (settings, accounts, backups, the servers themselves) is never part of an update.

## When it won't update, and why

| The card says | What it means |
|---|---|
| *This copy of GodlyPanel isn't the installed app (it is running from source)* | You started the panel from the source code, not the packaged app. Update with `git pull`, or download the package. |
| *This Windows account can't change the files in …* | The app is in a folder you can't write to (for example Program Files). Run it from a folder you own, or unzip the package yourself. |
| *Wait until … have finished, then update* | A backup, restore, game update or install is running. Restarting would cut it off. Try again when it's done. |
| *This release gives no checksum the panel can verify* | Releases from before this feature don't. The panel never installs something it can't verify by itself; download the package and unzip it instead. |
| *Updating GodlyPanel has to be done from this PC or your home network* | You pressed it through the public address ([Remote access](REMOTE_ACCESS.md)). Do it from home. |

## The first time

This feature has to be in the version you are running to update itself, so **the first version that has it is installed the
old way** (download, unzip over the old folder, keep `data`). From then on, **Update now** does it.

## If you'd rather do it by hand

**Or download the whole package** on the same card downloads the full zip and checks it against the checksum in the release
notes. Quit GodlyPanel, unzip it over the old folder (leave `data` alone), and start it again. Back up `data` first.

## For the curious: how the files are laid out

Each release carries three downloads: `GodlyPanel-<version>-win.zip` (the whole package), `GodlyPanel-<version>-app.zip`
(just the app's own files, with a list of every file and its checksum), and `update-manifest.json`, which names both, gives
their sizes and checksums, and says which Electron the app files were built on. The release workflow writes the manifest
from the final files, so its checksums are of exactly what is attached. The panel only downloads files named in that
manifest, and only from GitHub. [SECURITY.md](../SECURITY.md#updating) says what that does and doesn't protect against.

Everything about an update is written to `data\logs\update.log`, and the result is in **Activity**.

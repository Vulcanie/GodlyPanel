# Glossary

Words you'll meet in GodlyPanel and in game-server guides, in plain language.

**Administrator** — the role that can do everything, including changing settings, managing people and running
programs on the PC. See [Accounts and roles](ACCOUNTS_AND_ROLES.md).

**App ID (Steam)** — the number that identifies a game on Steam, taken from its store page address. The panel uses it
to download and update a game's server.

**Backup** — an archive (`.zip`, or the smaller `.tar.zst` or `.tar.xz`) of a server's save folders, checked by reading it back. See [Managing servers](MANAGING_SERVERS.md#backups).

**Bundle (`.gpserver`)** — the single file a server is exported to when you move it to another PC. It holds the saves, settings, mods and
schedules (or the whole install) and a description of the server, but no path from your PC and, unless you ask, no passwords. Only import
ones you trust. See [Moving a server to another PC](MANAGING_SERVERS.md#moving-a-server-to-another-pc).

**CGNAT** — when your internet provider shares one public address between many homes. Port forwarding can't work
behind it. See [Ports and firewall](PORTS_AND_FIREWALL.md#when-forwarding-just-wont-work).

**Clone** — a full copy of a server with its own name, ports and RCON password.

**cloudflared** — Cloudflare's own tunnel program. The panel downloads it (when you agree) to publish the community view.

**Community code** — a short code (like `ABCD-EFGH`) that lets friends make their own Viewer account at the community
address. Can be switched off, replaced, set to expire, or capped.

**Community view** — a small public web page, separate from the panel, that shows Viewers which servers are up and how to
join. Published through a Cloudflare tunnel, so nothing is opened on your router. See [Remote access](REMOTE_ACCESS.md).

**Console** — a game server's command line. Many games expose it remotely through **RCON** or **Telnet**.

**Crash recovery** — the panel restarting a server whose program has disappeared, with a limit so a server that crashes
every time doesn't loop forever.

**Custom role** — a role an administrator makes from a list of permissions, optionally with limits on which console commands it may
send. See [Accounts and roles](ACCOUNTS_AND_ROLES.md#custom-roles).

**Data folder (`data`)** — the folder next to the app that holds everything the panel owns: accounts, settings, server list
and logs. It holds secrets, so it stays private.

**DDNS (dynamic DNS)** — a free name (such as one from DuckDNS or No-IP) that follows your home's public address when your
provider changes it.

**DHCP reservation** — telling your router to always give your PC the same address on your network. Port forwards need it.

**Firewall (Windows Firewall)** — the part of Windows that decides which connections may reach programs on your PC.

**Game port** — the port players connect to. Most games also use the port next to it, which the panel keeps free.

**Game server login token (GSLT)** — a token from Steam (or, for some games, the game's maker) that a few servers need to be listed
publicly or to open their port at all. The panel asks for it where a game needs one. See [Game support](GAME_SUPPORT.md#what-some-of-them-need-from-you).

**Guest** — the old name for a **Viewer**.

**Hang (unresponsive)** — a server whose program is running but no longer answers. The panel can restart it separately from
crash recovery.

**Hidden / Minimized / No window** — the three ways a server's window can be handled. See
[Managing servers](MANAGING_SERVERS.md#windows-and-consoles).

**Lock file (mods)** — the panel's record, per server, of the mods it installed, where each came from and a checksum of every file. It lets
the panel spot a mod changed by hand and update one safely. It is kept in the panel's `data\modlocks` folder, not in the game's.

**Mesh VPN (Tailscale)** — a private network between your devices, with no router changes. Lets someone reach the panel as if
they were at home. See [Remote access](REMOTE_ACCESS.md).

**Moderator** — a role that runs servers day to day (start, stop, restart, update, back up, logs, console, kick, ban) but can't
see passwords, change settings, delete or restore. Can be limited to some servers.

**Modpack / `.mrpack`** — a set of mods that go together. CurseForge modpacks are uploaded to create a Minecraft server; a Modrinth pack
(`.mrpack`) is what the panel gives players to install the same mods in a launcher. See [Managing servers](MANAGING_SERVERS.md#mods).

**Permission** — one thing a role may do, such as "Back up servers" or "Edit files". See [Accounts and roles](ACCOUNTS_AND_ROLES.md).

**Port** — a numbered door on your PC. A program listens on a port; a connection says which port it wants.

**Port forwarding** — telling your router to pass traffic for a port from the internet to a particular PC on your network.

**Preset** — a saved set of a server's settings ("PvE", "hardcore") that can be applied to another server of the same game.

**Public IP address** — the address the internet sees your home as. Friends join with it. Search "what is my IP" to find it.

**Query port** — the port server browsers use to ask a game server its name, players and so on.

**RCON** — "remote console": a way for a program (like the panel) to send commands to a game server using a password. Keep its
port closed to the internet.

**REST API (Palworld)** — Palworld's own control interface, used only by the panel on this PC. Keep it closed to the internet.

**S3-compatible storage** — cloud storage that speaks Amazon's S3 protocol (Backblaze B2, Wasabi, Cloudflare R2, MinIO, Amazon S3).
Used for copies of backups off your PC.

**Start script** — the `.bat` file that starts a game server. The panel can also start the game program directly (**No window**).

**SteamCMD** — Valve's command-line tool for downloading game servers. The panel fetches it for you, once, when you agree.

**Telnet (7 Days to Die)** — that game's console. The panel uses it to save the world before a stop. Keep its port closed.

**Thunderstore / CurseForge / Modrinth / GitHub / Steam Workshop** — places mods come from: Thunderstore for Valheim, CurseForge and Modrinth
for Minecraft, GitHub releases and direct links for several folder-based games, and the Steam Workshop for Conan Exiles and others.

**Trash (file manager)** — where the **Files** tab moves what you delete, inside the server's folder, until you restore it or empty the trash.

**Tunnel (Cloudflare Tunnel)** — an outbound connection from your PC to Cloudflare that carries visitors back to your community
view, so no router change is needed.

**UDP / TCP** — the two kinds of connection games use. Most games use UDP; a few use TCP. A port forward must match.

**Viewer** — the role that can see which servers are up and how to join, and nothing else.

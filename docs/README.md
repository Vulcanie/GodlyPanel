# GodlyPanel guides

Plain-language help for running GodlyPanel. Pick what you need:

| I want to… | Read |
|---|---|
| Install it and get my first server running | [Getting started](GETTING_STARTED.md) |
| Add people, make a custom role, limit console commands | [Accounts and roles](ACCOUNTS_AND_ROLES.md) |
| Let friends join my server (router, firewall, ports) | [Ports and firewall](PORTS_AND_FIREWALL.md) |
| Let people see my servers from outside my home | [Remote access](REMOTE_ACCESS.md) |
| Look after servers day to day: start, stop, back up, schedule, update, mods, files, move to another PC | [Managing servers](MANAGING_SERVERS.md) |
| Update GodlyPanel to a new version | [Updating GodlyPanel](UPDATING.md) |
| Understand a message I was shown | [What the messages mean](WHAT_THE_MESSAGES_MEAN.md) |
| Fix something that isn't working | [Troubleshooting](TROUBLESHOOTING.md) |
| Make sure I haven't left a door open | [Security checklist](SECURITY_GUIDE.md) |
| Find out what a word means (RCON, query port, tunnel…) | [Glossary](GLOSSARY.md) |
| Quick answers | [FAQ](FAQ.md) |
| See which of the 93 games are supported and how well they were tested | [Game support](GAME_SUPPORT.md) |
| Translate the panel, or fix a translation | [Translating GodlyPanel](TRANSLATING.md) |
| Find out what a setting on the Settings page does | [Panel settings guide](PANEL_SETTINGS.md) |
| Find out what a control on a server's page does | [Server options guide](SERVER_OPTIONS.md) |
| Find out what a setting inside a game means | [Game settings guide](GAME_SETTINGS.md) |
| Find out what a launch argument does | [Launch arguments guide](LAUNCH_ARGUMENTS.md) |

The four guides at the bottom of the table are generated from the help text in the interface (the (i) icons link to them),
so edit that text, in `ui/src/help` and the catalogs in `ui/src`, and run `npm run build:guides` rather than editing them by hand.

Behind these, [SECURITY.md](../SECURITY.md) is the technical description of how the
panel defends itself, and the [README](../README.md) covers building it from source. For people working on
the code: [CONTRIBUTING.md](../CONTRIBUTING.md), [Code signing](CODE_SIGNING.md) (the plan), and
`research/games/` (the sourced notes each game was built from).

## How to read the guides

- **Bold names** are things you can click or read on screen, exactly as they are labelled.
- A path like `Settings → Community view` means: open **Settings**, then find the **Community view** card. The Settings page
  is split into six groups down the left (General, Servers, Backups, Notifications & Discord, Community & remote access, and
  Appearance); pick one, or type a word in the search box at the top (for example `backup` or `port`) to see the matching
  settings from every group.
- The **panel** is GodlyPanel itself. A **server** is one game server it looks after.
- "On your network" means on the same home Wi-Fi or cable network as the PC that runs the panel.

Something wrong or unclear in these pages? That's a bug in the documentation. Please
[open an issue](https://github.com/Vulcanie/GodlyPanel/issues).

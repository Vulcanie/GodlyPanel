# Contributing

Thanks for taking an interest. This is a small project maintained by one person,
so a few notes keep things smooth.

## Ways to help that are always welcome

- **Bug reports** with what you did, what you expected, what happened, your Windows
  version, and the last lines of `data\logs\api.log` (it's safe to share: keys and
  webhooks are stored elsewhere).
- **A game that doesn't work.** Say which game, how you start it by hand, and what
  the panel did. The panel's per-game knowledge lives in
  `src/server/data/gameTemplates.js`, and is written from real installs, so a
  working command line is the most useful thing you can send.
- **Testing on a machine that isn't the maintainer's.** Every release so far has been
  tried on one PC. Reports from a different Windows setup, especially a clean one,
  are valuable.

## Setting up

You need Windows 10/11 and Node.js 22 or newer.

```powershell
git clone https://github.com/Vulcanie/GodlyPanel.git
cd GodlyPanel
npm run setup      # installs the app's and the interface's dependencies
npm run dev        # builds the interface and opens the app against ./data
```

`npm run dev:ui` runs the interface alone with hot reload; point it at a running
panel (see the note in the README under Development).

## Tests

```powershell
npm test               # unit + API tests, about 10 seconds
npm run test:desktop   # real processes and windows, about 2 minutes
```

`npm test` runs on every push. `npm run test:desktop` needs an interactive Windows
desktop, so it runs on your machine. It only ever starts and stops stand-in programs
it creates itself; it won't touch real game servers.

Please add a test with a bug fix. The reasoning is in the history: several of the
project's real bugs only surfaced because a test existed to be surprised by them.
Tests boot the real API against a throwaway folder (`tests/helpers/instance.js`), so
they exercise what a user gets rather than mocks.

## Pull requests

- Keep them focused: one change, with a sentence on **why**.
- Match the surrounding code's style; comments should explain *why* something is the
  way it is, since that's what is hard to recover later.
- Run `npm test` first.
- If you use an AI assistant for your change, that's fine (this project is built
  with one), but you are responsible for understanding and testing what you submit.

## Security issues

Please don't file these publicly. See [SECURITY.md](SECURITY.md).

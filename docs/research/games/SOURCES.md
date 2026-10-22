# STAGE A: FIND SOURCES (small, mechanical job)

You find web pages. You do not write facts about the game. Do NOT install or run anything. Write only the one file named in your task.

For the game in your task, use web search and fetching to find the best pages for four topics. For each topic list up to 6 URLs, best first:
1. BASICS: how to install and run the dedicated server (Steam app id, exe name, ports, stopping).
2. CONFIG: the server's configuration files and every setting in them.
3. LAUNCH: the command-line arguments of the server program.
4. MODS: how a dedicated server loads mods.

For every URL write: the URL, what kind of source it is (OFFICIAL = the developer or publisher; WIKI = official or community wiki; REPO = source code or a README on GitHub/GitLab; COMMUNITY = a forum post, guide or hosting provider), the page title, and one line on what is on it. Open each page to check it exists and says something useful (if a page is blocked, try an archive.org copy or an r.jina.ai mirror: put the URL that worked). Prefer OFFICIAL and REPO over COMMUNITY. Include at least one page that shows the real default config file or the real argument list if one exists (a GitHub repo of a Docker image or a server manager often does).

Also note: the exact server executable name if any page states it, and the Steam app id of the dedicated server tool if any page states it. Say "not found" otherwise. Never guess.

Output format (markdown, exactly this):
```
# <Game> sources
Server exe: <name or not found> (<url>)
Server app id: <id or not found> (<url>)
## BASICS
1. <url> | <KIND> | <title> | <what it has>
## CONFIG
...
## LAUNCH
...
## MODS
...
```
Final message: two lines: number of URLs per topic, and anything you could not find.

## Vault rules (apply to every stage)
Each game lives in `docs/research/games/<slug>/` (the repo, not a scratch folder), and the vault front page is `INDEX.md`. After Stage A the lead adds the game to `INDEX.md`'s tables; the stages then add `01` to `04` ([[EXTRACT]]) and `00-overview.md` ([[OVERVIEW]]). Write file names in the numbered style so wikilinks like `[[01-basics]]` resolve.

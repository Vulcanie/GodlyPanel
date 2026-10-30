# Power Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add smaller backups, safe game updates, custom roles with command scope, multi-source mod install with player modpack sync, a file manager, server move between PCs, and UI localization, all driven by per-game data rather than per-game code.

**Architecture:** Each feature is one generic service plus a small per-game declaration (a field in the game module or template), so a new game gets the feature by filling in data, not by writing code. Mods get a source-provider layer in front of the existing adapters. Roles become data (`roles.json`) behind the existing `can()` / `requirePermission()` calls. Backups get an archive-format registry so `.zip` and `.tar.zst` coexist.

**Tech Stack:** Node/Express (`src/server`), React 19 + MUI 7 + Vite (`ui/`), Windows `tar.exe` (bsdtar), SteamCMD, `node --test` and vitest. No new runtime dependencies.

**Spec:** The user's request of 2026-10-30 (items 3, 7, 11, 15, 16, 19, 22, 24 from the ranked list, plus backup compression). Research report: this conversation. No separate spec file.

## Global Constraints

- Windows only; archives are written and read by `%SystemRoot%\System32\tar.exe`, never the Git-for-Windows tar (see `util/tarZip.js`).
- No new npm dependencies unless a task says so.
- Every new download goes through `downloadVerified` with an https-only host allowlist, a size cap, and `unsafeEntries` on every archive.
- Every new route runs behind `requirePermission(...)`; the UI hides things but the server decides (`ui/src/permissions.js` header).
- Anything that changes a stopped-server's files goes through `runOperation(...)` and `isFullyStopped`, as `routes/mods.js` does.
- Game-specific knowledge lives in the game module / template, never in a service (`if (server.type === "x")` is only allowed where it exists today, e.g. ARK in `updateService.js`).
- Existing backups (`.zip`) and existing `users.json` entries keep working unchanged.
- New UI text is written through `t()` from Phase 0 on.
- Tests: new unit tests in `tests/unit/`, API tests in `tests/api/` using `startInstance`, `makeFakeGame`; UI tests under `ui/src/__tests__/`. Real networks are never touched: use stand-in env vars (pattern: `GHP_THUNDERSTORE_API`).
- Run per task: `node --test tests/unit/<file>` or `tests/api/<file>`; run `npm test` at the end of each phase; `npm --prefix ui test` when `ui/` changed.
- Each phase lands on its own branch off `main` and ends with a green `npm test` before merge.

## Review Focus

1. A backup archive in the old `.zip` format, an old `users.json`, and old `MOD_TEMPLATES` servers must all still load and work after each phase (upgrade-in-place with no migration step run by the user).
2. A role with a command allow-list must not be escapable by newlines, `;`, leading whitespace, different case, or a second command in the same RCON string.
3. A file path containing `..`, a Windows junction/symlink, a drive-letter path, an alternate data stream (`file.txt:stream`) or a reserved name (`CON`, `NUL`) must never read or write outside the server's folders.
4. A mod/modpack/bundle archive with `../` entries, absolute entries, or an enormous expanded size (zip bomb) must be refused before anything is written.
5. A backup, update or move that runs out of disk space must fail cleanly: the original data untouched, the partial file removed, and the user told why.

---

## File Structure

| New file | Responsibility |
|---|---|
| `ui/src/i18n/index.js`, `ui/src/locales/en.json` | `t()`, plural/number/date helpers, lazy locale load, English fallback |
| `src/server/util/archiveFormats.js` | Registry of archive formats (zip, tzst, txz): extension, create args, level map |
| `src/server/services/updateSafety.js` | Pre-update backup, post-update health check, rollback record |
| `src/server/data/roleStore.js` | Custom roles (`roles.json`), built-in roles as locked entries |
| `src/server/services/commandScope.js` | One function that decides if a user may send a console command |
| `src/server/services/modSources/` (`index.js`, `workshop.js`, `thunderstore.js`, `curseforge.js`, `modrinth.js`, `github.js`, `url.js`) | One provider per place mods come from; same interface |
| `src/server/services/modLock.js` | `mods.lock.json` per server: what was installed from where, at what version, client/server side |
| `src/server/services/clientPack.js` | Builds the player-facing pack and manifest from the lock file |
| `src/server/services/fileManager.js`, `routes/files.js` | Browse, read, write, upload, trash, download, extract inside a server's folders |
| `src/server/services/serverBundle.js`, `routes/migrate.js` | Export a server to one file; import it on another PC |
| `ui/src/components/FilesPanel.jsx`, `RolesPage.jsx`, `ModSourceBox.jsx`, `MigratePanel.jsx` | UI for the above |

---

# Phase 0: Localization runtime (so later phases write `t()` from day one)

### Task 0.1: `t()` runtime with English fallback

**Files:**
- Create: `ui/src/i18n/index.js`, `ui/src/locales/en.json`, `ui/src/locales/en-XA.json` (pseudo-locale, generated)
- Create: `scripts/i18n-check.mjs`
- Modify: `ui/src/index.jsx` (provider), `ui/src/SessionContext.jsx` (read `preferences.language`)
- Test: `ui/src/__tests__/i18n.test.js`

**Interfaces:**
- Produces: `t(key: string, vars?: Record<string, string|number>): string`; `tn(key, count, vars?)` picks a plural form via `Intl.PluralRules` using keys `key.one` / `key.other`; `useT(): { t, tn, locale, setLocale }`; `formatDate(d)`, `formatNumber(n)`, `formatBytes(n)` via `Intl` with the active locale; `LANGUAGES: {code,label}[]`.
- Lookup order: active locale → `en` → the key itself (never throws, never blank).

- [ ] **Step 1: Write failing tests** in `i18n.test.js`: `t("a.b")` returns the English string; `t("hello", {name:"Ann"})` replaces `{name}`; a key missing from `es` falls back to `en`; an unknown key returns the key; `tn("files", 1)` → "1 file", `tn("files", 2)` → "2 files"; `{` unmatched in a value does not throw.
- [ ] **Step 2: Run** `npm --prefix ui test -- i18n` — expect FAIL (module missing).
- [ ] **Step 3: Implement** `ui/src/i18n/index.js`. Locale files load with dynamic `import()` so only the active one is shipped to the browser. Locale is chosen from `preferences.language`, else `navigator.language` prefix, else `en`.
- [ ] **Step 4: Implement** `scripts/i18n-check.mjs`: fails when a `t("literal")` key in `ui/src` is missing from `en.json`, or when a locale file has keys `en.json` lacks, or has a `{var}` set differing from English. Wire into `npm test` as `tests/unit/i18nKeys.test.js` calling the script's exported function.
- [ ] **Step 5: Run** both test files — expect PASS. Run the app with `en-XA` selected to confirm wrapped, expanded strings render without clipping on the shell and login page (manual check noted in the commit body).
- [ ] **Step 6: Commit** `feat(ui): t() runtime with English fallback and key check`.

### Task 0.2: Language picker and preference

**Files:** Modify `ui/src/components/AppearanceSettings.jsx`, `src/server/data/userStore.js` (allow `language` in `setPreferences`). Test: `tests/api/preferences.test.js` (extend), `ui/src/__tests__/i18n.test.js`.

**Interfaces:** Consumes `setPreferences(id, patch)`. Produces `preferences.language: string | null`.

- [ ] **Step 1:** Failing API test: PATCH preferences `{language:"es"}` persists and returns it; `{language:"../x"}` is rejected (accept only `/^[a-z]{2,3}(-[A-Z]{2})?$/` and codes in `LANGUAGES`).
- [ ] **Step 2:** Run it, expect FAIL. **Step 3:** Implement validation and the picker (a select under Appearance). **Step 4:** Run, expect PASS. **Step 5:** Commit `feat: per-user language preference`.

---

# Phase 1: Backup compression and space control

Why first: it changes the archive layer everything else (updates, moves) depends on.

### Task 1.1: Measure on real data (decision gate)

**Files:** Create `scripts/measure-compression.mjs`. No test; output is the deliverable, pasted into the commit body and `docs/plans/2026-10-30-compression-results.md`.

- [ ] **Step 1:** Script takes a server name or folder, builds the same entry list `backupSpecsFor` would, and for each of zip(deflate 6/9), zstd (levels 3, 9, 19), xz (6), 7zip, writes an archive to the scratchpad and prints a table: size, ratio, seconds, peak RSS.
- [ ] **Step 2:** Run against at least three real saves (a Minecraft world, an ARK/Unreal save, a Valheim or Palworld save).
- [ ] **Step 3:** Decide the defaults and record them. Planned default, to be confirmed by the numbers: `zstd` level 9 ("balanced"), `xz` only as "smallest", `zip` kept as "compatible". If zstd is not at least 15% smaller than zip-9 on world saves, keep zip as the default and ship zstd as opt-in.
- [ ] **Step 4:** Commit `docs: compression results on real saves`.

### Task 1.2: Archive format registry

**Files:**
- Create: `src/server/util/archiveFormats.js`
- Modify: `src/server/util/tarZip.js` (add `createArchive`, `listArchive`, `extractArchive`; keep `createZip` etc. as thin wrappers so no caller breaks)
- Test: `tests/unit/archiveFormats.test.js`

**Interfaces:**
- Produces:
  - `FORMATS = { zip: {ext:".zip", args(level)}, zstd: {ext:".tar.zst", args(level)}, xz: {ext:".tar.xz", args(level)} }`
  - `formatForFile(name: string): "zip"|"zstd"|"xz"|null`
  - `createArchive(outFile, entries, { format, level, exclude }): Promise<void>` (level: `"fast"|"balanced"|"max"`, mapped inside the registry)
  - `listArchive(file)`, `extractArchive(file, destDir, names)` — format-agnostic (bsdtar auto-detects on read); `unsafeEntries` is applied inside both.

- [ ] **Step 1: Failing tests:** round-trip each format with a small tree (nested dir, empty dir, a file with a space and a unicode name): `createArchive` → `listArchive` shows the same names → `extractArchive` restores identical bytes. `formatForFile("a.tar.zst")` is `"zstd"`; `"a.zip"` is `"zip"`; `"a.tar"` is `null`. A name starting with `-` is refused for every format. An archive containing `../evil` is refused on extract for every format.
- [ ] **Step 2:** Run `node --test tests/unit/archiveFormats.test.js` — FAIL.
- [ ] **Step 3: Implement** the registry using `--zstd` / `--xz` / `--format zip` with `--options` for levels (confirm the exact option names against the bsdtar 3.8.9 on this machine in Task 1.1's output; the unit test fails if an option is wrong).
- [ ] **Step 4:** Run — PASS. **Step 5:** Commit `feat: archive format registry (zip, zstd, xz)`.

### Task 1.3: Backups use the chosen format

**Files:**
- Modify: `src/server/services/backupService.js` (lines ~213-260 `listBackups`/`backupFile`/`deleteBackup`, ~264-295 `applyRetention`, ~312-480 `createBackup`, ~484-650 `restoreBackup`; replace every `.zip` literal and `endsWith(".zip")` with the registry), `src/server/services/backupDestinations.js` (off-site copies use the file's real extension), `src/server/data/backupTemplates.js` (no change expected)
- Modify: settings schema where `backups.keepCount` is defined (find with `grep -rn keepDays src/server`) to add `backups.format: "zip"|"zstd"|"xz"` (default from Task 1.1) and `backups.level: "fast"|"balanced"|"max"`; a per-server override alongside `keepCount`
- Test: `tests/unit/backupFormat.test.js`, extend `tests/api/backups.test.js`

**Interfaces:** Consumes `createArchive/listArchive/extractArchive`, `formatForFile`. Backup `id` stays the filename stem, so `/api/.../backups/:id` is unchanged. The embedded manifest records `format`, `level`, `bytesBefore`, `bytesAfter`.

- [ ] **Step 1: Failing tests:** (a) create with `format:"zstd"` writes `<id>.tar.zst`, verifies by read-back, lists with size and format; (b) a pre-existing `.zip` backup next to a new `.tar.zst` both list, both restore; (c) retention counts both formats together; (d) deleting removes the archive and its `.json`; (e) a copy to a drive destination keeps the extension; (f) restoring a zstd backup gives byte-identical files.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement. Keep the read-back verification step; for xz/zstd verify by listing plus an integrity pass (`tar -tf` decompresses the whole stream, which is the integrity check).
- [ ] **Step 4:** Run unit + `tests/api/backups.test.js` — PASS. **Step 5:** Commit `feat: backups in zstd/xz with zip still readable`.

### Task 1.4: Retention that thins instead of deleting (GFS) and skip-if-unchanged

**Files:** Modify `src/server/services/backupService.js` (`applyRetention`), `src/server/services/backupScheduler` equivalent (find the scheduled-backup caller with `grep -rn "kind: \"scheduled\"" src/server`). Test: extend `tests/unit/backupRetention.test.js`.

**Interfaces:** New optional settings `keepDaily` (default 7), `keepWeekly` (default 4), `keepMonthly` (default 3) used when set; `keepCount`/`keepDays` behave exactly as today when these are unset. `pickRetained(list, now, policy): Set<id>` pure function exported for tests. Manual and pre-update backups are never thinned below `keepManual` (default 5).

- [ ] **Step 1: Failing tests** on `pickRetained`: 30 daily backups → exactly 7 dailies + 4 weeklies + 3 monthlies kept, newest always kept; manual backups beyond `keepManual` are removed oldest-first; unset new settings → same result as the current function (regression table copied from the existing tests).
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** Add "skip a scheduled backup when no file in the backup paths changed since the last backup" (compare newest mtime + total size across the spec paths; stored in the manifest as `fingerprint`); a skipped run logs "no changes since last backup" in activity. Test it with a changed and an untouched fake game folder. **Step 5:** PASS, commit `feat: tiered backup retention and skip unchanged scheduled backups`.

### Task 1.5: Space visibility and a budget

**Files:** Modify `backupService.js` (`backupOverview`: add `totalBytes`, `savedBytes` from manifests), `routes` for backups (new `POST .../backups/recompress`), `ui/src/components/BackupsPanel.jsx` (format/level pickers, per-backup size and ratio, total, "Recompress older backups" button), `src/server/services/storageService.js` (`assertStorageHeadroom` already exists: call it with the *uncompressed estimate × 0.6* before a backup). Test: `tests/api/backups.test.js`, `ui/src/__tests__/BackupsPanel.test.jsx`.

**Interfaces:** `recompressBackup(server, id, {format, level}): Promise<{id, before, after}>` — writes the new archive beside the old, verifies it, then removes the old one; on any failure the old one stays and the partial is deleted. Optional per-server `backups.maxTotalBytes`: when a new backup would exceed it, the oldest non-protected backups are removed first (logged), and if still over, the backup is refused with a clear message.

- [ ] **Step 1: Failing tests:** recompress a `.zip` to `.tar.zst` (content identical, old gone, id preserved in the list); a failed verification keeps the old file; with `maxTotalBytes` set below the next size, the oldest are pruned and the newest pre-update backup is protected; a full disk (use the existing headroom stub from the helpers) refuses with the "not enough disk space" message and leaves no partial file.
- [ ] **Step 2:** FAIL. **Step 3:** Implement the service, the route (permission `server.backup`), and the panel changes (all strings via `t()`). **Step 4:** PASS (`npm test`, `npm --prefix ui test`). **Step 5:** Commit `feat: backup size overview, recompress, size budget`.

---

# Phase 2: Safe game updates (#16)

What can honestly be rolled back: saves and settings (what backups cover). Game binaries are re-downloaded; they can only be pinned back where the game has a Steam branch (`util/steamBranch.js`). The plan says so in the UI instead of promising "undo the update".

### Task 2.1: Backup before every update

**Files:** Create `src/server/services/updateSafety.js`; modify `src/server/services/updateService.js` (call it after the stop-wait at line ~84, before SteamCMD at ~107) and `src/server/services/autoUpdateService.js`. Test: `tests/api/updateSafety.test.js`, `tests/unit/updateSafety.test.js`.

**Interfaces:**
- Produces `snapshotBeforeUpdate(server): Promise<{backupId: string|null, skippedReason: string|null}>`; uses `createBackup(server, {kind:"pre-update"})` for every server in `getUpdateGroup`. Setting `updates.backupFirst` (default `true`, per-server override).
- `updateServer(...)` returns `{ ..., preUpdateBackupIds: string[] }`.
- If the backup fails the update does **not** run and nothing is restarted unless the user passes `{ proceedWithoutBackup: true }` (a confirm dialog in the UI; auto-update never proceeds without a backup and reports why).

- [ ] **Step 1: Failing tests:** an update on a fake game with `updateAppId` first produces a `pre-update` backup, then runs the (stubbed) SteamCMD; backup failure aborts before SteamCMD starts and servers that were running are restarted; a game with no backup paths records `skippedReason` and proceeds; for a shared ARK install every sibling is backed up.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat: back up before updating`.

### Task 2.2: Health check, failed-update state and rollback

**Files:** Modify `updateSafety.js`, `updateService.js`, `services/buildTracker.js` (record build id before/after), `ui/src/components/UpdatePanel*` (find with `grep -ln "updateServer\|Update" ui/src/components`), notifications (existing event list in `NotificationEvents.jsx`). Test: `tests/api/updateSafety.test.js`.

**Interfaces:**
- Produces `watchHealth(server, {timeoutMs}): Promise<"ok"|"failed">` (online status from `pollingService.serverStatus` within `updates.healthTimeoutMin`, default 10); `rollbackUpdate(server, {restart}): Promise<void>` (restores the recorded pre-update backup via `restoreBackup`, and, when `server.updateBranch` had a previous value recorded, sets it back and re-runs `app_update` for that branch). A record `{at, fromBuild, toBuild, backupId, outcome}` in `updates-history.json` per server.
- New notification event `update.failed`; new route `POST .../update/rollback` (permission `server.update`).

- [ ] **Step 1: Failing tests:** update then fake game never comes online → outcome `failed`, `update.failed` event fired, Rollback button state exposed in `GET .../update/status`; rollback restores the saved file contents and starts the server; rollback is refused while the server is running; with no previous branch the response says binaries were not rolled back.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: update health check and rollback`.

---

# Phase 3: Roles, permissions, console scope (#3, #11)

### Task 3.1: Roles as data, resolved on the server

**Files:**
- Create: `src/server/data/roleStore.js`
- Modify: `src/server/middleware/permissions.js` (`can`, `canAccessServer`, `requirePermission`), `src/server/middleware/auth.js` (`requireRole` → keeps working by mapping to built-in role ids), `src/server/data/userStore.js` (`role` may be a custom role id; add `serverRoles` map; `setRole`, `setServers`), `src/server/routes/auth.js` (the `/me` response gains `permissions: string[]` resolved for the user), `ui/src/permissions.js` (now reads `permissions` from the session; delete the duplicated `MODERATOR` set), `ui/src/SessionContext.jsx`
- Test: `tests/unit/roleStore.test.js`, `tests/api/roles.test.js`

**Interfaces:**
- `PERMISSIONS` gains `files.view`, `files.edit`, `files.delete`, `mods.manage`, `servers.migrate`, `roles.manage` (grouped in a `PERMISSION_GROUPS` map for the UI).
- Produces: `roleStore.list(): Role[]`; `create({name, permissions, commandScope})`, `update(id, patch)`, `remove(id)` (refused while users hold it); built-ins `admin`, `moderator`, `guest` are returned with `locked: true`, cannot be edited or removed; `admin` always has every permission.
- `can(user, permission, serverName?)`: checks `user.serverRoles?.[serverName] ?? user.role`. Unknown role id → no permissions (fail closed).
- `Role = { id, name, locked, permissions: string[], commandScope: CommandScope }`.

- [ ] **Step 1: Failing tests:** built-in roles produce exactly today's permission sets (table copied from the current `ROLE_PERMISSIONS`); a custom role with `["server.control"]` can start but not edit files; deleting a role held by a user is refused (409); an old `users.json` with `role:"moderator"` and no `serverRoles` resolves identically; `/me` returns resolved permissions; a deleted/unknown role id fails closed; the last admin cannot be demoted.
- [ ] **Step 2:** FAIL. **Step 3:** Implement; `roles.json` is written with the same atomic-write helper `userStore` uses. **Step 4:** PASS; run `npm test` (the whole existing permission suite must stay green). **Step 5:** Commit `feat: custom roles stored as data`.

### Task 3.2: Per-server role assignment and the roles UI

**Files:** Create `ui/src/components/RolesPage.jsx`; modify `ui/src/components/UsersPage.jsx` (role dropdown lists custom roles; per-server override editor), `ui/src/serverTabs.js` (tab gating now uses permission names only), `src/server/routes/users.js` (+ new `routes/roles.js`, permission `roles.manage`). Test: `tests/api/roles.test.js`, `ui/src/__tests__/RolesPage.test.jsx`.

- [ ] **Step 1: Failing tests:** API: create role, assign to a user for one server only, that user can start server A and gets 403 on server B; a user cannot create a role with a permission they don't hold themselves (no privilege escalation); UI: toggles grouped by `PERMISSION_GROUPS`, locked roles are read-only.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: roles page and per-server assignment`.

### Task 3.3: Command scope for the console and Discord

**Files:**
- Create: `src/server/services/commandScope.js`
- Modify: `src/server/routes/control.js` (RCON route ~121-136), `src/server/services/discordCommands.js`, game modules/template field `console: { presets: [...] }` (optional; default presets are generic), `ui/src/components/RolesPage.jsx` (scope editor), `ConsolePanel` (find with `grep -ln "console" ui/src/components`) to show which commands the user may run
- Test: `tests/unit/commandScope.test.js`, `tests/api/consoleScope.test.js`

**Interfaces:**
- `CommandScope = { mode: "all"|"allow"|"deny", patterns: string[] }` (glob on the **first token**, case-insensitive, `*` wildcard; mode `allow` = only these, `deny` = everything but these).
- `checkCommand(user, serverName, command): { ok: true } | { ok: false, reason: string }`.
- Whenever the scope is not `all`: a command containing `\n`, `\r`, `;`, `&&`, `|` or control characters is refused outright (one command per send), and the check runs on the trimmed, lower-cased first token after stripping one leading `/`.
- Built-in presets offered in the UI: "Read only" (`list`, `status`, `help`, `players`, `info`, `listplayers`, `say`), "Moderation" (read-only + `kick*`, `ban*`, `unban*`, `mute*`, `broadcast`, `say`, `tell`, `whisper`), "No destructive" (deny `stop`, `shutdown`, `quit`, `exit`, `saveandexit`, `op`, `deop`, `whitelist`, `wipe*`, `destroy*`). A game module may append game-specific names under `console.presets` (e.g. ARK `DestroyWildDinos`).
- Denied commands write an activity entry `console.denied` with user, server, first token only (no arguments, they may hold passwords).

- [ ] **Step 1: Failing tests (unit):** `allow ["list","say"]`: `list` ok, `LIST` ok, `/list` ok, `  list` ok, `listplayers` denied, `list\nstop` denied, `list; stop` denied, `say hi && stop` denied; `deny ["stop"]`: `stop` denied, `Stop` denied, `save` ok; `all` passes everything including newlines (today's behavior); empty and non-string commands are refused. API: a moderator-like custom role with a scope is blocked with 403 and the stub RCON receives nothing; the same check applies from the Discord command path.
- [ ] **Step 2:** FAIL. **Step 3:** Implement; both entry points call only `checkCommand`. **Step 4:** PASS. **Step 5:** Commit `feat: command scope per role for console and Discord`.

---

# Phase 4: Mods from anywhere (#7)

### Task 4.1: Source-provider interface and the ones that already exist

**Files:**
- Create: `src/server/services/modSources/index.js`, `workshop.js`, `thunderstore.js` (move the existing logic from `modService.js` lines ~244-430 behind the interface; behavior unchanged)
- Modify: `src/server/services/modService.js` (route installs through `resolveRef` → providers; keep every current export)
- Test: `tests/unit/modSources.test.js`; existing `tests/api/mods.test.js` must stay green untouched.

**Interfaces:**
- Produces:
  - `detectSource(input: string): { source: string, ref: string } | null` — recognizes a Workshop URL or bare numeric id, a Thunderstore URL or `Owner-Name[-Version]`, a Modrinth URL, a CurseForge URL, a GitHub repo/release URL, and any other `https://…zip|jar|dll|pak|vpk` URL.
  - Provider: `{ id, label, needs?: "apiKey", hosts: string[], resolve(ref, ctx): Promise<ResolvedMod>, latest?(ref, ctx): Promise<string>, search?(query, ctx): Promise<SearchHit[]> }`
  - `ResolvedMod = { source, ref, name, version, side: "both"|"server"|"client", files: {url, sha256?|sha1?|sha512?, size?, name}[], dependencies: {source, ref}[] }`
  - `ctx = { server, template, fetchImpl, secrets }` (`fetchImpl` is injectable for tests).
- Each provider's `hosts` feeds `isAllowedWebUrl`; no provider may fetch outside its hosts.

- [ ] **Step 1: Failing tests:** `detectSource` table (≥15 inputs including junk, `javascript:`, `http://` and an IP-literal URL → null); Workshop and Thunderstore round-trip through the new interface with the existing stand-in endpoints (`GHP_THUNDERSTORE_API`).
- [ ] **Step 2:** FAIL. **Step 3:** Refactor with no behavior change. **Step 4:** `node --test tests/unit/modSources.test.js tests/api/mods.test.js` — PASS. **Step 5:** Commit `refactor: mod source providers`.

### Task 4.2: Modrinth, CurseForge, GitHub releases, direct URL

**Files:** Create `modrinth.js`, `curseforge.js`, `github.js`, `url.js` under `modSources/`; modify `modpackService.js` to share the CurseForge client and key lookup rather than duplicating them. Test: `tests/unit/modSources.test.js` (stand-in servers per provider via env vars `GHP_MODRINTH_API`, `GHP_CURSEFORGE_API`, `GHP_GITHUB_API`).

**Interfaces / rules:**
- **Modrinth** (`api.modrinth.com/v2`, no key): resolve by slug/id; pick the newest version whose `loaders` and `game_versions` match the server's `template.mods.loader` / `gameVersion` (read from the server record); verify with the `sha512` Modrinth returns; dependencies from `dependencies[type=required]`; `search` supported.
- **CurseForge** (`api.curseforge.com/v1`): needs the API key from secrets (same one modpacks use); without it the provider reports `needs: "apiKey"` and the UI shows "Add a CurseForge key in Settings", not an error page. Files flagged as disallowing third-party download are refused with the page link shown.
- **GitHub releases** (`api.github.com`, unauthenticated, optional token from secrets): pick the asset by the template's `accepts` extensions, with a user-selectable list when several match; checksum from the release's `.sha256` asset if present, else none (the panel says "unverified" in the UI).
- **Direct URL**: https only, no redirects to other hosts, size cap, host not private/loopback/link-local (SSRF guard, reuse whatever `downloadVerified` already enforces and add the IP-literal check from the `detectSource` test). Needs `mods.manage` plus an explicit "I trust this address" tick in the UI.
- Every download: `downloadVerified` → temp dir → `unsafeEntries` + expanded-size cap on archives → move into the target.

- [ ] **Step 1: Failing tests per provider:** correct file picked by loader+version; checksum mismatch aborts and leaves nothing in the mods folder; missing key reports `needs`; required dependency is installed too and cycles terminate; a zip with `../x` or an absolute path is refused; an expanded size above the cap is refused (zip bomb fixture of ~1 KB expanding past the cap); a redirect to another host is refused; `http://` refused.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: Modrinth, CurseForge, GitHub and URL mod sources`.

### Task 4.3: Mod support declared in the game module

**Files:** Modify `src/server/data/modTemplates.js` (keep the 7 entries, now generated from a `mods` block), `src/server/data/games/index.js` (collect each module's `mods` block), `src/server/services/modService.js` (`modConfigFor`/`modSupport` read the collected map), then add blocks to game modules. Test: `tests/unit/modTemplates.test.js` (every block validates against a schema: adapter known, `sources` ⊆ registered providers, `dir.rel` relative and without `..`).

**Interfaces:** A game module may export `mods: { adapter: "folder"|"workshop"|"thunderstore"|"script-ids", dir: {base, rel}, accepts: string[], sources: string[], loader?: string, gameVersionFrom?: string, note?: string }`. Games that already have a `mods` text field for launch arguments (about 49) get `adapter: "workshop"` automatically from their existing `updateAppId`; no per-game edit needed for those.

Initial source sets by kind of game (the point is that the **same** block shape serves all):

| Kind | Examples | `sources` |
|---|---|---|
| Steam Workshop games | most Source/Unreal/Unity titles with a `mods` field | `workshop` |
| BepInEx games | Valheim, Lethal Company-style | `thunderstore`, `github`, `url` |
| Minecraft Java (vanilla/Paper/Fabric/Forge/NeoForge) | | `modrinth`, `curseforge`, `github`, `url` (plugins vs mods dir chosen by server type) |
| File-drop games | Terraria tModLoader, Project Zomboid, 7 Days to Die, Rust Oxide/uMod, Garry's Mod | `workshop` where it exists, else `github`, `url` |

- [ ] **Step 1: Failing tests:** every existing server type reports the same `modSupport` as before; a new block added in a test fixture module is picked up with no service change; invalid blocks fail the schema test.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Add the blocks for the games in the table, one commit per group. Each group's commit message lists the games and confirms (by the unit test) their folder is relative.

### Task 4.4: Lock file, update check, and the one paste box

**Files:** Create `src/server/services/modLock.js`, `ui/src/components/ModSourceBox.jsx`; modify `routes/mods.js` (new `POST .../mods/install {input}`, `GET .../mods/updates`, `POST .../mods/:id/update`), `ModsPanel.jsx`. Test: `tests/unit/modLock.test.js`, extend `tests/api/mods.test.js`.

**Interfaces:**
- `mods.lock.json` per server (beside the mods folder, included in backups): `{ mods: [{id, source, ref, version, side, files:[{path,sha256}], installedAt}] }`. `modLock.read/add/remove/diffAgainstDisk(server)` (flags files changed or deleted by hand).
- `POST .../mods/install {input}` → `detectSource` → provider → install with dependencies; always through `runOperation` and `isFullyStopped`, as the existing routes. Response lists what was installed and what was refused, each with a reason.
- `GET .../mods/updates` → for each locked mod with a provider that has `latest`, `{id, current, latest}`; updates are never applied automatically (a mod update can break a world): the button applies one, and a pre-update backup of the mods folder is taken first.
- `side` defaults from the provider (Modrinth `client_side/server_side`, Thunderstore `categories`) and can be toggled per mod.

- [ ] **Step 1: Failing tests:** paste a Modrinth URL → installed and locked; paste garbage → 400 "I don't recognise that link" with the list of accepted kinds for this game; a game whose `sources` excludes the detected provider refuses it; updates list shows only mods with a newer version; a hand-deleted file shows in `diffAgainstDisk`; removing a mod removes its lock entry and orphaned dependencies are only offered, not auto-removed.
- [ ] **Step 2–4:** FAIL, implement, PASS (`npm test`, `npm --prefix ui test`). **Step 5:** Commit `feat: one-box mod install, lock file, update check`.

---

# Phase 5: Modpack sync for players (#22)

### Task 5.1: Client pack and manifest from the lock file

**Files:** Create `src/server/services/clientPack.js`; modify `routes/mods.js` (`GET .../mods/client-pack`, `GET .../mods/manifest`), `modpackService.js` (reuse for CurseForge servers). Test: `tests/unit/clientPack.test.js`, `tests/api/mods.test.js`.

**Interfaces:**
- `buildManifest(server): Manifest` = `{ game, gameVersion, loader, generatedAt, mods: [{name, source, ref, version, side, sha256, url?}] }` — only `side !== "server"` mods.
- `buildClientPack(server, {format}): Promise<{file, name}>` where `format` is `"zip"` (manifest.json + the client-side files + a short README with where to put them, from the game's `mods.note`), `"mrpack"` (Modrinth pack format, Minecraft only, so Prism/ATLauncher import it directly and download from the sources instead of redistributing jars), or `"list"` (plain text: Workshop ids / Thunderstore refs for games where players subscribe themselves).
- Redistribution rule: files from CurseForge, and any file whose provider flags no third-party redistribution, are listed by reference only, never copied into the pack.

- [ ] **Step 1: Failing tests:** server-only mods are absent from the manifest; the zip contains exactly the client files and a manifest whose hashes match; the `.mrpack` has `modrinth.index.json` with `downloads` URLs only for Modrinth-sourced mods and `overrides/` for the rest; CurseForge mods appear as references only; a Workshop-only game gets the `list` format by default.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: client pack and manifest`.

### Task 5.2: A link players can use

**Files:** Modify `src/server/routes/community.js` (read the existing community-access auth first and follow it exactly), `ui/src/components/CommunityAccessCard.jsx` and `ModsPanel.jsx` ("Share with players" section). Test: `tests/api/community.test.js`, `ui/src/__tests__/ModsPanel.test.jsx`.

**Interfaces:** `GET <community>/pack/:serverName/manifest.json` and `/pack.<format>`; read-only, no panel login, the same rate limits as the other community routes; off unless the admin turns on "Share mod pack" for that server; the link may be revoked (rotating a per-server token stored beside the lock file).

- [ ] **Step 1: Failing tests:** off by default (404, not 403, so it does not reveal the server exists); enabled with a valid token returns the manifest; wrong/rotated token → 404; response never contains server paths, ports, RCON data or `side:"server"` mods; rate-limited like its siblings.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: shareable player mod pack link`.

---

# Phase 6: File manager (#15)

### Task 6.1: File service with the path rules in one place

**Files:** Create `src/server/services/fileManager.js`; modify `src/server/util/safePath.js` only if a root-resolution helper is missing. Test: `tests/unit/fileManager.test.js`.

**Interfaces:**
- `rootsFor(server): string[]` — the server's folder(s) from `serverLocations`/`folderOf` (install dir plus start-script and working directories), nothing else.
- `resolveInside(server, relPath): string` — throws `FileError("outside")` on `..`, absolute paths, drive letters, `:` alternate streams, reserved device names, trailing dots/spaces, and on any path component that is a reparse point (junction/symlink) — checked with `lstat` on every component.
- `list(server, rel)`, `stat`, `readText(server, rel, {maxBytes = 2 MB})` (binary detected by NUL byte → `FileError("binary")`), `writeText` (calls `writeManagedFile` for `.bak` + history), `mkdir`, `rename`, `moveToTrash` (to `<server folder>/.godlypanel-trash/<timestamp>/…`, purged after 7 days by the existing sweep job), `restoreFromTrash`, `upload(server, rel, stream, {maxBytes})`, `extractZipHere(server, rel)` (via `extractArchive`, `unsafeEntries`, expanded-size cap), `downloadStream(server, rel)` (a folder streams as an archive).
- Protected names that can be read but not changed: `.godlypanel-server.json`, `*.bak` history files, SteamCMD folders; the panel's own data directory is never inside any root.

- [ ] **Step 1: Failing tests:** each hostile path in Review Focus 3 is refused (junction fixture created in the test with `fs.symlink(..., "junction")`); write makes `.bak` and a history entry; delete goes to trash and restore brings it back byte-identical; reading a 10 MB file is refused with a size message; reading an `.exe` is refused as binary; upload over the cap leaves no partial file; zip with `../x` is refused and nothing extracted; rename onto an existing file is refused.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: file manager service`.

### Task 6.2: Routes, permissions and panel

**Files:** Create `src/server/routes/files.js` (mounted under the server routes in `panelRoutes.js`), `ui/src/components/FilesPanel.jsx`; modify `ui/src/serverTabs.js` (Files tab, `files.view`), `BatchFileEditor.jsx` (reused as the text editor: no new dependency). Test: `tests/api/files.test.js`, `ui/src/__tests__/FilesPanel.test.jsx`.

**Interfaces:** `GET /files?path=`, `GET /files/content?path=`, `PUT /files/content`, `POST /files/upload` (multer, limit from settings, default 200 MB), `POST /files/mkdir|rename|delete|restore|extract`, `GET /files/download?path=`. View = `files.view`; write/upload/mkdir/rename/extract = `files.edit`; delete/restore = `files.delete`. All mutations append an activity entry (user, server, relative path). While the server is running, edits are allowed but the UI warns "changes apply on next restart"; deleting or renaming a running server's executable is refused with `isFullyStopped`.

- [ ] **Step 1: Failing tests:** guest gets 403; a custom role with only `files.view` can list and read but not write (Phase 3 dependency); path traversal over HTTP returns 400 with no file touched; upload then download returns identical bytes; delete shows up in activity; UI renders breadcrumbs, shows size/modified, drag-drop upload calls the endpoint, and delete asks for confirmation.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: file manager routes and panel`.

---

# Phase 7: Move a server to another PC (#19)

### Task 7.1: Export to a bundle

**Files:** Create `src/server/services/serverBundle.js`, `src/server/routes/migrate.js`. Test: `tests/unit/serverBundle.test.js`, `tests/api/migrate.test.js`.

**Interfaces:**
- `exportServer(server, { include: "saves"|"all", secrets: boolean }): Promise<{file, bytes}>` writes a `.gpserver` archive (zstd by default through `createArchive`) containing `bundle.json` `{ version: 1, panelVersion, game, server: <record with machine paths replaced by tokens like {{serverRoot}}>, ports, schedules, mod lock, backupsIncluded }` plus files.
  - `"saves"`: the backup-spec paths + config files + mods + lock file; the game itself is re-downloaded on import (any server with `updateAppId`). Typically a fraction of the size.
  - `"all"`: the whole server folder (for games without Steam updates, e.g. web-downloaded ones).
  - `secrets: false` (default) removes RCON/admin passwords and API keys from the record; the UI says so and offers a tick to include them with a warning that the bundle is not encrypted.
- Export runs only on a fully stopped server (`runOperation`), checks `assertStorageHeadroom`, streams progress through the existing operations channel.

- [ ] **Step 1: Failing tests:** `bundle.json` contains no absolute path of the source machine, no password with `secrets:false`; `saves` export of a fake Steam-style game omits the game binaries; running server → 409; low disk → clean failure, no partial file.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: export a server bundle`.

### Task 7.2: Import on the new machine

**Files:** Modify `serverBundle.js` (`planImport`, `importServer`), `routes/migrate.js`, reuse `cloneService.planClone`/`rewriteStrings` for ports and path rewrites, `updateService` for re-downloading the game; create `ui/src/components/MigratePanel.jsx` (export on the server page, import from the Create Server page and Settings). Test: `tests/api/migrate.test.js`, `ui/src/__tests__/MigratePanel.test.jsx`.

**Interfaces:**
- `planImport(file): { game, name, nameTaken, portConflicts, needsGameDownload, bytes, warnings[] }` — read-only preview from `bundle.json` only (the archive is listed, never extracted, until the user confirms); `importServer(file, { name, ports, folder }): Promise<{server}>` extracts to a new empty folder, rebases tokens, registers the server, and, if `needsGameDownload`, starts the normal install/update path. Import sources: upload through the browser, or a path on disk / external drive (large worlds).
- Refuses: bundle `version` newer than supported, unknown game id (message names the game and says to update the panel), entries failing `unsafeEntries`, expanded size over the cap or over free disk space, name collisions without a new name.
- Update `docs/FAQ.md` "moving to another PC" to describe export/import.

- [ ] **Step 1: Failing tests:** round-trip: export a fake game with a save and a mod, import under a new name on a fresh instance → save bytes identical, ports free-checked, mod lock present; port conflict is proposed a free port; a hostile bundle (`../x`, huge expansion, newer version, unknown game) is refused and leaves no folder behind; secrets absent unless included.
- [ ] **Step 2–4:** FAIL, implement, PASS. **Step 5:** Commit `feat: import a server bundle`.

---

# Phase 8: Localization sweep (#24)

Per-phase UI from 1–7 is already `t()`. This phase converts the existing chrome and adds languages.

### Task 8.1: Convert existing UI chrome in waves

**Files:** Modify existing components in waves, one commit each: (1) shell, nav, login/setup, toasts; (2) dashboard, server tabs, status labels; (3) backups, updates, schedules, logs; (4) users, settings, community, Discord; (5) create-server flow. **Not converted (explicitly out of scope):** game catalogs, config field descriptions and help guides in `ui/src/catalog`, `ui/src/help` (English-only, ~30k lines), and server-side error strings except those that already carry a `code` (the UI maps `code` → `t("errors.<code>")`, falling back to the server's English text).
Test: `tests/unit/i18nKeys.test.js` (from Task 0.1) must pass each wave; `ui/src/__tests__` snapshots for converted components keep passing in English.

- [ ] **Step 1 (per wave):** Extract literals to `en.json` with namespaced keys (`nav.*`, `backups.*`), replace with `t()`/`tn()`, dates and sizes via the helpers. **Step 2:** `npm --prefix ui test` PASS; render under `en-XA` to find clipped layouts and fix them. **Step 3:** Commit `i18n: convert <wave>`.

### Task 8.2: First extra languages

**Files:** Create `ui/src/locales/es.json`, `ui/src/locales/de.json` (drafted, marked `"_meta": {"reviewed": false}` and labelled "(beta)" in the picker); `docs/TRANSLATING.md` (how to add a language: copy `en.json`, run `node scripts/i18n-check.mjs`, submit). Test: `i18nKeys.test.js` verifies no missing/extra keys and identical `{var}` sets.

- [ ] **Step 1:** Fail the key test for a deliberately incomplete `es.json`; **Step 2:** complete it; **Step 3:** PASS; manual check of the three busiest pages in each language. **Step 4:** Commit `i18n: Spanish and German (beta)`.

---

## Self-Review

- **Spec coverage:** #3 → Tasks 3.1-3.2; #7 → 4.1-4.4 (sources: Workshop, Thunderstore, CurseForge, Modrinth, GitHub, URL, upload via the existing path); #11 → 3.3; #15 → 6.1-6.2; #16 → 2.1-2.2; #19 → 7.1-7.2; #22 → 5.1-5.2; #24 → 0.1-0.2, 8.1-8.2; backup compression → 1.1-1.5. "Generic": every feature is driven by a per-game data block (4.3), the existing backup specs (1.3, 2.x, 7.x) or the game's server folder (6.x).
- **Dependencies:** Phase 3 before 6 (file permissions) and 4 (`mods.manage`); Phase 1 before 2 and 7 (archive layer); Phase 0 before everything with UI. Phases 4-5, 6 and 7 are independent of each other once 3 is done and can be reordered.
- **Type consistency:** `createArchive/listArchive/extractArchive` (1.2) used in 1.3, 6.1, 7.1; `checkCommand` (3.3) is the only gate; `ResolvedMod`/`detectSource` (4.1) used in 4.2-4.4; `modLock` (4.4) feeds `buildManifest` (5.1) and `bundle.json` (7.1).
- **Known judgment calls:** zstd vs zip default waits on Task 1.1's numbers; rollback restores data, not game binaries, except where a Steam branch exists; translations beyond English are machine-drafted betas; server error text stays English except coded errors.
- **Not included:** incremental/deduplicating backups (needs a different storage model), panel-to-panel direct transfer, encrypted bundles, RTL layouts, translating the game catalogs.

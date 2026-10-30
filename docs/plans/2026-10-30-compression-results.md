# Compression sanity results (Task 1.1)

Produced by `scripts/measure-compression.mjs` on this machine (bsdtar 3.8.9, libarchive 3.8.9, Windows tar.exe).

**These are not game saves.** There are no real game saves on this machine, so these numbers only show that the script works and roughly how the formats compare on two kinds of input. They are not a basis for choosing a default format.

## Working bsdtar option strings

These were checked on this machine. Task 1.2 depends on them.

| Format | Arguments (after `-c -f <out>`) | Verified |
| --- | --- | --- |
| zip, deflate level N | `--format zip --options zip:compression-level=N` | N = 0, 6, 9 (level 0 gives a larger file, so the level is applied) |
| zstd level N | `--zstd --options zstd:compression-level=N` | N = 3, 9, 19 (no `zstd:threads` needed; level 19 runs) |
| xz level N | `--xz --options xz:compression-level=N` | N = 6 |
| 7zip | `--format 7zip` | default settings only |

Things that did NOT work or were not used:

- `--options zip:bogus=9` is rejected by bsdtar with `Undefined option: \`zip:bogus'`, exit 1. A typo in an option name therefore fails loudly instead of silently doing nothing.
- `--options compression-level=9` with no module prefix (zip) was accepted with exit 0 in a probe. It was not checked that it changes the output, so do not use it.
- `--options 7zip:compression=deflate` was accepted with exit 0 in a probe. It is not used by the script.
- Zip levels 6 and 9 gave identical output on a text-only sample (38,986 bytes each), but differed on the src/server run. The level is applied; the identical result is specific to that input.
- Peak RSS of the tar child is not reported. Node cannot read it cheaply on Windows, so the column is omitted rather than estimated.

## Real run 1: `src/server`

Command: `node scripts/measure-compression.mjs src/server`

```
Folder: C:\GodlyPanel\src\server
Raw size: 1684196 bytes

variant       | bytes  | ratio | seconds | note
--------------+--------+-------+---------+-----
7zip          | 342726 | 20%   | 0.36    |
xz level 6    | 345020 | 20%   | 0.38    |
zstd level 19 | 348109 | 21%   | 0.66    |
zstd level 9  | 384185 | 23%   | 0.07    |
zstd level 3  | 441307 | 26%   | 0.04    |
zip level 9   | 694035 | 41%   | 0.10    |
zip level 6   | 694284 | 41%   | 2.02    |
```

## Real run 2: generated mixed folder (about 18.7 MB)

The folder was generated in the OS temp dir at `C:\Users\vulca\AppData\Local\Temp\godly-mixed-20mb`. It holds about 6 MB of random bytes (`random.bin`), about 6 MB of repeated log text (`text\log.txt`), and about 6 MB of an already-compressed zip (`packed.zip`, made from random bytes). The raw total is 18,693,018 bytes, a bit under the 20 MB in the brief.

Command: `node scripts/measure-compression.mjs <temp>\godly-mixed-20mb`

```
Folder: C:\Users\vulca\AppData\Local\Temp\godly-mixed-20mb
Raw size: 18693018 bytes

variant       | bytes    | ratio | seconds | note
--------------+----------+-------+---------+-----
zstd level 19 | 12586445 | 67%   | 1.69    |
zstd level 9  | 12588228 | 67%   | 0.05    |
zstd level 3  | 12588369 | 67%   | 0.04    |
xz level 6    | 12589192 | 67%   | 3.28    |
zip level 6   | 12628484 | 68%   | 0.28    |
zip level 9   | 12628484 | 68%   | 0.28    |
7zip          | 12757035 | 68%   | 3.26    |
```

The random and already-compressed parts cannot shrink, which is why every format lands near 67%.

## Decision

Default stays zip; zstd/xz opt-in until measured on real saves. Run `node scripts/measure-compression.mjs <server save folder>` to compare.

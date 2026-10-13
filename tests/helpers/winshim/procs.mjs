import fs from "node:fs";
import path from "node:path";

// Reads the running programs from /proc, in the shape Windows tools report them.
// Only for the Linux stand-ins of those tools (see README in winEmulation.js); on
// Windows nothing here is used.
//
// A program's "image name" on Windows is its file name. On Linux the stand-in games
// are symlinks to node under a game-like name (fakegame.exe), and /proc/<pid>/exe
// resolves the link, so the name has to come from argv[0] instead: that is the path
// the program was started by, link name and all.

const unquote = (text) => text.replace(/^"+|"+$/g, "");

export function listProcesses() {
	const out = [];
	for (const entry of fs.readdirSync("/proc")) {
		if (!/^\d+$/.test(entry)) continue;
		const pid = Number(entry);
		try {
			const argv = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0");
			if (argv.at(-1) === "") argv.pop();
			if (argv.length === 0) continue; // a kernel thread
			const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
			const afterName = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
			if (afterName[0] === "Z") continue; // a zombie is dead as far as Windows is concerned
			const ppid = Number(afterName[1]);
			const argv0 = unquote(argv[0]);
			let exe;
			if (argv0.includes("/")) {
				let cwd = "/";
				try {
					cwd = fs.readlinkSync(`/proc/${pid}/cwd`);
				} catch {}
				exe = path.resolve(cwd, argv0);
			} else {
				try {
					exe = fs.readlinkSync(`/proc/${pid}/exe`);
				} catch {
					exe = null;
				}
			}
			let rssPages = 0;
			try {
				rssPages = Number(fs.readFileSync(`/proc/${pid}/statm`, "utf8").split(" ")[1]) || 0;
			} catch {}
			out.push({
				pid,
				ppid,
				name: path.basename(argv0),
				exe,
				commandLine: [argv[0], ...argv.slice(1).map((a) => (/[\s"]/.test(a) ? `"${a}"` : a))].join(" "),
				ramBytes: rssPages * 4096,
			});
		} catch {
			// It exited while being read.
		}
	}
	return out;
}

/** The ids of every process running from a file under `folder`, whatever it is called. */
export function pidsUnder(folder) {
	const root = path.resolve(folder).replace(/\/+$/, "") + "/";
	return listProcesses()
		.filter((p) => p.exe && p.exe.startsWith(root))
		.map((p) => p.pid);
}

/** `pid` and everything below it, children first. */
export function treeOf(pid, all = listProcesses()) {
	const kids = all.filter((p) => p.ppid === pid).flatMap((p) => treeOf(p.pid, all));
	return [...kids, pid];
}

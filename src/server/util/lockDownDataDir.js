import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

// The data folder holds the password hashes, the key that signs sessions, the Discord and cloud-storage
// secrets, the tunnel token and every server's RCON password. A folder made under C:\ inherits permissions that
// let every account on the PC read it and any signed-in account change it, so another Windows user (or a
// program running as one) could read those secrets or add themselves an administrator account.
//
// This limits the folder to the account that runs the panel, SYSTEM and the Administrators group. Well-known
// SIDs are used rather than names, so it works on any Windows language. Anything inside the folder inherits
// it, including files the panel creates later. It is safe to run on every start: it changes nothing when the
// permissions are already right.

const SYSTEM = "S-1-5-18";
const ADMINISTRATORS = "S-1-5-32-544";
const MARKER = "state/folder-locked.json";

// Windows' own programs by full path: a PATH that lists Git's Unix tools first would otherwise run those instead.
const system32 = path.join(process.env.SystemRoot || "C:/Windows", "System32");

const run = (file, args) =>
	new Promise((resolve, reject) => {
		execFile(path.join(system32, file), args, { windowsHide: true, timeout: 120_000 }, (error, stdout, stderr) => (error ? reject(new Error((stderr || error.message).trim())) : resolve(String(stdout))));
	});

/** The account running this process, as a SID. */
export async function currentUserSid() {
	const out = await run("whoami.exe", ["/user", "/fo", "csv", "/nh"]);
	const sid = /"(S-1-[0-9-]+)"/.exec(out)?.[1];
	if (!sid) throw new Error("couldn't tell which Windows account this is");
	return sid;
}

/** The icacls arguments that make `dir` private to these accounts. Exposed for testing. */
export function lockArguments(dir, sid) {
	return [dir, "/inheritance:r", "/grant:r", `*${SYSTEM}:(OI)(CI)F`, `*${ADMINISTRATORS}:(OI)(CI)F`, `*${sid}:(OI)(CI)F`, "/C", "/Q"];
}

/**
 * Restrict the data folder. Never throws: a panel that can't change permissions (a network drive, a
 * non-Windows system) still works, and the reason is returned for the log.
 * @returns {Promise<{ locked: boolean, skipped?: string, error?: string }>}
 */
export async function lockDownDataDir(dir) {
	if (process.platform !== "win32") return { locked: false, skipped: "not Windows" };
	try {
		const sid = await currentUserSid();
		const markerFile = path.join(dir, MARKER);
		const marker = JSON.parse(await fs.readFile(markerFile, "utf8").catch(() => "null"));
		// Already done for this account. (A copied folder gets the permissions of where it was copied to, so the
		// marker travelling with it doesn't matter: the account check below decides.)
		if (marker?.sid === sid) return { locked: true, skipped: "already done" };

		await run("icacls.exe", lockArguments(dir, sid));
		// Still able to use it? If not, say so now rather than failing mysteriously later.
		await fs.readdir(dir);
		await fs.mkdir(path.dirname(markerFile), { recursive: true });
		await fs.writeFile(markerFile, JSON.stringify({ sid, at: new Date().toISOString() }));
		return { locked: true };
	} catch (err) {
		return { locked: false, error: err.message };
	}
}

// Fails when the dependencies the app ships have a known high or critical vulnerability, except those listed in
// .github/audit-allowlist.json. Each exception names the advisory, says why it doesn't apply here, and expires, so it has to be
// looked at again rather than forgotten. A new advisory, or an expired exception, fails the check.
//
//   node scripts/audit-prod.mjs            (needs the network: npm asks the registry about the lock file)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RANK = { info: 0, low: 1, moderate: 2, medium: 2, high: 3, critical: 4 };
const FAIL_AT = RANK.high;

/** Every advisory in an `npm audit --json` report that is serious enough to fail on: { id, package, severity, title }. */
export function seriousAdvisories(report) {
	const found = new Map();
	for (const [name, vulnerability] of Object.entries(report?.vulnerabilities ?? {})) {
		for (const via of vulnerability.via ?? []) {
			if (typeof via !== "object" || (RANK[via.severity] ?? 0) < FAIL_AT) continue;
			const id = /GHSA-[\w-]+/.exec(via.url ?? "")?.[0] ?? String(via.source ?? via.title);
			found.set(id, { id, package: via.name ?? name, severity: via.severity, title: via.title });
		}
	}
	return [...found.values()];
}

/**
 * Compare the advisories with the allow-list.
 * @returns {{ failures: string[], notes: string[] }}
 */
export function evaluate(report, allowlist, now = new Date()) {
	const failures = [];
	const notes = [];
	const advisories = seriousAdvisories(report);
	const allowed = new Map(allowlist.map((a) => [a.id, a]));

	for (const advisory of advisories) {
		const exception = allowed.get(advisory.id);
		if (!exception) {
			failures.push(`${advisory.severity.toUpperCase()}: ${advisory.package}: ${advisory.title} (${advisory.id}) is not on the allow-list.`);
		} else if (!exception.reason || !exception.expires || Number.isNaN(Date.parse(exception.expires))) {
			failures.push(`${advisory.id} is on the allow-list without a reason and an expiry date.`);
		} else if (Date.parse(exception.expires) < now.getTime()) {
			failures.push(`The exception for ${advisory.id} (${advisory.package}) expired on ${exception.expires}: check whether it still applies, or whether a fix exists now.`);
		} else {
			notes.push(`Allowed until ${exception.expires}: ${advisory.package} ${advisory.id}: ${exception.reason}`);
		}
	}
	for (const exception of allowlist) {
		if (!advisories.some((a) => a.id === exception.id)) notes.push(`${exception.id} is on the allow-list but no longer reported; it can be removed.`);
	}
	return { failures, notes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const allowlist = JSON.parse(fs.readFileSync(path.join(root, ".github", "audit-allowlist.json"), "utf8"));
	let output;
	try {
		output = execFileSync("npm", ["audit", "--package-lock-only", "--omit=dev", "--json"], { cwd: root, encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
	} catch (error) {
		// npm audit exits non-zero when it finds anything; the report is still on stdout.
		output = error.stdout;
		if (!output) {
			console.error(`npm audit gave no report: ${error.message}`);
			process.exit(2);
		}
	}
	const { failures, notes } = evaluate(JSON.parse(output), allowlist);
	for (const note of notes) console.log(note);
	for (const failure of failures) console.error(failure);
	console.log(failures.length === 0 ? "No unexcused high or critical vulnerability in what the app ships." : `${failures.length} problem(s).`);
	process.exit(failures.length === 0 ? 0 : 1);
}

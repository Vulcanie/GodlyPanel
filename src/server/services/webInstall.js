import { execFile } from "node:child_process";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { downloadVerified } from "../util/downloadVerified.js";
import { listZip, extractZip, unsafeEntries } from "../util/tarZip.js";

// Installing a game server from its maker's own website instead of through SteamCMD or a GitHub release (a template's `webInstall`, see
// the top of data/gameTemplates.js). Minecraft's server jar (Mojang) and Terraria's server zip (terraria.org) need this.
//
// Nothing here runs unless the person creating the server has said yes to it (acceptWebDownload, asked for by the create form). The
// rules, none of which a template can relax:
//   - the template names the hosts the file may come from (and be redirected to), exact names, https only;
//   - what to fetch is worked out by the template's `resolve()` (for Mojang it reads their version manifest), and the address it gives
//     back has to be on those hosts, with a size inside the cap;
//   - if the maker publishes a checksum (Mojang: SHA-1) the download has to match it or it is deleted. If the maker publishes none
//     (terraria.org), the download is installed anyway after the person agreed, and the SHA-256 it computed is shown and logged so it
//     can be compared by hand;
//   - a zip is unpacked into the server's folder only after every name in it has been checked: nothing may land outside that folder.
//
// A template can also name `extras`: files the server needs that its own download lacks (Terraria's Windows server needs Microsoft's XNA
// Framework 4.0 DLLs). An extra is held to more than the main download, because nothing about it is looked up: the template fixes the
// exact address, size and SHA-256, the file has to carry a valid signature from the named company, and an .msi is only ever UNPACKED
// (msiexec /a, an administrative image in the scratch folder). Nothing is installed on the PC; only the files the template names are
// copied, into a folder inside the server's own.

const HOST_NAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
const FILE_NAME = /^[A-Za-z0-9_.+-][A-Za-z0-9 _.+-]*$/;
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
/** Largest file the panel will fetch for a template that does not set its own cap. */
export const DEFAULT_MAX_BYTES = 1024 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 20 * 60_000;
const EXTRA_MAX_BYTES = 100 * 1024 * 1024;
const MSI_TIMEOUT_MS = 3 * 60_000;

/**
 * Stand-ins for the network and the unpacker, for tests. Set a property to replace it for every install; an install can also be
 * handed its own (they win). Nothing in the app's settings can reach this.
 * @type {{ fetchImpl?: typeof fetch, archive?: { list: Function, extract: Function }, msi?: { signature: Function, unpack: Function }, scratchDir?: string }}
 */
export const webDeps = {};

const realArchive = { list: listZip, extract: extractZip };

const realMsi = {
	/** The signature status and the signer's subject of a file, by Windows' own check. Anything it cannot tell is "Unknown". */
	signature(file) {
		return new Promise((resolve) => {
			execFile(
				"powershell",
				["-NoProfile", "-NonInteractive", "-Command", '$s = Get-AuthenticodeSignature -LiteralPath $env:GP_FILE; "$($s.Status)|$($s.SignerCertificate.Subject)"'],
				{ windowsHide: true, timeout: 30_000, env: { ...process.env, GP_FILE: file } },
				(error, stdout) => {
					if (error) return resolve({ status: "Unknown", subject: "" });
					const [status, ...rest] = String(stdout).trim().split("|");
					resolve({ status, subject: rest.join("|") });
				},
			);
		});
	},
	/** Unpack an .msi into a folder without installing it (an administrative image). */
	unpack(file, dir) {
		return new Promise((resolve, reject) => {
			execFile("msiexec", ["/a", `"${file}"`, "/qn", `TARGETDIR="${dir}"`], { windowsHide: true, timeout: MSI_TIMEOUT_MS, windowsVerbatimArguments: true }, (error) =>
				error ? reject(new Error(`Windows could not unpack the installer file (${error.code ?? error.message}).`)) : resolve(),
			);
		});
	},
};

/** A reason the install is refused, as opposed to a network problem. Tells a caller the download itself is the trouble. */
export class WebInstallRefused extends Error {
	constructor(message) {
		super(message);
		this.name = "WebInstallRefused";
		this.refusal = true;
	}
}

/** True for an https address on one of `hosts` (exact names, standard port, no credentials). */
export function isAllowedWebUrl(url, hosts) {
	try {
		const u = new URL(url);
		return u.protocol === "https:" && !u.username && !u.password && (u.port === "" || u.port === "443") && Array.isArray(hosts) && hosts.includes(u.hostname.toLowerCase());
	} catch {
		return false;
	}
}

/** The template's `webInstall`, checked. Throws on a malformed one (a mistake in the template). */
export function checkWebSpec(spec) {
	if (!spec || typeof spec !== "object") throw new Error("This template has no webInstall.");
	if (typeof spec.resolve !== "function") throw new Error("webInstall.resolve must be a function.");
	if (!Array.isArray(spec.hosts) || spec.hosts.length === 0 || !spec.hosts.every((h) => typeof h === "string" && HOST_NAME.test(h.toLowerCase()))) {
		throw new Error("webInstall.hosts must list the host names a download may come from.");
	}
	if (spec.kind !== "file" && spec.kind !== "zip") throw new Error(`webInstall.kind must be "file" or "zip", not "${spec.kind}".`);
	if (spec.kind === "file" && (!FILE_NAME.test(String(spec.fileName ?? "")) || spec.fileName.includes(".."))) {
		throw new Error(`webInstall.fileName must be a plain file name, not "${spec.fileName}".`);
	}
	const extras = (spec.extras ?? []).map(checkExtra);
	return {
		label: String(spec.label ?? "the download"),
		hosts: spec.hosts.map((h) => h.toLowerCase()),
		kind: spec.kind,
		fileName: spec.kind === "file" ? spec.fileName : null,
		maxBytes: Number.isSafeInteger(spec.maxBytes) && spec.maxBytes > 0 ? spec.maxBytes : DEFAULT_MAX_BYTES,
		expect: Array.isArray(spec.expect) ? spec.expect.map(String) : [],
		extras,
		resolve: spec.resolve,
	};
}

const mb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
export { mb as describeWebSize };

/** One of a template's `extras`, checked. Throws on a malformed one (a mistake in the template). */
function checkExtra(e) {
	if (!e || typeof e !== "object") throw new Error("A webInstall extra must be an object.");
	const where = `webInstall.extras "${e.label}"`;
	if (e.kind !== "msi") throw new Error(`${where}: kind must be "msi".`);
	if (!Array.isArray(e.hosts) || e.hosts.length === 0 || !e.hosts.every((h) => typeof h === "string" && HOST_NAME.test(h.toLowerCase()))) throw new Error(`${where}: hosts must list the host names.`);
	const hosts = e.hosts.map((h) => h.toLowerCase());
	if (!isAllowedWebUrl(e.url, hosts)) throw new Error(`${where}: url must be https on one of its hosts.`);
	if (!SHA256.test(String(e.sha256 ?? ""))) throw new Error(`${where}: sha256 must be pinned (64 lower-case hex digits).`);
	if (!Number.isSafeInteger(e.bytes) || e.bytes <= 0 || e.bytes > EXTRA_MAX_BYTES) throw new Error(`${where}: bytes must be the pinned size, at most ${mb(EXTRA_MAX_BYTES)}.`);
	if (typeof e.signer !== "string" || !e.signer.trim()) throw new Error(`${where}: signer must name who signed the file.`);
	if (!(e.pick instanceof RegExp)) throw new Error(`${where}: pick must be a regular expression for the file names to copy.`);
	const into = String(e.into ?? "");
	if (path.isAbsolute(into) || /^[a-zA-Z]:/.test(into) || into.split(/[\\/]/).includes("..")) throw new Error(`${where}: into must be a folder inside the server's folder.`);
	return {
		label: String(e.label ?? "an extra file"),
		why: String(e.why ?? ""),
		kind: "msi",
		hosts,
		url: e.url,
		bytes: e.bytes,
		sha256: e.sha256,
		signer: e.signer.trim(),
		pick: e.pick,
		expect: Array.isArray(e.expect) ? e.expect.map(String) : [],
		into,
	};
}

/** What a person is asked to agree to for a template's extras: what, from which host, how big, signed by whom. Pinned, so no network. */
export function describeWebExtras(rawSpec) {
	return checkWebSpec(rawSpec).extras.map((e) => ({ label: e.label, why: e.why, host: new URL(e.url).hostname, size: e.bytes, sizeText: mb(e.bytes), signer: e.signer }));
}

/**
 * What the template says to fetch, and whether the panel may.
 * @returns {Promise<{ url: string, host: string, size: number, version: string, sha1: string|null, sha256: string|null, javaMajor: number|null }>}
 * @throws {WebInstallRefused} for an address off the list, a size over the cap, or a checksum that isn't one
 */
export async function resolveWebDownload(rawSpec, options = {}) {
	const spec = checkWebSpec(rawSpec);
	const { fetchImpl = webDeps.fetchImpl ?? fetch } = options;
	const found = await spec.resolve({ fetchImpl });
	if (!found || typeof found !== "object") throw new Error(`${spec.label} could not be looked up.`);
	if (!isAllowedWebUrl(found.url, spec.hosts)) {
		throw new WebInstallRefused(`${spec.label} is offered at an address that is not on the list this template trusts (${String(found.url).slice(0, 80)}), so it was not downloaded.`);
	}
	if (!Number.isSafeInteger(found.bytes) || found.bytes <= 0) throw new WebInstallRefused(`No usable size was given for ${spec.label}, so it was not downloaded.`);
	if (found.bytes > spec.maxBytes) {
		throw new WebInstallRefused(`${spec.label} is ${mb(found.bytes)}, more than the ${mb(spec.maxBytes)} the panel allows for this download, so it was not downloaded.`);
	}
	if (found.sha1 != null && !SHA1.test(found.sha1)) throw new WebInstallRefused(`The SHA-1 given for ${spec.label} is not one, so it was not downloaded.`);
	if (found.sha256 != null && !SHA256.test(found.sha256)) throw new WebInstallRefused(`The SHA-256 given for ${spec.label} is not one, so it was not downloaded.`);
	return {
		url: found.url,
		host: new URL(found.url).hostname.toLowerCase(),
		size: found.bytes,
		version: String(found.version ?? ""),
		sha1: found.sha1 ?? null,
		sha256: found.sha256 ?? null,
		javaMajor: Number.isInteger(found.javaMajor) ? found.javaMajor : null,
	};
}

async function findLinks(dir) {
	for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isSymbolicLink()) return full;
		if (entry.isDirectory()) {
			const found = await findLinks(full);
			if (found) return found;
		}
	}
	return null;
}

const exists = (file) => fsp.access(file).then(() => true, () => false);

async function walkFiles(dir, out = []) {
	for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isSymbolicLink()) throw new WebInstallRefused(`The installer file contained a link (${entry.name}), so it was not used.`);
		if (entry.isDirectory()) await walkFiles(full, out);
		else out.push(full);
	}
	return out;
}

/** Fetch one extra, check it, unpack it in the scratch folder and copy only the picked files beside the server. */
async function installExtra(extra, installDir, { log, fetchImpl, msi, scratchDir }) {
	log(`Fetching ${extra.label}${extra.why ? ` (${extra.why})` : ""} from ${new URL(extra.url).hostname} ...`);
	const dir = path.join(scratchDir, "extra");
	await fsp.mkdir(dir, { recursive: true });
	const file = path.join(dir, "extra.msi");
	const result = await downloadVerified({
		url: extra.url,
		dest: file,
		sha256: extra.sha256,
		size: extra.bytes,
		isTrusted: (u) => isAllowedWebUrl(u, extra.hosts),
		checksumSource: "checksum fixed in the panel",
		timeoutMs: DOWNLOAD_TIMEOUT_MS,
		fetchImpl,
	});
	log(`${extra.label} matches the checksum fixed in the panel (SHA-256 ${result.sha256}).`);
	const sig = await msi.signature(file);
	if (sig.status !== "Valid" || !new RegExp(`(^|, )O=${extra.signer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,|$)`).test(sig.subject)) {
		throw new WebInstallRefused(`${extra.label} does not carry a valid signature from ${extra.signer} (Windows says ${sig.status}), so it was not used.`);
	}
	log(`The signature is valid and belongs to ${extra.signer}.`);
	const unpacked = path.join(dir, "files");
	await fsp.mkdir(unpacked, { recursive: true });
	await msi.unpack(file, unpacked);
	const picked = (await walkFiles(unpacked)).filter((f) => extra.pick.test(path.basename(f)));
	const names = new Set(picked.map((f) => path.basename(f).toLowerCase()));
	for (const want of extra.expect) {
		if (!names.has(want.toLowerCase())) throw new WebInstallRefused(`${extra.label} did not contain ${want}, so nothing was copied.`);
	}
	if (picked.length === 0) throw new WebInstallRefused(`${extra.label} did not contain the files that were expected, so nothing was copied.`);
	const target = path.join(installDir, ...extra.into.split(/[\\/]/).filter(Boolean));
	await fsp.mkdir(target, { recursive: true });
	for (const f of picked) await fsp.copyFile(f, path.join(target, path.basename(f)));
	log(`Copied ${picked.length} files from ${extra.label} next to the server. Nothing was installed on this PC.`);
}

/**
 * Download the template's file and put it in `installDir` (a single file under `fileName`, or a zip unpacked there).
 * @param {object} rawSpec  the template's webInstall
 * @param {string} installDir
 * @param {object} [options]
 * @param {(msg: string) => void} [options.log]
 * @param {(stage: "downloading"|"installing") => void} [options.onStage]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {{ list: (file: string) => Promise<string[]>, extract: (file: string, dir: string) => Promise<void> }} [options.archive]
 * @param {{ signature: (file: string) => Promise<{ status: string, subject: string }>, unpack: (file: string, dir: string) => Promise<void> }} [options.msi]
 * @param {string} [options.scratchDir]  where the download is kept while it is checked (removed afterwards)
 * @returns {Promise<{ version: string, size: number, sha256: string, checksumPublished: boolean }>}
 */
export async function installWebDownload(rawSpec, installDir, options = {}) {
	const spec = checkWebSpec(rawSpec);
	const { log = () => {}, onStage = () => {}, fetchImpl = webDeps.fetchImpl ?? fetch, archive = webDeps.archive ?? realArchive, msi = webDeps.msi ?? realMsi } = options;
	const scratchDir = options.scratchDir ?? webDeps.scratchDir ?? path.join(installDir, ".godlypanel-download");

	log(`Looking up ${spec.label} ...`);
	const found = await resolveWebDownload(spec, { fetchImpl });
	const published = found.sha1 ? "SHA-1" : found.sha256 ? "SHA-256" : null;
	log(`Found ${found.version || spec.label}: ${mb(found.size)} from ${found.host}. ${published ? `The maker publishes a ${published} for it.` : "The maker publishes no checksum for it, so the panel will show the one it computes."}`);

	await fsp.mkdir(installDir, { recursive: true });
	await fsp.mkdir(scratchDir, { recursive: true });
	const downloaded = path.join(scratchDir, spec.kind === "zip" ? "download.zip" : "download.bin");
	try {
		onStage("downloading");
		log(`Downloading ${found.url} (https, ${spec.hosts.join(", ")} only) ...`);
		let nextMark = 10;
		const result = await downloadVerified({
			url: found.url,
			dest: downloaded,
			sha256: found.sha256,
			sha1: found.sha1,
			size: found.size,
			isTrusted: (u) => isAllowedWebUrl(u, spec.hosts),
			checksumSource: `${spec.label} listing`,
			timeoutMs: DOWNLOAD_TIMEOUT_MS,
			fetchImpl,
			onProgress: (received) => {
				const percent = Math.floor((received / found.size) * 100);
				if (percent >= nextMark) {
					log(`  ${Math.min(percent, 100)}% (${mb(received)} of ${mb(found.size)})`);
					nextMark = Math.floor(percent / 10) * 10 + 10;
				}
			},
		});
		log(published ? `Download finished and matches the ${published} the maker publishes. SHA-256: ${result.sha256}` : `Download finished. No checksum is published to compare with; its SHA-256 is ${result.sha256}`);

		onStage("installing");
		if (spec.kind === "file") {
			await fsp.rename(downloaded, path.join(installDir, spec.fileName));
			log(`Installed ${spec.fileName}.`);
		} else {
			log("Checking the names inside the archive ...");
			const names = await archive.list(downloaded);
			if (names.length === 0) throw new WebInstallRefused("The download is an empty archive, so nothing was installed.");
			const unsafe = unsafeEntries(names);
			if (unsafe.length > 0) {
				throw new WebInstallRefused(`The download holds a path outside its own folder (${unsafe[0].slice(0, 80)}), so nothing was unpacked.`);
			}
			log(`Unpacking ${names.length} entries into ${installDir} ...`);
			await archive.extract(downloaded, installDir);
			const link = await findLinks(installDir);
			if (link) throw new WebInstallRefused(`The download contained a link (${path.basename(link)}), which a server download never should, so the install was stopped.`);
		}
		for (const extra of spec.extras) {
			await installExtra(extra, installDir, { log, fetchImpl, msi, scratchDir });
		}
		for (const file of spec.expect) {
			if (!(await exists(path.join(installDir, ...file.split(/[\\/]/))))) {
				throw new WebInstallRefused(`${spec.label} did not contain ${file}, so this is not the server that was expected.`);
			}
		}
		log(`Installed ${found.version || spec.label}.`);
		return { version: found.version, size: result.bytes, sha256: result.sha256, checksumPublished: Boolean(published) };
	} finally {
		await fsp.rm(scratchDir, { recursive: true, force: true }).catch(() => {});
	}
}

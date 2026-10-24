import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Download a file to `dest`, hashing it as it arrives, and keep it only if it is what it should be. The file is
 * written to `dest.partial` and renamed into place at the end, so `dest` is never half a download; any failure
 * deletes the partial file.
 *
 * @param {object} options
 * @param {string} options.url
 * @param {string} options.dest
 * @param {string|null} [options.sha256]       the checksum it must have (lower-case hex); not checked when null
 * @param {string|null} [options.sha1]         a SHA-1 it must have (lower-case hex), for the makers that publish only that (Mojang); not checked when null
 * @param {number|null} [options.size]         the size it must have; also stops a download that runs far past it
 * @param {(url: string) => boolean} [options.isTrusted]  asked about the address and again about where a redirect ended up
 * @param {string} [options.checksumSource]    where the checksum came from, for the error message
 * @param {(received: number) => void} [options.onProgress]
 * @param {number} [options.timeoutMs]  longest the whole download may take (a stalled connection would otherwise wait for ever)
 * @param {typeof fetch} [options.fetchImpl]  stands in for the global fetch (tests)
 * @returns {Promise<{ sha256: string, bytes: number }>}
 */
export async function downloadVerified({ url, dest, sha256 = null, sha1 = null, size = null, isTrusted = null, checksumSource = "release notes", onProgress = null, timeoutMs = 30 * 60_000, fetchImpl = fetch }) {
	const partial = `${dest}.partial`;
	await fsp.mkdir(path.dirname(dest), { recursive: true });
	try {
		const res = await fetchImpl(url, { headers: { "User-Agent": "GodlyPanel" }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
		if (!res.ok || !res.body) throw new Error(`The download answered ${res.status}.`);
		if (isTrusted && !isTrusted(res.url || url)) throw new Error("The download was redirected somewhere the panel doesn't trust.");
		const hash = crypto.createHash("sha256");
		const hash1 = sha1 ? crypto.createHash("sha1") : null;
		const limit = size ? size + 1024 * 1024 : Infinity;
		let received = 0;
		const counter = async function* (source) {
			for await (const chunk of source) {
				received += chunk.length;
				if (received > limit) throw new Error("The download is larger than it should be, so it was stopped.");
				hash.update(chunk);
				hash1?.update(chunk);
				onProgress?.(received);
				yield chunk;
			}
		};
		await pipeline(Readable.fromWeb(res.body), counter, fs.createWriteStream(partial));
		if (size && received !== size) throw new Error(`The download is ${received} bytes but should be ${size}, so it was deleted.`);
		const digest = hash.digest("hex");
		if (sha256 && digest !== sha256) {
			throw new Error(`The download doesn't match the checksum in the ${checksumSource} (got ${digest.slice(0, 12)}…, expected ${sha256.slice(0, 12)}…), so it was deleted.`);
		}
		if (hash1) {
			const digest1 = hash1.digest("hex");
			if (digest1 !== sha1) {
				throw new Error(`The download doesn't match the checksum in the ${checksumSource} (got ${digest1.slice(0, 12)}…, expected ${sha1.slice(0, 12)}…), so it was deleted.`);
			}
		}
		await fsp.rename(partial, dest);
		return { sha256: digest, bytes: received };
	} catch (err) {
		await fsp.rm(partial, { force: true }).catch(() => {});
		throw err;
	}
}

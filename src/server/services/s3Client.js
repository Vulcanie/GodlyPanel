import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// A small S3 client: enough to keep backups in any S3-compatible storage (Amazon S3,
// Backblaze B2, Wasabi, MinIO, Cloudflare R2...). No library: signing (AWS Signature
// Version 4) and the handful of calls needed are written out here, which keeps the
// download small and the behaviour visible.
//
// Calls: put (with multipart for large files), get to a file, list, delete, and a
// connection test. Every request signs its real payload hash, so it also works over
// plain HTTP to a local server.

const PART_BYTES = 16 * 1024 * 1024;
const SINGLE_PUT_LIMIT = 16 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10 * 60_000;

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();

// RFC 3986 encoding, as S3 wants it: everything except unreserved characters.
const encode = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const encodePath = (p) => p.split("/").map(encode).join("/");

export class S3Error extends Error {
	constructor(message, status = 0, code = null) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

const xmlValue = (xml, tag) => new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1] ?? null;
const xmlAll = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1]);
const unescapeXml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/**
 * @param {{ endpoint: string, region?: string, bucket: string, accessKeyId: string, secretAccessKey: string, pathStyle?: boolean }} config
 *   `endpoint` is the service address, e.g. https://s3.us-west-000.backblazeb2.com
 */
export function createS3Client(config) {
	const { accessKeyId, secretAccessKey, bucket } = config;
	const region = config.region || "us-east-1";
	const base = new URL(config.endpoint);
	const pathStyle = config.pathStyle !== false;

	const target = (key, query = {}) => {
		const host = pathStyle ? base.host : `${bucket}.${base.host}`;
		const pathname = pathStyle ? `/${encode(bucket)}${key ? `/${encodePath(key)}` : ""}` : `/${key ? encodePath(key) : ""}`;
		const qs = Object.keys(query)
			.sort()
			.map((k) => `${encode(k)}=${encode(String(query[k]))}`)
			.join("&");
		return { host, pathname: pathname || "/", qs, url: `${base.protocol}//${host}${pathname || "/"}${qs ? `?${qs}` : ""}` };
	};

	function sign(method, t, payloadHash, extraHeaders = {}) {
		const now = new Date();
		const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
		const day = amzDate.slice(0, 8);
		const headers = { host: t.host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, ...extraHeaders };
		const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
		const canonicalHeaders = names.map((h) => `${h}:${String(Object.entries(headers).find(([k]) => k.toLowerCase() === h)[1]).trim()}\n`).join("");
		const signedHeaders = names.join(";");
		const canonical = [method, t.pathname, t.qs, canonicalHeaders, signedHeaders, payloadHash].join("\n");
		const scope = `${day}/${region}/s3/aws4_request`;
		const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
		const kDate = hmac(`AWS4${secretAccessKey}`, day);
		const signature = crypto.createHmac("sha256", hmac(hmac(hmac(kDate, region), "s3"), "aws4_request")).update(toSign).digest("hex");
		return { ...headers, Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` };
	}

	async function request(method, key, { query = {}, body = null, headers = {} } = {}) {
		const t = target(key, query);
		const payload = body === null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(body);
		const signed = sign(method, t, sha256(payload), headers);
		let res;
		try {
			res = await fetch(t.url, { method, headers: signed, body: body === null ? undefined : payload, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
		} catch (err) {
			throw new S3Error(`Couldn't reach ${base.host}: ${err.cause?.code ?? err.message}`);
		}
		return res;
	}

	async function check(res, what) {
		if (res.ok) return res;
		const text = await res.text().catch(() => "");
		const code = xmlValue(text, "Code");
		const message = xmlValue(text, "Message");
		const hint =
			code === "SignatureDoesNotMatch" || code === "InvalidAccessKeyId"
				? " Check the access key and secret."
				: code === "NoSuchBucket"
					? " Check the bucket name."
					: res.status === 403
						? " The key may not be allowed to do this."
						: "";
		throw new S3Error(`${what} failed (${res.status}${code ? ` ${code}` : ""}${message ? `: ${unescapeXml(message)}` : ""}).${hint}`, res.status, code);
	}

	return {
		/** Can these credentials see the bucket? Returns nothing; throws an S3Error that says what is wrong. */
		async test() {
			await check(await request("GET", "", { query: { "list-type": 2, "max-keys": 1 } }), "Listing the bucket");
		},

		/** Upload a file; large ones in parts. Never leaves a half-written object: a failed multipart upload is aborted. */
		async putFile(key, file) {
			const { size } = await fsp.stat(file);
			if (size <= SINGLE_PUT_LIMIT) {
				await check(await request("PUT", key, { body: await fsp.readFile(file), headers: { "content-type": "application/octet-stream" } }), `Uploading ${key}`);
				return { size, parts: 1 };
			}
			const init = await check(await request("POST", key, { query: { uploads: "" }, headers: { "content-type": "application/octet-stream" } }), `Starting the upload of ${key}`);
			const uploadId = xmlValue(await init.text(), "UploadId");
			if (!uploadId) throw new S3Error("The storage didn't start a multipart upload.");
			const etags = [];
			try {
				const fd = await fsp.open(file, "r");
				try {
					for (let number = 1, offset = 0; offset < size; number += 1, offset += PART_BYTES) {
						const length = Math.min(PART_BYTES, size - offset);
						const buffer = Buffer.alloc(length);
						await fd.read(buffer, 0, length, offset);
						const res = await check(await request("PUT", key, { query: { partNumber: number, uploadId }, body: buffer }), `Uploading part ${number} of ${key}`);
						etags.push({ number, etag: res.headers.get("etag") });
					}
				} finally {
					await fd.close();
				}
				const xml = `<CompleteMultipartUpload>${etags.map((p) => `<Part><PartNumber>${p.number}</PartNumber><ETag>${p.etag}</ETag></Part>`).join("")}</CompleteMultipartUpload>`;
				await check(await request("POST", key, { query: { uploadId }, body: xml, headers: { "content-type": "application/xml" } }), `Finishing the upload of ${key}`);
				return { size, parts: etags.length };
			} catch (err) {
				await request("DELETE", key, { query: { uploadId } }).catch(() => {});
				throw err;
			}
		},

		/** Download an object to a file. */
		async getFile(key, dest) {
			const t = target(key);
			const res = await check(
				await fetch(t.url, { method: "GET", headers: sign("GET", t, sha256("")), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch((err) => {
					throw new S3Error(`Couldn't reach ${base.host}: ${err.cause?.code ?? err.message}`);
				}),
				`Downloading ${key}`,
			);
			await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
		},

		async getText(key) {
			return (await check(await request("GET", key), `Reading ${key}`)).text();
		},

		/** Every object under a prefix: [{ key, size, modified }]. */
		async list(prefix = "") {
			const out = [];
			let token = null;
			do {
				const res = await check(await request("GET", "", { query: { "list-type": 2, prefix, ...(token ? { "continuation-token": token } : {}) } }), "Listing the bucket");
				const xml = await res.text();
				for (const block of xmlAll(xml, "Contents")) {
					out.push({ key: unescapeXml(xmlValue(block, "Key")), size: Number(xmlValue(block, "Size")), modified: xmlValue(block, "LastModified") });
				}
				token = xmlValue(xml, "IsTruncated") === "true" ? unescapeXml(xmlValue(xml, "NextContinuationToken") ?? "") || null : null;
			} while (token);
			return out;
		},

		async remove(key) {
			const res = await request("DELETE", key);
			if (res.status !== 404) await check(res, `Deleting ${key}`);
		},
	};
}

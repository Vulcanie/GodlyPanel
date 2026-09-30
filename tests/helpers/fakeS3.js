import crypto from "node:crypto";
import http from "node:http";

// A small S3-compatible server for tests. Unlike most stand-ins it checks the request
// signature (AWS Signature Version 4) and the payload hash the way the real thing does,
// so a client that signs wrongly fails here too. Objects live in memory.
//
//   const s3 = await startFakeS3({ bucket: "b", accessKeyId: "k", secretAccessKey: "s" });
//   s3.objects   Map of key -> Buffer
//   s3.requests  log of "METHOD path?query"
//   s3.failNext(n)  answer the next n writes with a 500

const sha256 = (d) => crypto.createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
const encode = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function startFakeS3({ bucket, accessKeyId, secretAccessKey, region = "us-east-1" }) {
	const objects = new Map();
	const uploads = new Map();
	const requests = [];
	let failures = 0;

	function verify(req, url, body) {
		const auth = req.headers.authorization ?? "";
		const m = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]+)$/.exec(auth);
		if (!m) return { code: "AccessDenied", message: "Missing or malformed Authorization header." };
		const [, key, day, scopeRegion, signedHeaders, signature] = m;
		if (key !== accessKeyId) return { code: "InvalidAccessKeyId", message: "The access key is unknown." };
		const payloadHash = req.headers["x-amz-content-sha256"];
		if (payloadHash !== sha256(body)) return { code: "XAmzContentSHA256Mismatch", message: "The payload hash doesn't match the body." };
		const names = signedHeaders.split(";");
		const canonicalHeaders = names.map((h) => `${h}:${String(req.headers[h] ?? "").trim()}\n`).join("");
		const qs = [...url.searchParams.entries()].map(([k, v]) => [encode(k), encode(v)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("&");
		const canonical = [req.method, url.pathname, qs, canonicalHeaders, signedHeaders, payloadHash].join("\n");
		const toSign = ["AWS4-HMAC-SHA256", req.headers["x-amz-date"], `${day}/${scopeRegion}/s3/aws4_request`, sha256(canonical)].join("\n");
		const kSigning = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), scopeRegion), "s3"), "aws4_request");
		const expected = crypto.createHmac("sha256", kSigning).update(toSign).digest("hex");
		if (expected !== signature) return { code: "SignatureDoesNotMatch", message: "The request signature we calculated does not match the signature you provided." };
		return null;
	}

	const server = http.createServer((req, res) => {
		const chunks = [];
		req.on("data", (c) => chunks.push(c));
		req.on("end", () => {
			const body = Buffer.concat(chunks);
			const url = new URL(req.url, "http://localhost");
			requests.push(`${req.method} ${url.pathname}${url.search}`);
			const send = (status, text = "", headers = {}) => {
				res.writeHead(status, { "content-type": "application/xml", ...headers });
				res.end(text);
			};
			const error = (status, code, message) => send(status, `<?xml version="1.0"?><Error><Code>${code}</Code><Message>${esc(message)}</Message></Error>`);

			const bad = verify(req, url, body);
			if (bad) return error(403, bad.code, bad.message);
			const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
			// Virtual-host style: the bucket is the first part of the host name, not of the path.
			if (String(req.headers.host).startsWith(`${bucket}.`)) parts.unshift(bucket);
			if (parts[0] !== bucket) return error(404, "NoSuchBucket", "The specified bucket does not exist");
			const key = parts.slice(1).join("/");

			if (!key && req.method === "GET") {
				const prefix = url.searchParams.get("prefix") ?? "";
				const keys = [...objects.keys()].filter((k) => k.startsWith(prefix)).sort();
				const page = Math.min(Number(url.searchParams.get("max-keys") ?? 1000), 2); // small pages so paging gets exercised
				const after = url.searchParams.get("continuation-token");
				const start = after ? keys.findIndex((k) => k > after) : 0;
				const slice = start < 0 ? [] : keys.slice(start, start + page);
				const more = start >= 0 && start + slice.length < keys.length;
				const contents = slice.map((k) => `<Contents><Key>${esc(k)}</Key><LastModified>${new Date().toISOString()}</LastModified><Size>${objects.get(k).length}</Size></Contents>`).join("");
				return send(200, `<?xml version="1.0"?><ListBucketResult><IsTruncated>${more}</IsTruncated>${more ? `<NextContinuationToken>${esc(slice.at(-1))}</NextContinuationToken>` : ""}${contents}</ListBucketResult>`);
			}

			const isWrite = req.method === "PUT" || req.method === "POST" || req.method === "DELETE";
			if (isWrite && failures > 0) {
				failures -= 1;
				return error(500, "InternalError", "We encountered an internal error. Please try again.");
			}

			if (req.method === "POST" && url.searchParams.has("uploads")) {
				const id = crypto.randomBytes(6).toString("hex");
				uploads.set(id, { key, parts: new Map() });
				return send(200, `<?xml version="1.0"?><InitiateMultipartUploadResult><UploadId>${id}</UploadId></InitiateMultipartUploadResult>`);
			}
			if (req.method === "PUT" && url.searchParams.has("uploadId")) {
				const up = uploads.get(url.searchParams.get("uploadId"));
				if (!up) return error(404, "NoSuchUpload", "No such upload");
				up.parts.set(Number(url.searchParams.get("partNumber")), body);
				return send(200, "", { etag: `"${sha256(body).slice(0, 32)}"` });
			}
			if (req.method === "POST" && url.searchParams.has("uploadId")) {
				const id = url.searchParams.get("uploadId");
				const up = uploads.get(id);
				if (!up) return error(404, "NoSuchUpload", "No such upload");
				const numbers = [...body.toString().matchAll(/<PartNumber>(\d+)<\/PartNumber>/g)].map((x) => Number(x[1]));
				objects.set(up.key, Buffer.concat(numbers.map((n) => up.parts.get(n))));
				uploads.delete(id);
				return send(200, `<?xml version="1.0"?><CompleteMultipartUploadResult><Key>${esc(up.key)}</Key></CompleteMultipartUploadResult>`);
			}
			if (req.method === "DELETE" && url.searchParams.has("uploadId")) {
				uploads.delete(url.searchParams.get("uploadId"));
				return send(204);
			}
			if (req.method === "PUT") {
				objects.set(key, body);
				return send(200, "", { etag: `"${sha256(body).slice(0, 32)}"` });
			}
			if (req.method === "GET") {
				if (!objects.has(key)) return error(404, "NoSuchKey", "The specified key does not exist.");
				return send(200, objects.get(key), { "content-type": "application/octet-stream" });
			}
			if (req.method === "DELETE") {
				objects.delete(key);
				return send(204);
			}
			error(405, "MethodNotAllowed", "Not supported here");
		});
	});

	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	return {
		endpoint: `http://127.0.0.1:${server.address().port}`,
		bucket,
		region,
		objects,
		uploads,
		requests,
		failNext: (n = 1) => {
			failures = n;
		},
		stop: () => new Promise((resolve) => server.close(resolve)),
	};
}

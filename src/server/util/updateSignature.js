import crypto from "node:crypto";

// Ed25519 signatures on a release's update manifest. The manifest lists the SHA-256 of each download, so a signature on it vouches
// for the downloads too. The private key is held by whoever publishes releases (a secret of the release workflow); the public key
// is built into the app (src/shared/updateKey.js). A release that is edited on GitHub afterwards, or put there by someone who only
// has access to the releases, can't carry a signature that verifies.
//
// What is signed is a fixed label followed by the manifest's exact bytes, so a signature made for some other purpose with the same
// key can't be passed off as one for a manifest.

export const SIGNATURE_ASSET = "update-manifest.json.sig";
const LABEL = "GodlyPanel update manifest v1\n";
const message = (manifestText) => Buffer.concat([Buffer.from(LABEL, "utf8"), Buffer.isBuffer(manifestText) ? manifestText : Buffer.from(String(manifestText), "utf8")]);

/** A new key pair: the private key as PEM (keep it secret) and the public key as base64 SPKI (build it into the app). */
export function generateSigningKey() {
	const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
	return {
		privatePem: privateKey.export({ type: "pkcs8", format: "pem" }),
		publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
	};
}

/** The public key (base64 SPKI) that goes with a private key in PEM. */
export const publicKeyOf = (privatePem) => crypto.createPublicKey(crypto.createPrivateKey(privatePem)).export({ type: "spki", format: "der" }).toString("base64");

/** The signature, as base64, for a manifest. */
export const signManifest = (manifestText, privatePem) => crypto.sign(null, message(manifestText), crypto.createPrivateKey(privatePem)).toString("base64");

/**
 * Is `signature` (base64) a valid signature of this manifest by any of these public keys (base64 SPKI)? Never throws: anything
 * malformed is simply not valid.
 */
export function verifyManifest(manifestText, signature, publicKeys) {
	try {
		const sig = Buffer.from(String(signature).trim(), "base64");
		if (sig.length !== 64) return false;
		const data = message(manifestText);
		return publicKeys.some((key) => {
			try {
				return crypto.verify(null, data, crypto.createPublicKey({ key: Buffer.from(key, "base64"), format: "der", type: "spki" }), sig);
			} catch {
				return false;
			}
		});
	} catch {
		return false;
	}
}

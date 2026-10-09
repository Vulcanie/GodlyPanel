// The public keys an update must be signed by (base64 SPKI). Releases are signed by the matching private key, which is a secret of
// the release workflow (UPDATE_SIGNING_KEY) and is never in this repository. More than one key is accepted so that a new key can be
// introduced in one release and the old one retired in a later one. See docs/UPDATING.md and scripts/make-update-key.mjs.
//
// Empty means "don't check signatures", which is only right for a copy that nobody publishes releases for.
export const UPDATE_PUBLIC_KEYS = ["MCowBQYDK2VwAyEAYpxpDVYQlvoIHsDXRKOMULc6kQ7+ZQr83WYTsHzisFY="];

/**
 * The keys in force. GHP_UPDATE_PUBLIC_KEY replaces them: for a fork that signs with its own key, and for tests.
 * @param {Record<string, string|undefined>} [env]
 */
export function trustedUpdateKeys(env = process.env) {
	return env.GHP_UPDATE_PUBLIC_KEY ? [env.GHP_UPDATE_PUBLIC_KEY] : UPDATE_PUBLIC_KEYS;
}

/**
 * Must an update be signed to be installed by the app? Yes whenever there is a key to check it against. The one exception is a test
 * that points the updater at its own stand-in server (GHP_UPDATE_API) and says it doesn't care (GHP_UPDATE_UNSIGNED_OK=1).
 */
export function signatureRequired(env = process.env) {
	if (env.GHP_UPDATE_UNSIGNED_OK === "1" && env.GHP_UPDATE_API) return false;
	return trustedUpdateKeys(env).length > 0;
}

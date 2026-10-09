// Makes the key pair that signs releases. Run once, by whoever publishes them:
//
//   node scripts/make-update-key.mjs [where-to-save-the-private-key]
//
// The private key goes to a file (default: .godlypanel-keys/update-signing-key.pem in your home folder) and is never printed. Put its
// contents in the repository secret UPDATE_SIGNING_KEY, keep a copy somewhere safe and private, and delete anything else holding it.
// The public key is printed: paste it into src/shared/updateKey.js. If the private key is lost, installed copies will refuse every
// update signed by a new one until they are reinstalled by hand, so back it up.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateSigningKey } from "../src/server/util/updateSignature.js";

const target = path.resolve(process.argv[2] ?? path.join(os.homedir(), ".godlypanel-keys", "update-signing-key.pem"));
if (fs.existsSync(target)) {
	console.error(`${target} already exists; not overwriting a signing key. Choose another path or move it first.`);
	process.exit(1);
}
const { privatePem, publicKey } = generateSigningKey();
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, privatePem, { flag: "wx", mode: 0o600 });
console.log(`Private key saved to ${target}`);
console.log("  - add its contents as the repository secret UPDATE_SIGNING_KEY (Settings -> Secrets and variables -> Actions)");
console.log("  - keep a private backup of the file; do not commit it or paste it anywhere else\n");
console.log("Public key (put it in UPDATE_PUBLIC_KEYS in src/shared/updateKey.js):");
console.log(publicKey);

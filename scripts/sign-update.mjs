// Signs dist/update-manifest.json, writing dist/update-manifest.json.sig. Run by the release workflow after release-manifest.mjs, and
// by hand for a release made on this PC:
//
//   UPDATE_SIGNING_KEY="<pem>" node scripts/sign-update.mjs [dist-folder]
//   node scripts/sign-update.mjs [dist-folder] --key path/to/update-signing-key.pem
//
// It refuses to continue unless the key it was given matches a public key built into the app: a release signed with any other key
// would be refused by every installed copy.
import fs from "node:fs";
import path from "node:path";
import { signManifest, publicKeyOf, verifyManifest } from "../src/server/util/updateSignature.js";
import { trustedUpdateKeys } from "../src/shared/updateKey.js";

const args = process.argv.slice(2);
const keyAt = args.indexOf("--key");
const keyFile = keyAt >= 0 ? args.splice(keyAt, 2)[1] : null;
const dist = path.resolve(args[0] ?? "dist");

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

let pem = keyFile ? fs.readFileSync(keyFile, "utf8") : (process.env.UPDATE_SIGNING_KEY ?? "");
// A secret pasted into a settings page often has its line breaks turned into the two characters \n.
if (!pem.includes("\n")) pem = pem.replaceAll("\\n", "\n");
if (!pem.trim()) fail("No signing key. Set UPDATE_SIGNING_KEY (the repository secret) or pass --key <file>. See scripts/make-update-key.mjs.");

const manifestFile = path.join(dist, "update-manifest.json");
if (!fs.existsSync(manifestFile)) fail(`No ${manifestFile}. Run scripts/release-manifest.mjs first.`);
const keys = trustedUpdateKeys();
if (keys.length === 0) fail("No public key is built into the app yet (src/shared/updateKey.js), so there is nothing to check this signature against.");
if (!keys.includes(publicKeyOf(pem))) fail("This signing key doesn't match any public key built into the app, so installed copies would refuse the update.");

const manifest = fs.readFileSync(manifestFile);
const signature = signManifest(manifest, pem);
if (!verifyManifest(manifest, signature, keys)) fail("The signature did not verify against the app's public key; not writing it.");
fs.writeFileSync(path.join(dist, "update-manifest.json.sig"), `${signature}\n`);
console.log(`Signed ${path.basename(manifestFile)} (${manifest.length} bytes).`);

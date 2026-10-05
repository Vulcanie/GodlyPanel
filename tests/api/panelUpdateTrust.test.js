import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";
import { sleep } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Which addresses the panel will download an update from, tested against GitHub's real host names.
//
// panelUpdate.test.js points the panel at a stand-in server with an environment variable, and that variable also switches the
// trust rule off (a test has to be able to use a local address), so it can't check the rule itself. Here fetch() is mocked
// in-process with undici's MockAgent: the panel talks to https://api.github.com and https://github.com exactly as it does in
// production, nothing reaches the network (disableNetConnect), and the trust rule is the real one.

const REPO = "Vulcanie/GodlyPanel";
const zip = crypto.randomBytes(64_000);
const sha = crypto.createHash("sha256").update(zip).digest("hex");
const NAME = "GodlyPanel-9.9.9-win.zip";

describe("where an update may be downloaded from", () => {
	let panel;
	let api;
	let agent;
	let original;

	const releases = (assetUrl) => [
		{
			tag_name: "v9.9.9",
			name: "GodlyPanel 9.9.9",
			prerelease: false,
			published_at: "2026-10-05T00:00:00Z",
			body: `SHA-256 of ${NAME}: ${sha}`,
			assets: [{ name: NAME, size: zip.length, browser_download_url: assetUrl }],
		},
	];

	// Offer a release whose zip is at `assetUrl`, and have the panel look.
	async function offer(assetUrl) {
		agent.get("https://api.github.com").intercept({ path: `/repos/${REPO}/releases?per_page=15`, method: "GET" }).reply(200, releases(assetUrl), { headers: { "content-type": "application/json" } });
		const status = (await api.post("/api/updates/panel/check", {})).json;
		assert.equal(status.available, true, JSON.stringify(status));
	}

	// Press download and wait for how it ends.
	async function download() {
		const started = await api.post("/api/updates/panel/download", {});
		if (started.status !== 202) return { refusedUpFront: started };
		for (let i = 0; i < 100; i += 1) {
			const dl = (await api.get("/api/updates/panel")).json.download;
			if (dl && dl.status !== "downloading") return { dl };
			await sleep(50);
		}
		throw new Error("The download never finished.");
	}

	before(async () => {
		original = getGlobalDispatcher();
		agent = new MockAgent();
		agent.disableNetConnect();
		setGlobalDispatcher(agent);
		panel = await startInProcess({ config: { updates: { check: false, includePrereleases: true, repo: REPO } }, env: { GHP_APP_VERSION: "0.1.0" } });
		api = panel.api;
	});
	after(async () => {
		setGlobalDispatcher(original);
		await agent.close();
		await panel.stop();
	});

	it("downloads from GitHub, following GitHub's own redirect to its download host, and checks the checksum", async () => {
		const url = `https://github.com/${REPO}/releases/download/v9.9.9/${NAME}`;
		await offer(url);
		agent.get("https://github.com").intercept({ path: `/${REPO}/releases/download/v9.9.9/${NAME}` }).reply(302, "", { headers: { location: "https://objects.githubusercontent.com/abc/file.zip" } });
		agent.get("https://objects.githubusercontent.com").intercept({ path: "/abc/file.zip" }).reply(200, zip);
		const { dl } = await download();
		assert.equal(dl.status, "done", JSON.stringify(dl));
		assert.equal(dl.verified, true);
		assert.equal(dl.sha256, sha);
	});

	it("refuses a download that GitHub redirects somewhere it doesn't own", async () => {
		const url = `https://github.com/${REPO}/releases/download/v9.9.9/${NAME}`;
		await offer(url);
		agent.get("https://github.com").intercept({ path: `/${REPO}/releases/download/v9.9.9/${NAME}` }).reply(302, "", { headers: { location: "https://evil.example.com/file.zip" } });
		// Even if the stranger answers with exactly the right bytes.
		agent.get("https://evil.example.com").intercept({ path: "/file.zip" }).reply(200, zip);
		const { dl } = await download();
		assert.equal(dl.status, "failed");
		assert.match(dl.error, /redirected somewhere the panel doesn't trust/);
	});

	it("refuses a release whose file is listed at an address that isn't GitHub's", async () => {
		await offer(`https://evil.example.com/${NAME}`);
		const { refusedUpFront } = await download();
		assert.equal(refusedUpFront.status, 400);
		assert.match(refusedUpFront.json.error, /isn't from a place the panel trusts/);
	});

	it("refuses a plain-HTTP address, even on GitHub's own name", async () => {
		await offer(`http://github.com/${REPO}/releases/download/v9.9.9/${NAME}`);
		const { refusedUpFront } = await download();
		assert.equal(refusedUpFront.status, 400);
		assert.match(refusedUpFront.json.error, /isn't from a place the panel trusts/);
	});

	it("refuses a look-alike name that merely ends the way a GitHub one does", async () => {
		for (const host of ["notgithub.com", "github.com.evil.example", "evilobjects.githubusercontent.com.example"]) {
			await offer(`https://${host}/${NAME}`);
			const { refusedUpFront } = await download();
			assert.equal(refusedUpFront.status, 400, host);
		}
	});

	it("never touched the real network", () => {
		agent.assertNoPendingInterceptors();
	});
});

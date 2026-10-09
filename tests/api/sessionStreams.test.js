import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startInstance, ADMIN } from "../helpers/instance.js";

// Ending a sign-in also ends its live-update stream: a browser that was signed out must not keep being told what the servers do.

describe("a signed-out browser's live stream", () => {
	let panel;

	before(async () => {
		panel = await startInstance({});
	});
	after(() => panel.stop());

	it("is closed when its sign-in is ended from another", async () => {
		const login = async () => (await fetch(`${panel.base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ADMIN) })).headers.get("set-cookie").split(";")[0];
		const phone = await login();
		const laptop = await login();

		const stream = await fetch(`${panel.base}/api/events`, { headers: { Cookie: phone } });
		assert.equal(stream.status, 200);
		const reader = stream.body.getReader();
		assert.match(new TextDecoder().decode((await reader.read()).value), /connected/);

		// Ends the phone's sign-in (and the one made when the account was set up): everything but the laptop's.
		await fetch(`${panel.base}/api/auth/sessions/revoke-others`, { method: "POST", headers: { Cookie: laptop, "Content-Type": "application/json" }, body: "{}" });

		const ended = await Promise.race([
			(async () => {
				for (;;) {
					const { done } = await reader.read();
					if (done) return true;
				}
			})(),
			new Promise((r) => setTimeout(() => r(false), 10_000)),
		]);
		assert.equal(ended, true, "the stream was closed by the panel");
	});
});

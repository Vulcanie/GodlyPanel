import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTunnelConfig, readTunnelLine, communityConfigText, validHostname } from "../../src/server/services/cloudflared.js";
import { hostAllowed } from "../../src/server/services/communityListener.js";

describe("reading a tunnel's settings file", () => {
	it("finds the name, credentials and addresses of a tunnel made by hand", () => {
		const text = ["tunnel: godlyheroes", "credentials-file: C:\\Users\\me\\.cloudflared\\godlyheroes.json", "", "ingress:", "  - hostname: api.example.com", "    service: http://localhost:3001", "  - hostname: \"second.example.com\"", "    service: http://localhost:3002", "  - service: http_status:404", ""].join("\r\n");
		const t = parseTunnelConfig(text);
		assert.equal(t.tunnel, "godlyheroes");
		assert.equal(t.credentialsFile, "C:\\Users\\me\\.cloudflared\\godlyheroes.json");
		assert.deepEqual(t.hostnames, ["api.example.com", "second.example.com"]);
	});

	it("copes with comments, quotes and nothing at all", () => {
		const t = parseTunnelConfig('tunnel: "abc-123"  # my tunnel\ncredentials-file: \'/x/y.json\'\n');
		assert.equal(t.tunnel, "abc-123");
		assert.equal(t.credentialsFile, "/x/y.json");
		assert.deepEqual(parseTunnelConfig(""), { tunnel: null, credentialsFile: null, hostnames: [] });
		assert.deepEqual(parseTunnelConfig(undefined).hostnames, []);
	});
});

describe("reading what cloudflared prints", () => {
	it("picks the temporary address out of its banner", () => {
		assert.equal(readTunnelLine("|  https://Quiet-Fox-Demo-1.trycloudflare.com                    |").url, "https://quiet-fox-demo-1.trycloudflare.com");
		assert.equal(readTunnelLine("INF Requesting new quick Tunnel on trycloudflare.com...").url, null);
	});

	it("notices a connection and a refusal", () => {
		assert.equal(readTunnelLine("INF Registered tunnel connection connIndex=0 connection=abc location=ord01 protocol=quic").registered, true);
		assert.equal(readTunnelLine("INF Starting tunnel").registered, false);
		assert.equal(readTunnelLine("ERR Failed to authenticate with the token").failed, true);
		assert.equal(readTunnelLine("Invalid tunnel secret").failed, true);
	});
});

describe("the settings file the panel gives cloudflared", () => {
	it("points the public name at the small server and everything else at nothing", () => {
		const text = communityConfigText({ tunnel: "my-tunnel", credentialsFile: "C:\\Users\\me\\.cloudflared\\my-tunnel.json", hostname: "panel.example.com", port: 8766 });
		assert.equal(text, ["tunnel: my-tunnel", 'credentials-file: "C:/Users/me/.cloudflared/my-tunnel.json"', "", "ingress:", "  - hostname: panel.example.com", "    service: http://127.0.0.1:8766", "  - service: http_status:404", ""].join("\n"));
	});

	it("refuses anything that could be smuggled in", () => {
		const ok = { tunnel: "t", credentialsFile: "C:/c.json", hostname: "a.example.com", port: 8766 };
		assert.throws(() => communityConfigText({ ...ok, hostname: "a.example.com\n  - service: http://127.0.0.1:8765" }));
		assert.throws(() => communityConfigText({ ...ok, hostname: "bad host" }));
		assert.throws(() => communityConfigText({ ...ok, tunnel: "t\nextra: 1" }));
		assert.throws(() => communityConfigText({ ...ok, credentialsFile: 'C:/c".json' }));
		assert.throws(() => communityConfigText({ ...ok, port: 0 }));
		assert.throws(() => communityConfigText({ ...ok, port: "8765" }));
	});

	it("accepts real host names only", () => {
		for (const good of ["panel.example.com", "a.b.example.co.uk", "xn--bcher-kva.example"]) assert.equal(validHostname(good), true, good);
		for (const bad of ["", "localhost", "example", "-a.example.com", "a..com", "a b.com", "http://a.com", "a.com/x", "a.com:80"]) assert.equal(validHostname(bad), false, bad);
	});
});

describe("which names the small server answers to", () => {
	it("answers to the chosen name, with or without a port, in any case", () => {
		assert.equal(hostAllowed("Panel.Example.com", { exact: "panel.example.com" }), true);
		assert.equal(hostAllowed("panel.example.com:443", { exact: "panel.example.com" }), true);
		assert.equal(hostAllowed("other.example.com", { exact: "panel.example.com" }), false);
		assert.equal(hostAllowed("panel.example.com.evil.net", { exact: "panel.example.com" }), false);
	});

	it("answers to any temporary-link name, but not to the bare domain or a look-alike", () => {
		const rule = { suffix: ".trycloudflare.com" };
		assert.equal(hostAllowed("quiet-fox.trycloudflare.com", rule), true);
		assert.equal(hostAllowed("trycloudflare.com", rule), false);
		assert.equal(hostAllowed("quiet-fox.trycloudflare.com.evil.net", rule), false);
		assert.equal(hostAllowed("evil-trycloudflare.com", rule), false);
	});

	it("answers to nothing when no name is set, or none was sent", () => {
		assert.equal(hostAllowed("anything.example.com", { exact: "" }), false);
		assert.equal(hostAllowed(undefined, { exact: "a.example.com" }), false);
		assert.equal(hostAllowed("127.0.0.1:8766", { exact: "a.example.com" }), false);
	});
});

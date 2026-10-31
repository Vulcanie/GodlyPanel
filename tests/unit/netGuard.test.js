import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { isPrivateAddress, guardedFetch } from "../../src/server/services/modSources/netGuard.js";

// Mod downloads come from addresses that other people chose. The guard refuses anything that could reach this machine or
// the local network, and anything that leaves the hosts the provider named, including on the way through a redirect.

describe("isPrivateAddress", () => {
	const private_ = [
		["0.0.0.0", "unspecified IPv4"],
		["0.1.2.3", "0/8"],
		["10.0.0.5", "10/8"],
		["100.64.0.1", "carrier-grade NAT, low end"],
		["100.127.255.255", "carrier-grade NAT, high end"],
		["127.0.0.1", "loopback"],
		["127.255.0.9", "loopback, not just .0.1"],
		["169.254.10.10", "link-local"],
		["172.16.0.1", "172.16/12, low end"],
		["172.31.255.255", "172.16/12, high end"],
		["192.168.1.1", "home network"],
		["224.0.0.1", "multicast"],
		["239.1.1.1", "multicast, high"],
		["240.0.0.1", "reserved"],
		["255.255.255.255", "broadcast"],
		["::", "unspecified IPv6"],
		["::1", "loopback IPv6"],
		["fc00::1", "unique local, fc"],
		["fd12:3456::1", "unique local, fd"],
		["fe80::1", "link-local IPv6"],
		["febf::1", "link-local IPv6, top of fe80::/10"],
		["ff02::1", "multicast IPv6"],
		["::ffff:127.0.0.1", "mapped loopback, dotted"],
		["::ffff:10.0.0.5", "mapped private, dotted"],
		["::ffff:7f00:1", "mapped loopback, hex"],
		["::ffff:a00:5", "mapped 10.0.0.5, hex"],
		["::ffff:169.254.1.1", "mapped link-local"],
		["::ffff:0:0", "mapped unspecified"],
		["::8.8.8.8", "IPv4-compatible form, refused as unclear"],
		["fe80::1%eth0", "zone id, refused as unclear"],
		["not an address", "junk"],
		["", "empty"],
		["999.1.1.1", "octet out of range"],
		["1.2.3", "too few octets"],
		["10.0.0.5/8", "a CIDR is not an address"],
		["::ffff:zz", "bad mapped"],
	];
	const public_ = [
		["8.8.8.8", "public DNS"],
		["1.1.1.1", "public DNS"],
		["11.0.0.1", "just past 10/8"],
		["100.63.255.255", "just below 100.64/10"],
		["100.128.0.1", "just above 100.64/10"],
		["172.15.255.255", "just below 172.16/12"],
		["172.32.0.1", "just above 172.16/12"],
		["192.167.1.1", "next to 192.168/16"],
		["169.253.1.1", "next to 169.254/16"],
		["223.255.255.255", "top of unicast"],
		["93.184.216.34", "a real website"],
		["2001:4860:4860::8888", "public DNS IPv6"],
		["2606:4700::1111", "public IPv6"],
		["::ffff:8.8.8.8", "mapped public, dotted"],
		["::ffff:808:808", "mapped public, hex"],
		["fbff::1", "just below fc00::/7"],
	];

	for (const [ip, why] of private_) {
		it(`refuses ${JSON.stringify(ip)} (${why})`, () => assert.equal(isPrivateAddress(ip), true));
	}
	for (const [ip, why] of public_) {
		it(`allows ${JSON.stringify(ip)} (${why})`, () => assert.equal(isPrivateAddress(ip), false));
	}

	it("refuses anything that isn't a string", () => {
		for (const junk of [null, undefined, 127, {}, []]) assert.equal(isPrivateAddress(junk), true, String(junk));
	});
});

describe("guardedFetch", () => {
	const HOST = "files.example.test";
	const url = (path = "/a.jar", host = HOST) => `https://${host}${path}`;

	// Answers each URL from a map; records every request actually made.
	function recorder(replies = {}) {
		const calls = [];
		const fetchImpl = async (target, init) => {
			calls.push({ url: target, init });
			const reply = replies[target];
			return reply ? reply() : new Response("bytes", { status: 200 });
		};
		return { calls, fetchImpl };
	}
	const redirect = (location, status = 302) => () => new Response(null, { status, headers: { location } });

	// A DNS answer that gives each host the addresses listed for it. A host not in the map doesn't resolve.
	const dns = (answers) => async (host) => {
		if (!Object.hasOwn(answers, host)) throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
		return answers[host].map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
	};
	const publicDns = dns({ [HOST]: ["93.184.216.34"], "elsewhere.example.test": ["93.184.216.35"] });
	const refusal = { message: "That address isn't one the panel will download from." };

	let savedLoopback;
	before(() => {
		savedLoopback = process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
		delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
	});
	after(() => {
		if (savedLoopback === undefined) delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
		else process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = savedLoopback;
	});

	it("always asks for manual redirects, whatever the caller asked for", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await get(url(), { redirect: "follow", headers: { "User-Agent": "GodlyPanel" } });
		assert.equal(rec.calls[0].init.redirect, "manual");
		assert.equal(rec.calls[0].init.headers["User-Agent"], "GodlyPanel");
	});

	it("refuses plain http unless allowHttp is set, and makes no request", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(`http://${HOST}/a.jar`), refusal);
		assert.equal(rec.calls.length, 0);
	});

	it("allows http when allowHttp is set", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: [HOST], allowHttp: true, resolve: publicDns, fetchImpl: rec.fetchImpl });
		await get(`http://${HOST}/a.jar`);
		assert.equal(rec.calls.length, 1);
	});

	it("refuses a username or password in the address", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(`https://user:pw@${HOST}/a.jar`), refusal);
		await assert.rejects(() => get(`https://user@${HOST}/a.jar`), refusal);
		assert.equal(rec.calls.length, 0);
	});

	it("refuses a port that isn't the default", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(`https://${HOST}:8443/a.jar`), refusal);
		assert.equal(rec.calls.length, 0);
	});

	it("refuses a host that isn't on the list, even one that merely contains a listed name", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(url("/a.jar", "evil.example.test")), refusal);
		await assert.rejects(() => get(url("/a.jar", `${HOST}.evil.test`)), refusal);
		assert.equal(rec.calls.length, 0);
	});

	it("matches the host name without regard to case", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: ["Files.Example.Test"], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await get(url("/a.jar", "FILES.example.test"));
		assert.equal(rec.calls.length, 1);
	});

	for (const [label, answer] of [
		["loopback", ["127.0.0.1"]],
		["the local network", ["10.0.0.5"]],
		["IPv6 loopback", ["::1"]],
		["a mapped private address", ["::ffff:192.168.0.9"]],
		["one private address among public ones", ["93.184.216.34", "192.168.0.9"]],
	]) {
		it(`refuses a host that resolves to ${label}, without a request`, async () => {
			const rec = recorder();
			const get = guardedFetch({ hosts: [HOST], resolve: dns({ [HOST]: answer }), fetchImpl: rec.fetchImpl });
			await assert.rejects(() => get(url()), refusal);
			assert.equal(rec.calls.length, 0);
		});
	}

	it("refuses a host whose name doesn't resolve", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: [HOST], resolve: dns({}), fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(url()), refusal);
		assert.equal(rec.calls.length, 0);
	});

	it("refuses a host that resolves to nothing at all", async () => {
		const rec = recorder();
		const get = guardedFetch({ hosts: [HOST], resolve: async () => [], fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(url()), refusal);
		assert.equal(rec.calls.length, 0);
	});

	it("refuses a redirect to another host, and never requests that host", async () => {
		const rec = recorder({ [url()]: redirect(`https://elsewhere.example.test/a.jar`) });
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(url()), refusal);
		assert.deepEqual(rec.calls.map((c) => c.url), [url()]);
	});

	it("follows a relative redirect on the same host", async () => {
		const rec = recorder({ [url()]: redirect("/files/real.jar") });
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		const res = await get(url());
		assert.equal(res.status, 200);
		assert.deepEqual(rec.calls.map((c) => c.url), [url(), url("/files/real.jar")]);
	});

	it("checks the address again at every hop", async () => {
		let lookups = 0;
		const flipping = async (host) => {
			lookups += 1;
			return [{ address: lookups === 1 ? "93.184.216.34" : "127.0.0.1", family: 4 }];
		};
		const rec = recorder({ [url()]: redirect("/files/real.jar") });
		const get = guardedFetch({ hosts: [HOST], resolve: flipping, fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(url()), refusal);
		assert.deepEqual(rec.calls.map((c) => c.url), [url()], "the second hop was never requested");
	});

	it("follows up to three redirects", async () => {
		const rec = recorder({
			[url()]: redirect("/h1"),
			[url("/h1")]: redirect("/h2"),
			[url("/h2")]: redirect("/h3"),
		});
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		const res = await get(url());
		assert.equal(res.status, 200);
		assert.equal(rec.calls.length, 4);
	});

	it("refuses a fourth redirect", async () => {
		const rec = recorder({
			[url()]: redirect("/h1"),
			[url("/h1")]: redirect("/h2"),
			[url("/h2")]: redirect("/h3"),
			[url("/h3")]: redirect("/h4"),
			[url("/h4")]: () => new Response("never", { status: 200 }),
		});
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(url()), { message: "Too many redirects." });
		assert.equal(rec.calls.some((c) => c.url === url("/h4")), false, "the fifth request was never made");
	});

	it("refuses a plain-http hop after an https start, even on the same host", async () => {
		const rec = recorder({ [url()]: redirect(`http://${HOST}/a.jar`) });
		const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
		await assert.rejects(() => get(url()), refusal);
		assert.equal(rec.calls.length, 1);
	});

	describe("the test-only loopback mode", () => {
		before(() => {
			process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = "1";
		});
		after(() => {
			delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
		});

		it("lets a stand-in on 127.0.0.1 answer over http", async () => {
			const rec = recorder();
			const get = guardedFetch({ hosts: ["modrinth.com"], resolve: publicDns, fetchImpl: rec.fetchImpl });
			await get("http://127.0.0.1:9999/a.jar");
			assert.equal(rec.calls.length, 1);
		});

		it("skips the private-address check for a listed host", async () => {
			const rec = recorder();
			const get = guardedFetch({ hosts: [HOST], resolve: dns({ [HOST]: ["127.0.0.1"] }), fetchImpl: rec.fetchImpl });
			await get(url());
			assert.equal(rec.calls.length, 1);
		});

		it("still refuses a redirect to another host name", async () => {
			const rec = recorder({ "http://127.0.0.1:9999/a.jar": redirect("http://localhost:9999/a.jar") });
			const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
			await assert.rejects(() => get("http://127.0.0.1:9999/a.jar"), refusal);
			assert.equal(rec.calls.length, 1);
		});

		it("still refuses a host name that isn't listed", async () => {
			const rec = recorder();
			const get = guardedFetch({ hosts: [HOST], resolve: publicDns, fetchImpl: rec.fetchImpl });
			await assert.rejects(() => get("http://evil.example.test:9999/a.jar"), refusal);
			assert.equal(rec.calls.length, 0);
		});
	});
});

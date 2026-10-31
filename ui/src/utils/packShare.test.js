import { describe, it, expect } from "vitest";
import { packLinks, adminPackDownloads } from "./packShare.js";

// The mods panel's share section: which state the link is in, the three player links, and the admin download addresses. The
// panel only draws what these return, so they must accept whatever the server or the community data sends, without throwing.

const PATH = "/api/pack/abc123/";
const COMMUNITY_ON = { enabled: true, publicUrl: "https://play.example.com" };

describe("packShare", () => {
	describe("packLinks", () => {
		it("is off when there is no share", () => {
			expect(packLinks(null, COMMUNITY_ON)).toEqual({ state: "off" });
		});

		it("is off when the share is not enabled", () => {
			expect(packLinks({ enabled: false, token: "abc", path: null }, COMMUNITY_ON)).toEqual({ state: "off" });
		});

		it("says there is no address when the share is on but the community view is off", () => {
			expect(packLinks({ enabled: true, path: PATH }, { enabled: false, publicUrl: "https://play.example.com" })).toEqual({ state: "no_address" });
		});

		it("says there is no address when the community view has no public address", () => {
			expect(packLinks({ enabled: true, path: PATH }, { enabled: true, publicUrl: "" })).toEqual({ state: "no_address" });
			expect(packLinks({ enabled: true, path: PATH }, { enabled: true })).toEqual({ state: "no_address" });
		});

		it("says there is no address when the public address is not http or https", () => {
			expect(packLinks({ enabled: true, path: PATH }, { enabled: true, publicUrl: "ftp://play.example.com" })).toEqual({ state: "no_address" });
			expect(packLinks({ enabled: true, path: PATH }, { enabled: true, publicUrl: "play.example.com" })).toEqual({ state: "no_address" });
		});

		it("gives the player links when ready, the Modrinth pack among them", () => {
			expect(packLinks({ enabled: true, path: PATH }, COMMUNITY_ON)).toEqual({
				state: "ready",
				links: {
					manifest: "https://play.example.com/api/pack/abc123/manifest.json",
					zip: "https://play.example.com/api/pack/abc123/mod-pack.zip",
					list: "https://play.example.com/api/pack/abc123/mod-list.txt",
					mrpack: "https://play.example.com/api/pack/abc123/mod-pack.mrpack",
				},
			});
		});

		it("drops trailing slashes from the public address", () => {
			const result = packLinks({ enabled: true, path: PATH }, { enabled: true, publicUrl: "http://play.example.com///" });
			expect(result.state).toBe("ready");
			expect(result.links.zip).toBe("http://play.example.com/api/pack/abc123/mod-pack.zip");
		});

		it("is off when the path does not look like a pack path", () => {
			expect(packLinks({ enabled: true, path: "/somewhere/else/" }, COMMUNITY_ON)).toEqual({ state: "off" });
			expect(packLinks({ enabled: true, path: "/api/pack/abc123" }, COMMUNITY_ON)).toEqual({ state: "off" });
			expect(packLinks({ enabled: true, path: null }, COMMUNITY_ON)).toEqual({ state: "off" });
			expect(packLinks({ enabled: true, path: 42 }, COMMUNITY_ON)).toEqual({ state: "off" });
		});

		it("never throws on null or wrong-type input", () => {
			expect(() => packLinks(undefined, undefined)).not.toThrow();
			expect(() => packLinks("enabled", "community")).not.toThrow();
			expect(() => packLinks({ enabled: true, path: PATH }, null)).not.toThrow();
			expect(packLinks({ enabled: true, path: PATH }, null)).toEqual({ state: "no_address" });
			expect(packLinks("share", 7)).toEqual({ state: "off" });
		});
	});

	describe("adminPackDownloads", () => {
		it("gives the zip, list, Modrinth pack and manifest addresses for a plain name", () => {
			expect(adminPackDownloads("survival")).toEqual({
				zip: "/api/server/survival/mods/client-pack?format=zip",
				list: "/api/server/survival/mods/client-pack?format=list",
				mrpack: "/api/server/survival/mods/client-pack?format=mrpack",
				manifest: "/api/server/survival/mods/manifest",
			});
		});

		it("encodes a name with a space and a slash", () => {
			const urls = adminPackDownloads("my server/one");
			expect(urls.zip).toBe("/api/server/my%20server%2Fone/mods/client-pack?format=zip");
			expect(urls.list).toBe("/api/server/my%20server%2Fone/mods/client-pack?format=list");
			expect(urls.mrpack).toBe("/api/server/my%20server%2Fone/mods/client-pack?format=mrpack");
			expect(urls.manifest).toBe("/api/server/my%20server%2Fone/mods/manifest");
		});

		it("never throws on a missing name", () => {
			expect(() => adminPackDownloads(undefined)).not.toThrow();
			expect(() => adminPackDownloads(null)).not.toThrow();
		});
	});
});

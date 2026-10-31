import { describe, it, expect } from "vitest";
import { joinPath, parentPath, breadcrumbs, sortEntries, formatSize, fileActions, isLauncherName, uploadWarning, friendlyError } from "./fileBrowser.js";

// The server's file browser: the helpers the Files tab uses to build paths, sort the list, show sizes, and decide which buttons a
// row shows. The panel only draws what these return, so none of them may throw, whatever the server or the browser hands in.

const hostile = [null, undefined, 0, 42, NaN, {}, [], true];

describe("fileBrowser", () => {
	describe("joinPath", () => {
		it("joins a folder and a name with a forward slash", () => {
			expect(joinPath("a/b", "c.txt")).toBe("a/b/c.txt");
		});

		it("treats an empty folder as the server folder root", () => {
			expect(joinPath("", "notes.txt")).toBe("notes.txt");
		});

		it("never leaves a leading, trailing or doubled slash", () => {
			expect(joinPath("/a//b/", "/c/")).toBe("a/b/c");
			expect(joinPath("a//", "")).toBe("a");
		});

		it("keeps '..' as plain text, since the server is the one that refuses it", () => {
			expect(joinPath("a", "../x")).toBe("a/../x");
		});

		it("gives an empty string for bad input", () => {
			for (const bad of hostile) {
				expect(() => joinPath(bad, bad)).not.toThrow();
			}
			expect(joinPath(null, "x")).toBe("x");
			expect(joinPath("a", 7)).toBe("a");
		});
	});

	describe("parentPath", () => {
		it("drops the last folder", () => {
			expect(parentPath("a/b/c")).toBe("a/b");
		});

		it("gives the server folder root for a top-level folder", () => {
			expect(parentPath("a")).toBe("");
		});

		it("stays at the root when already there", () => {
			expect(parentPath("")).toBe("");
		});

		it("accepts bad input without throwing", () => {
			for (const bad of hostile) {
				expect(() => parentPath(bad)).not.toThrow();
				expect(parentPath(bad)).toBe("");
			}
		});
	});

	describe("breadcrumbs", () => {
		it("starts with the server folder and adds each folder down to here", () => {
			expect(breadcrumbs("a/b")).toEqual([
				{ label: "Server folder", path: "" },
				{ label: "a", path: "a" },
				{ label: "b", path: "a/b" },
			]);
		});

		it("is only the server folder at the root", () => {
			expect(breadcrumbs("")).toEqual([{ label: "Server folder", path: "" }]);
		});

		it("ignores doubled and trailing slashes", () => {
			expect(breadcrumbs("a//b/")).toEqual([
				{ label: "Server folder", path: "" },
				{ label: "a", path: "a" },
				{ label: "b", path: "a/b" },
			]);
		});

		it("falls back to the server folder for bad input", () => {
			for (const bad of hostile) {
				expect(() => breadcrumbs(bad)).not.toThrow();
				expect(breadcrumbs(bad)).toEqual([{ label: "Server folder", path: "" }]);
			}
		});
	});

	describe("sortEntries", () => {
		it("puts folders before files, each A to Z ignoring case", () => {
			const sorted = sortEntries([
				{ name: "zeta.txt", type: "file" },
				{ name: "beta", type: "dir" },
				{ name: "Alpha.txt", type: "file" },
				{ name: "alpha", type: "dir" },
			]);
			expect(sorted.map((e) => e.name)).toEqual(["alpha", "beta", "Alpha.txt", "zeta.txt"]);
		});

		it("sorts numbers inside names by their value", () => {
			const sorted = sortEntries([
				{ name: "world10.zip", type: "file" },
				{ name: "world2.zip", type: "file" },
			]);
			expect(sorted.map((e) => e.name)).toEqual(["world2.zip", "world10.zip"]);
		});

		it("does not change the list it was given", () => {
			const input = [
				{ name: "b", type: "file" },
				{ name: "a", type: "dir" },
			];
			sortEntries(input);
			expect(input.map((e) => e.name)).toEqual(["b", "a"]);
		});

		it("gives an empty list for anything that is not a list", () => {
			for (const bad of hostile) {
				expect(() => sortEntries(bad)).not.toThrow();
				expect(sortEntries(bad)).toEqual([]);
			}
		});
	});

	describe("formatSize", () => {
		it("shows plain bytes and the bigger units with one decimal", () => {
			expect(formatSize(0)).toBe("0 B");
			expect(formatSize(512)).toBe("512 B");
			expect(formatSize(1536)).toBe("1.5 KB");
			expect(formatSize(3355443)).toBe("3.2 MB");
			expect(formatSize(1181116006)).toBe("1.1 GB");
		});

		it("gives an empty string for bad input", () => {
			for (const bad of [null, undefined, "12", -1, NaN, Infinity, {}, []]) {
				expect(() => formatSize(bad)).not.toThrow();
				expect(formatSize(bad)).toBe("");
			}
		});
	});

	describe("fileActions", () => {
		const all = { view: true, edit: true, del: true };
		const none = { view: false, edit: false, del: false };
		const file = { name: "server.properties", type: "file", size: 10, protected: false };
		const folder = { name: "world", type: "dir", size: 0, protected: false };

		it("gives an editor's full set of actions on an ordinary file to a person with every permission", () => {
			expect(fileActions({ entry: file, can: all, isAdmin: false })).toEqual({
				open: false,
				edit: true,
				download: true,
				rename: true,
				remove: true,
				extract: false,
			});
		});

		it("gives a folder open, download, rename and remove, and no edit", () => {
			expect(fileActions({ entry: folder, can: all, isAdmin: false })).toEqual({
				open: true,
				edit: false,
				download: true,
				rename: true,
				remove: true,
				extract: false,
			});
		});

		it("gives nothing but view to someone who can only look", () => {
			const actions = fileActions({ entry: file, can: { view: true, edit: false, del: false }, isAdmin: false });
			expect(actions).toEqual({ open: false, edit: false, download: true, rename: false, remove: false, extract: false });
		});

		it("gives no actions at all without the view permission", () => {
			expect(fileActions({ entry: file, can: none, isAdmin: false })).toEqual({
				open: false,
				edit: false,
				download: false,
				rename: false,
				remove: false,
				extract: false,
			});
		});

		it("never offers rename or remove on a protected entry, even with every permission", () => {
			const actions = fileActions({ entry: { ...file, protected: true }, can: all, isAdmin: true });
			expect(actions.rename).toBe(false);
			expect(actions.remove).toBe(false);
			expect(actions.download).toBe(true);
		});

		it("offers unpack only for an administrator with edit on a zip file", () => {
			const zip = { name: "mods.ZIP", type: "file", size: 5, protected: false };
			expect(fileActions({ entry: zip, can: all, isAdmin: true }).extract).toBe(true);
			expect(fileActions({ entry: zip, can: all, isAdmin: false }).extract).toBe(false);
			expect(fileActions({ entry: zip, can: { view: true, edit: false, del: false }, isAdmin: true }).extract).toBe(false);
		});

		it("does not offer unpack for a folder named like a zip, or a file that is not a zip", () => {
			expect(fileActions({ entry: { name: "packs.zip", type: "dir" }, can: all, isAdmin: true }).extract).toBe(false);
			expect(fileActions({ entry: { name: "notes.txt", type: "file" }, can: all, isAdmin: true }).extract).toBe(false);
		});

		it("returns only booleans, and no actions, for bad input", () => {
			for (const bad of [null, undefined, 3, "file", {}]) {
				expect(() => fileActions({ entry: bad, can: bad, isAdmin: bad })).not.toThrow();
				for (const value of Object.values(fileActions({ entry: bad, can: bad, isAdmin: bad }))) {
					expect(value).toBe(false);
				}
			}
		});
	});

	describe("isLauncherName", () => {
		it("is true for every launcher type, in any letter case", () => {
			for (const name of ["start.bat", "run.CMD", "x.ps1", "a.vbs", "a.vbe", "a.js", "a.jse", "a.wsf", "a.exe", "a.com", "a.scr", "a.msi", "a.lnk", "a.dll"]) {
				expect(isLauncherName(name)).toBe(true);
			}
		});

		it("is false for ordinary files", () => {
			for (const name of ["notes.txt", "mods.zip", "server.jar", "config.json", "readme"]) {
				expect(isLauncherName(name)).toBe(false);
			}
		});

		it("looks only at the last part of a path", () => {
			expect(isLauncherName("tools/start.bat")).toBe(true);
			expect(isLauncherName("start.bat/notes.txt")).toBe(false);
		});

		it("is false for a name ending in a dot or a space, or with no extension", () => {
			expect(isLauncherName("start.bat.")).toBe(false);
			expect(isLauncherName("start.bat ")).toBe(false);
			expect(isLauncherName("start")).toBe(false);
		});

		it("is false for bad input", () => {
			for (const bad of hostile) {
				expect(() => isLauncherName(bad)).not.toThrow();
				expect(isLauncherName(bad)).toBe(false);
			}
		});
	});

	describe("uploadWarning", () => {
		it("warns a non-administrator who picks a launcher name", () => {
			expect(uploadWarning({ name: "start.bat", isAdmin: false })).toBe("Only an administrator can upload that kind of file.");
		});

		it("says nothing to an administrator, or for an ordinary file", () => {
			expect(uploadWarning({ name: "start.bat", isAdmin: true })).toBe("");
			expect(uploadWarning({ name: "mods.zip", isAdmin: false })).toBe("");
		});

		it("accepts bad input without throwing", () => {
			for (const bad of hostile) {
				expect(() => uploadWarning(bad)).not.toThrow();
				expect(uploadWarning(bad)).toBe("");
			}
		});
	});

	describe("friendlyError", () => {
		it("shows the server's own message", () => {
			expect(friendlyError(new Error("That folder already has a file with this name."))).toBe("That folder already has a file with this name.");
		});

		it("gives a plain fallback when there is no usable message", () => {
			expect(friendlyError(new Error(""))).toBe("That didn't work. Try again.");
			expect(friendlyError(new Error("   "))).toBe("That didn't work. Try again.");
			for (const bad of [null, undefined, "boom", 5, {}, { message: 9 }]) {
				expect(() => friendlyError(bad)).not.toThrow();
				expect(friendlyError(bad)).toBe("That didn't work. Try again.");
			}
		});
	});
});

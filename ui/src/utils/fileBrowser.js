// Helpers for the server's Files tab: paths, sorting, sizes, which row buttons to show, and the plain-English messages. Kept out of the
// component so they can be tested without a render setup. Every function accepts bad input without throwing, since the values come
// from the server and the browser, and either can be missing fields. The server checks every request again, so nothing here is what
// keeps a file safe; these only decide what to show.

// The file types Windows runs when double-clicked or started by a script. The server refuses to save these for anyone but an
// administrator, so the panel warns before an upload that is sure to be refused. Keep this list in step with the server's.
const LAUNCHER_EXTENSIONS = [".bat", ".cmd", ".ps1", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".exe", ".com", ".scr", ".msi", ".lnk", ".dll"];

const ROOT_LABEL = "Server folder";
const FALLBACK_ERROR = "That didn't work. Try again.";

// The parts of a path, with empty ones (leading, trailing or doubled slashes) dropped. A path that is not text is no path at all.
function partsOf(path) {
	if (typeof path !== "string") return [];
	return path.split("/").filter((part) => part !== "");
}

/** Joins a folder and a name with forward slashes. An empty folder means the server folder itself. */
export function joinPath(dir, name) {
	return [...partsOf(dir), ...partsOf(name)].join("/");
}

/** The folder above this one. The top level's parent is the server folder, shown as "". */
export function parentPath(path) {
	return partsOf(path).slice(0, -1).join("/");
}

/** The clickable trail from the server folder down to this folder, one step per folder. */
export function breadcrumbs(path) {
	const steps = [{ label: ROOT_LABEL, path: "" }];
	const parts = partsOf(path);
	parts.forEach((label, i) => {
		steps.push({ label, path: parts.slice(0, i + 1).join("/") });
	});
	return steps;
}

/** The list in the order people expect: folders first, then files, each A to Z ignoring case, with numbers compared by value. */
export function sortEntries(entries) {
	if (!Array.isArray(entries)) return [];
	const rank = (entry) => (entry?.type === "dir" ? 0 : 1);
	// filter makes a copy, so the list the caller passed in is left as it was.
	return entries
		.filter((entry) => entry && typeof entry === "object")
		.sort((a, b) => rank(a) - rank(b) || String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base", numeric: true }));
}

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];

/** A size a person can read, such as "1.5 KB". Bytes stay whole, bigger units get one decimal. */
export function formatSize(bytes) {
	if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "";
	if (bytes === 0) return "0 B";
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
	return i === 0 ? `${bytes} B` : `${(bytes / 1024 ** i).toFixed(1)} ${SIZE_UNITS[i]}`;
}

/**
 * Which buttons a row shows. `can` is what this person may do on this server ({ view, edit, del }), `isAdmin` says whether they are an
 * administrator. Protected entries (the server's own files) can be opened and downloaded but never renamed or removed.
 */
export function fileActions(options) {
	const { entry, can, isAdmin } = options && typeof options === "object" ? options : {};
	const row = entry && typeof entry === "object" ? entry : {};
	const may = can && typeof can === "object" ? can : {};
	const isFile = row.type === "file";
	const isFolder = row.type === "dir";
	const locked = row.protected === true;
	const viewable = may.view === true;
	const editable = may.edit === true;
	const removable = may.del === true;
	const name = typeof row.name === "string" ? row.name : "";
	// Unpacking is the one action only an administrator may do, since it writes many files at once.
	const isZip = isFile && name.toLowerCase().endsWith(".zip");

	return {
		open: isFolder && viewable,
		edit: isFile && editable,
		download: viewable,
		rename: editable && !locked,
		remove: removable && !locked,
		extract: editable && isAdmin === true && isZip,
	};
}

/** Whether a file name is one of the launcher types above. Only the last part of a path counts, and a name with no extension never does. */
export function isLauncherName(name) {
	if (typeof name !== "string") return false;
	// Windows drops trailing dots and spaces, so "start.bat." is still a batch file; and a bare ".bat" counts too. The server does the
	// same, so a warning here matches what it would refuse.
	const last = name.split(/[\\/]/).pop().replace(/[. ]+$/, "");
	const dot = last.lastIndexOf(".");
	if (dot < 0) return false;
	return LAUNCHER_EXTENSIONS.includes(last.slice(dot).toLowerCase());
}

/** The warning shown before an upload that the server would refuse for this person, or "" when the upload is fine. */
export function uploadWarning(options) {
	const { name, isAdmin } = options && typeof options === "object" ? options : {};
	return isLauncherName(name) && isAdmin !== true ? "Only an administrator can upload that kind of file." : "";
}

/** The message to show for a failed request. The server's own text is already plain English, so it is shown as it is. */
export function friendlyError(err) {
	const message = err?.message;
	return typeof message === "string" && message.trim() !== "" ? message : FALLBACK_ERROR;
}

// Reading release versions and notes: pure functions with no side effects (no files, no network), so a test can import them
// without loading the panel's stores. Used by services/panelUpdate.js.

/** Semver ordering, including pre-releases: 0.1.0-alpha.2 < 0.1.0-alpha.10 < 0.1.0. */
export function compareVersions(a, b) {
	const parse = (v) => {
		const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(v).trim());
		return m ? { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split(".") : null } : null;
	};
	const x = parse(a);
	const y = parse(b);
	if (!x || !y) return 0;
	for (let i = 0; i < 3; i += 1) if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1;
	if (!x.pre && !y.pre) return 0;
	if (!x.pre) return 1; // a release is newer than its own pre-releases
	if (!y.pre) return -1;
	for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i += 1) {
		const p = x.pre[i];
		const q = y.pre[i];
		if (p === undefined) return -1;
		if (q === undefined) return 1;
		const pn = /^\d+$/.test(p);
		const qn = /^\d+$/.test(q);
		if (pn && qn) {
			if (Number(p) !== Number(q)) return Number(p) < Number(q) ? -1 : 1;
		} else if (pn !== qn) return pn ? -1 : 1;
		else if (p !== q) return p < q ? -1 : 1;
	}
	return 0;
}


/** The SHA-256 the release notes give for an asset, or null. */
export function checksumFromNotes(notes, assetName) {
	if (!notes) return null;
	const escaped = assetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const near = new RegExp(`${escaped}[\\s\\S]{0,200}?\\b([0-9a-fA-F]{64})\\b`).exec(notes);
	if (near) return near[1].toLowerCase();
	return null;
}

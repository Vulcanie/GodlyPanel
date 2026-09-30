// A line-by-line comparison of two texts, for showing what a settings file change did.
// Plain code with no imports so it can also be run by the tests.

const LIMIT = 4_000_000; // cells of the comparison table; beyond it the middle is shown as replaced

const split = (text) => {
	const lines = String(text).split(/\r?\n/);
	if (lines.length > 1 && lines.at(-1) === "") lines.pop();
	return lines;
};

/**
 * @returns {{ type: "same"|"add"|"del", text: string }[]}
 */
export function diffLines(before, after) {
	const a = split(before);
	const b = split(after);

	// What the two share at the start and the end needs no comparing.
	let start = 0;
	while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
	let endA = a.length;
	let endB = b.length;
	while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
		endA -= 1;
		endB -= 1;
	}

	const out = a.slice(0, start).map((text) => ({ type: "same", text }));
	const midA = a.slice(start, endA);
	const midB = b.slice(start, endB);

	if (midA.length * midB.length > LIMIT) {
		out.push(...midA.map((text) => ({ type: "del", text })), ...midB.map((text) => ({ type: "add", text })));
	} else {
		// Longest common subsequence of the middle.
		const n = midA.length;
		const m = midB.length;
		const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
		for (let i = n - 1; i >= 0; i -= 1) {
			for (let j = m - 1; j >= 0; j -= 1) {
				table[i][j] = midA[i] === midB[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
			}
		}
		let i = 0;
		let j = 0;
		while (i < n && j < m) {
			if (midA[i] === midB[j]) {
				out.push({ type: "same", text: midA[i] });
				i += 1;
				j += 1;
			} else if (table[i + 1][j] >= table[i][j + 1]) {
				out.push({ type: "del", text: midA[i] });
				i += 1;
			} else {
				out.push({ type: "add", text: midB[j] });
				j += 1;
			}
		}
		while (i < n) out.push({ type: "del", text: midA[i++] });
		while (j < m) out.push({ type: "add", text: midB[j++] });
	}

	out.push(...a.slice(endA).map((text) => ({ type: "same", text })));
	return out;
}

/** How many lines were added and removed. */
export function summarise(diff) {
	return { added: diff.filter((d) => d.type === "add").length, removed: diff.filter((d) => d.type === "del").length };
}

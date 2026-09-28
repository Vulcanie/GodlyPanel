// Parser for JSON config files (Enshrouded, Windrose). JSON.parse/stringify
// is inherently lossless for round-tripping values, so unlike the line-based
// formats we work with the real object instead of raw line offsets.
//
// Plain-object subtrees are flattened all the way down into scalar leaves
// (dot-path keys like "gameSettings.playerHealthFactor"). Arrays are kept as
// a single leaf (its whole JSON value) unless the catalog registers that
// path as a "structured list" for custom rendering (e.g. Enshrouded's
// userGroups).

export function parseJsonConfig(text) {
	const root = JSON.parse(text);
	return { root };
}

function flatten(value, basePath, structuredPaths, out) {
	if (
		value !== null &&
		typeof value === "object" &&
		!Array.isArray(value)
	) {
		for (const [key, child] of Object.entries(value)) {
			flatten(child, basePath ? `${basePath}.${key}` : key, structuredPaths, out);
		}
		return;
	}

	const leafKey = basePath.includes(".")
		? basePath.slice(basePath.lastIndexOf(".") + 1)
		: basePath;
	const topLevel = basePath.includes(".")
		? basePath.slice(0, basePath.indexOf("."))
		: basePath;

	if (Array.isArray(value)) {
		if (structuredPaths.has(basePath)) {
			out.push({
				id: basePath,
				path: basePath,
				key: leafKey,
				topLevel,
				value,
				structured: true,
			});
			return;
		}

		// Arrays we don't have a custom editor for still get a leaf control,
		// as their JSON text — edited via JSON.parse, not the plain string
		// coercion used for scalar leaves.
		out.push({
			id: basePath,
			path: basePath,
			key: leafKey,
			topLevel,
			value: JSON.stringify(value),
			structured: false,
			rawJson: true,
		});
		return;
	}

	out.push({
		id: basePath,
		path: basePath,
		key: leafKey,
		topLevel,
		value,
		structured: false,
	});
}

export function flattenJsonEntries(parsed, structuredPaths = new Set()) {
	const out = [];
	flatten(parsed.root, "", structuredPaths, out);
	return out;
}

function setAtPath(root, path, value) {
	const parts = path.split(".");
	let node = root;
	for (let i = 0; i < parts.length - 1; i++) {
		node = node[parts[i]];
	}
	node[parts[parts.length - 1]] = value;
}

export function serializeJsonConfig(parsed, edits) {
	const root = JSON.parse(JSON.stringify(parsed.root));
	for (const [path, value] of Object.entries(edits)) {
		setAtPath(root, path, value);
	}
	return JSON.stringify(root, null, 2);
}

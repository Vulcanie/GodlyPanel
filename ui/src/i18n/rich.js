import React from "react";

// The words may mark <b>, <i> and <code> (not nested). A {name} stands for the text or markup given for it in `parts`.
// A `code` part replaces the plain <code> tag, so a screen can style it.
export function rich(text, parts = {}) {
	const source = typeof text === "string" ? text : "";
	const nodes = [];
	let last = 0;
	for (const m of source.matchAll(/<(b|i|code)>(.*?)<\/\1>|\{(\w+)\}/g)) {
		if (m.index > last) nodes.push(source.slice(last, m.index));
		if (m[1]) {
			const Tag = m[1] === "code" && parts.code ? parts.code : m[1];
			nodes.push(React.createElement(Tag, { key: nodes.length }, m[2]));
		} else nodes.push(Object.hasOwn(parts, m[3]) ? React.createElement(React.Fragment, { key: nodes.length }, parts[m[3]]) : m[0]);
		last = m.index + m[0].length;
	}
	if (last < source.length) nodes.push(source.slice(last));
	return nodes;
}

// One place that talks to the API.
//
// This replaces five copies of the same `API_BASE` + `joinUrl` helper and the
// manual `Authorization: Bearer` header that used to be threaded through five
// components as a prop. The panel serves its own UI, so requests are
// same-origin, paths are relative, and the session cookie is sent
// automatically — including by EventSource, which cannot set headers at all.

let onUnauthenticated = null;

/** Called when the server says we're not signed in, so the app can react once. */
export function setUnauthenticatedHandler(fn) {
	onUnauthenticated = fn;
}

export class ApiError extends Error {
	constructor(message, { status, code } = {}) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

export async function apiFetch(path, options = {}) {
	const res = await fetch(path, {
		credentials: "same-origin",
		...options,
		headers: {
			Accept: "application/json",
			...(options.body && !(options.body instanceof FormData)
				? { "Content-Type": "application/json" }
				: {}),
			...options.headers,
		},
	});

	if (res.status === 204) return null;

	let payload = null;
	const text = await res.text();
	if (text) {
		try {
			payload = JSON.parse(text);
		} catch {
			payload = { error: text };
		}
	}

	if (!res.ok) {
		if (res.status === 401 && onUnauthenticated) onUnauthenticated(payload);
		throw new ApiError(payload?.error || `Request failed (${res.status})`, {
			status: res.status,
			code: payload?.code,
		});
	}

	return payload;
}

export const api = {
	get: (path) => apiFetch(path),
	post: (path, body) =>
		apiFetch(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
	put: (path, body) =>
		apiFetch(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
	del: (path) => apiFetch(path, { method: "DELETE" }),
	upload: (path, formData) => apiFetch(path, { method: "POST", body: formData }),
};

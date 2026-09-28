// Client-side JWT expiry check only, for UX (auto-logout when a stored
// token has aged past its 30-day validity) — not a security check. The
// signature is never verified here; the server independently verifies and
// rejects an expired/invalid token on every write regardless of what the
// client thinks.
export function isTokenExpired(token) {
	if (!token) return true;

	try {
		const payload = token.split(".")[1];
		const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
		const json = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
				.join(""),
		);
		const { exp } = JSON.parse(json);
		if (!exp) return true;
		return Date.now() >= exp * 1000;
	} catch {
		return true;
	}
}

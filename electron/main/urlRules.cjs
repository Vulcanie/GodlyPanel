// Which addresses the app's window may stay on, and which it may hand to the browser. Kept free of
// Electron so it can be tested on its own.

/** True only for a page on exactly this address: same scheme, host and port, not just the same start of text. */
function isOurOrigin(url, appOrigin) {
	try {
		return new URL(url).origin === appOrigin;
	} catch {
		return false;
	}
}

/** The address to give the operating system's browser, or null. Only ordinary web links qualify. */
function externalLink(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
	} catch {
		return null;
	}
}

module.exports = { isOurOrigin, externalLink };

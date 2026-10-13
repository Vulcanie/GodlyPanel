/**
 * Copy text and say how it went through `callback` ("Copied!" or "Failed!").
 *
 * The panel is usually opened over plain http on the local network, where the browser's modern clipboard API is switched off, so the
 * older route is used unless the modern one is allowed. (execCommand reports failure by returning false, not by throwing.)
 */
export function copyToClipboard(text, callback) {
	const done = (ok) => callback(ok ? "Copied!" : "Failed!");
	if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText(String(text)).then(() => done(true), () => legacyCopy(text, done));
		return;
	}
	legacyCopy(text, done);
}

function legacyCopy(text, done) {
	const textArea = document.createElement("textarea");
	textArea.value = String(text);
	textArea.setAttribute("readonly", "");
	textArea.style.position = "fixed";
	textArea.style.opacity = "0";
	document.body.appendChild(textArea);
	textArea.select();
	let ok = false;
	try {
		ok = document.execCommand("copy");
	} catch {
		ok = false;
	}
	document.body.removeChild(textArea);
	done(ok);
}

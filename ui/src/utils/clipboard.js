export function copyToClipboard(text, callback) {
	const textArea = document.createElement("textarea");
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.select();
	try {
		document.execCommand("copy");
		callback("Copied!");
	} catch (err) {
		callback("Failed!");
	}
	document.body.removeChild(textArea);
}

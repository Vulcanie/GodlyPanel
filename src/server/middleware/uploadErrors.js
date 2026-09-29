// Multer reports a rejected upload by handing an error to next(), and with no
// error-handling middleware in front of it that becomes a bare 500 with no
// body — so the panel showed "Request failed (500)" for something as ordinary
// as a file over the size limit. This turns those into the same
// {error: "..."} shape every other route answers with.

/**
 * @param upload     a configured multer instance
 * @param field      the form field the file arrives on
 * @param limitLabel human-readable size limit, for the message
 */
export function singleFile(upload, field, limitLabel) {
	const handler = upload.single(field);
	return (req, res, next) => {
		handler(req, res, (err) => {
			if (!err) return next();
			if (err.code === "LIMIT_FILE_SIZE") {
				return res.status(413).json({ error: `That file is too large — the limit is ${limitLabel}.` });
			}
			if (err.code === "LIMIT_UNEXPECTED_FILE") {
				return res.status(400).json({ error: `Send the file as "${field}".` });
			}
			return res.status(400).json({ error: err.message || "That upload could not be read." });
		});
	};
}

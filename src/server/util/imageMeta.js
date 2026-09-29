// Identifies an uploaded image from its own bytes and reads its dimensions.
//
// Deliberately not a library, and deliberately only PNG and JPEG: those are
// what a "here's a banner for my server" upload actually is, both can be
// identified in a few lines, and neither needs a native module — which on a
// portable Electron app means a prebuild per Electron version.
//
// Trusting the filename or the browser's Content-Type would mean writing
// whatever arrives to disk and serving it back with an image content type
// later, so the format is taken from the bytes and nothing else.

function readPng(buf) {
	const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (buf.length < 24) return null;
	for (let i = 0; i < signature.length; i += 1) {
		if (buf[i] !== signature[i]) return null;
	}
	// The IHDR chunk is required by the spec to come first.
	if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
	return {
		format: "png",
		ext: "png",
		contentType: "image/png",
		width: buf.readUInt32BE(16),
		height: buf.readUInt32BE(20),
	};
}

function readJpeg(buf) {
	if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

	// Walk the marker segments looking for a Start Of Frame, which is the only
	// place the real dimensions live. Progressive and arithmetic-coded variants
	// use different SOF markers, hence the range rather than just SOF0.
	let offset = 2;
	while (offset + 9 < buf.length) {
		if (buf[offset] !== 0xff) {
			offset += 1; // Padding between segments is legal.
			continue;
		}
		const marker = buf[offset + 1];
		if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
			offset += 2;
			continue;
		}
		const length = buf.readUInt16BE(offset + 2);
		const isSof =
			(marker >= 0xc0 && marker <= 0xc3) ||
			(marker >= 0xc5 && marker <= 0xc7) ||
			(marker >= 0xc9 && marker <= 0xcb) ||
			(marker >= 0xcd && marker <= 0xcf);
		if (isSof) {
			return {
				format: "jpeg",
				ext: "jpg",
				contentType: "image/jpeg",
				height: buf.readUInt16BE(offset + 5),
				width: buf.readUInt16BE(offset + 7),
			};
		}
		if (length < 2) return null; // Malformed; stop rather than loop forever.
		offset += 2 + length;
	}
	return null;
}

/** @returns {{format,ext,contentType,width,height}|null} null if it isn't a PNG or JPEG. */
export function sniffImage(buffer) {
	if (!Buffer.isBuffer(buffer) || buffer.length < 24) return null;
	const meta = readPng(buffer) ?? readJpeg(buffer);
	if (!meta || !(meta.width > 0) || !(meta.height > 0)) return null;
	return meta;
}

// The banner draws 120px tall at the full width of the dashboard container and
// is cropped to cover, so what matters is that it's wide and big enough not to
// look soft. Steam's own library_hero art is 1920x620, which is the shape the
// layout was designed around.
export const RECOMMENDED = { width: 1920, height: 620 };

/** Advice, never a rejection — it's the user's dashboard and their taste. */
export function describeFit({ width, height }) {
	const notes = [];
	if (width < 960) {
		notes.push(`It's only ${width}px wide, so it will look soft — 1920x620 is ideal.`);
	}
	const ratio = width / height;
	if (ratio < 2) {
		notes.push(
			`It's fairly tall for a banner (${width}x${height}), so the top and bottom will be cropped off.`,
		);
	} else if (ratio > 5) {
		notes.push(`It's very wide (${width}x${height}), so the sides will be cropped off.`);
	}
	return notes;
}

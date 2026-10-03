// Response headers that tell the browser what a page may and may not do. None of them change what the panel
// does for a person; they limit what a bug (or a hostile web page) could make a browser do with it.
//
// The interface is a single bundled script and stylesheet from this same address, with no external fonts,
// scripts or images, so the policy can be strict. Styles keep 'unsafe-inline' because the component library
// writes style attributes as it renders.

export const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"script-src 'self'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self' data:",
	"connect-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	// Nobody has a reason to show the panel inside another page, and doing so is how clickjacking works.
	"frame-ancestors 'none'",
].join("; ");

export function securityHeaders(req, res, next) {
	res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("Referrer-Policy", "no-referrer");
	// No camera, microphone, location or the like: the panel has no use for any of them.
	res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()");
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
	next();
}

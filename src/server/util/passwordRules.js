// What a password has to be to be accepted. Short and plain on purpose: the message names the problem and what
// to do about it, because the person reading it is usually setting a password in a hurry.
//
// The limit at the top is bcrypt's: it only ever looks at the first 72 bytes, so anything after that would be
// ignored without anyone knowing. Refusing it is better than quietly checking only part of what was typed.

export const MIN_LENGTH = 8;
export const MAX_BYTES = 72;

// Passwords that appear at the top of every list of leaked passwords, long enough to pass a length check.
const COMMON = new Set([
	"password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword",
	"12345678", "123456789", "1234567890", "123123123", "11111111", "00000000", "87654321", "987654321",
	"qwertyui", "qwerty123", "qwertyuiop", "1q2w3e4r", "1qaz2wsx", "abc12345", "abcd1234", "abcdefgh", "asdfghjk",
	"iloveyou", "letmein1", "welcome1", "welcome123", "admin123", "administrator", "changeme", "godlypanel",
	"minecraft", "gameserver", "football", "baseball", "superman", "trustno1", "monkey123", "dragon123",
]);

/**
 * @param {unknown} password
 * @param {string} [username]  the account's name; a password that is just the name is refused
 * @returns {string|null}  what is wrong with it, or null if it is fine
 */
export function passwordProblem(password, username = "") {
	if (typeof password !== "string" || password.length < MIN_LENGTH) {
		return `Choose a password of at least ${MIN_LENGTH} characters. A few random words work well and are easy to remember.`;
	}
	if (Buffer.byteLength(password, "utf8") > MAX_BYTES) {
		return `That password is too long: ${MAX_BYTES} bytes is the most that can be used (about ${MAX_BYTES} letters). Choose a shorter one.`;
	}
	const lowered = password.toLowerCase();
	if (COMMON.has(lowered) || /^(.)\1+$/.test(password)) {
		return "That password is one of the most common ones, and is among the first an attacker would try. Choose something less guessable, such as a few random words.";
	}
	if (username && lowered.replace(/[^a-z0-9]/g, "") === String(username).toLowerCase().replace(/[^a-z0-9]/g, "")) {
		return "The password can't be the same as the username.";
	}
	return null;
}

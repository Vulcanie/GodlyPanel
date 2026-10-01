// The admin role can be saved as Discord shows it when you mention it ("<@&123…>") or as the
// bare role id ("123…"). The status message needs the mention form to ping the role, and the
// bot needs the id to compare with a member's roles, so both are worked out from whatever was saved.

/** The role's id (digits only), or "" if what was saved holds none. */
export const roleIdOf = (value) => (/\d+/.exec(String(value ?? ""))?.[0] ?? "");

/** What to put in a message to ping the role, or "" when no role is set. */
export const roleMention = (value) => {
	const id = roleIdOf(value);
	return id ? `<@&${id}>` : "";
};

// Maps a server's `type` to its display title and banner artwork.
//
// The banner is served by our own API rather than hotlinked from Steam, so it
// works with no internet connection after the first fetch. What it resolves to
// is up to the user: artwork the panel found on Steam by itself, an image they
// uploaded, or nothing at all if they'd rather have a plain colour. The
// gradient sits underneath either way, so a card with no artwork still looks
// deliberate.

const CATALOG = {
	ark: { title: "ARK: Survival Ascended" },
	valheim: { title: "Valheim" },
	conan: { title: "Conan Exiles" },
	enshrouded: { title: "Enshrouded" },
	rune: { title: "RuneScape: Dragonwilds" },
	windrose: { title: "Windrose" },
	subsistence: { title: "Subsistence" },
	"7days": { title: "7 Days to Die" },
	palword: { title: "Palworld" },
	rust: { title: "Rust" },
	minecraft: {
		title: "Minecraft",
		gradient: "linear-gradient(135deg, #1f4d2c 0%, #2f7a3f 60%, #4caf50 100%)",
	},
};

const FALLBACK_GRADIENTS = [
	"linear-gradient(135deg, #3a1c71 0%, #6a2c8c 50%, #d76d77 100%)",
	"linear-gradient(135deg, #232526 0%, #414345 100%)",
	"linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
];

const titleCase = (str) =>
	str
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.split(" ")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");

function defaultGradient(key) {
	const hash = key.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
	return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

/** A user-chosen colour, as the gradient the card paints. */
export function colorGradient(color, color2) {
	if (!color) return null;
	return `linear-gradient(135deg, ${color} 0%, ${color2 || color} 100%)`;
}

/**
 * @param type     the server's `type` field
 * @param override this type's entry from GET /api/appearance, if loaded yet
 */
export function getGameInfo(type, override) {
	const key = (type || "").toLowerCase();
	const known = CATALOG[key];
	const mode = override?.mode ?? "auto";

	return {
		title: known?.title ?? titleCase(type || "Unknown"),
		// A solid colour is a deliberate choice, so don't put an image over it.
		// Otherwise ask for the banner and let the server decide what that is —
		// a 404 just means the gradient shows through.
		banner: mode === "color" ? null : `/api/art/${encodeURIComponent(key)}?v=${override?.version ?? 0}`,
		gradient:
			colorGradient(override?.color, override?.color2) ??
			known?.gradient ??
			defaultGradient(key),
	};
}

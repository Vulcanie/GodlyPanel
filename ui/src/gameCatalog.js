// Maps a server's `type` to its display title and banner artwork.
//
// Artwork is served by our own API rather than hotlinked from Steam, so it
// works with no internet connection after the first fetch. If it can't be
// retrieved at all, GameCard falls back to the gradient below.
const localBanner = (type) => `/api/art/${type}`;

const CATALOG = {
	ark: { title: "ARK: Survival Ascended", banner: localBanner("ark") },
	valheim: { title: "Valheim", banner: localBanner("valheim") },
	conan: { title: "Conan Exiles", banner: localBanner("conan") },
	enshrouded: { title: "Enshrouded", banner: localBanner("enshrouded") },
	rune: { title: "RuneScape: Dragonwilds", banner: localBanner("rune") },
	windrose: { title: "Windrose", banner: localBanner("windrose") },
	subsistence: { title: "Subsistence", banner: localBanner("subsistence") },
	"7days": { title: "7 Days to Die", banner: localBanner("7days") },
	palword: { title: "Palworld", banner: localBanner("palword") },
	minecraft: {
		title: "Minecraft",
		banner: null,
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

export function getGameInfo(type) {
	const key = (type || "").toLowerCase();
	if (CATALOG[key]) {
		// Every entry gets a gradient too, so a card still looks deliberate
		// when the artwork isn't available.
		const hash = key.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
		return {
			gradient: FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length],
			...CATALOG[key],
		};
	}

	const hash = key.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
	return {
		title: titleCase(type || "Unknown"),
		banner: null,
		gradient: FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length],
	};
}

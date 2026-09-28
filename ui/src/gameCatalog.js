// Maps a server's `type` to its display title and banner artwork.
// Steam art is hotlinked from Steam's own CDN (library_hero.jpg, 1920x620).
const steamBanner = (appid) =>
	`https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_hero.jpg`;

const CATALOG = {
	ark: { title: "ARK: Survival Ascended", banner: steamBanner(2399830) },
	valheim: { title: "Valheim", banner: steamBanner(892970) },
	conan: { title: "Conan Exiles", banner: steamBanner(440900) },
	enshrouded: { title: "Enshrouded", banner: steamBanner(1203620) },
	rune: { title: "RuneScape: Dragonwilds", banner: steamBanner(1374490) },
	windrose: { title: "Windrose", banner: steamBanner(3041230) },
	subsistence: { title: "Subsistence", banner: steamBanner(418030) },
	"7days": { title: "7 Days to Die", banner: steamBanner(251570) },
	palword: { title: "Palworld", banner: steamBanner(1623730) },
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
	if (CATALOG[key]) return CATALOG[key];

	const hash = key
		.split("")
		.reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
	return {
		title: titleCase(type || "Unknown"),
		banner: null,
		gradient: FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length],
	};
}

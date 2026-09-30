// What the conformance harness needs to know about each templated game. Everything a
// game may touch on this PC is listed here so the harness can refuse to start when a
// real server is in the way: `ports` are the only ports the test may use (all from the
// allowed set), `extraFree` are the game's own fixed defaults that must also be free.
//
// Allowed ports: 7100 (the test panel), 7101 (spare), 8892-8895 (the community's Conan
// ports, free while their Conan is off). Nothing else, ever.

export const PANEL_PORTS = [7100];

export const GAMES = {
	conan: {
		templateId: "conan",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["ConanSandboxServer","ConanSandboxServer-Win64-Shipping"],
		name: "Real Conan",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892, queryPort: 8894, rconPort: 8895 },
		ports: { udp: [8892, 8893, 8894], tcp: [8895] },
		extraFree: [],
		onlineMin: 12,
		logName: /^ConanSandbox\.log$/i,
	},
	valheim: {
		templateId: "valheim",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["valheim_server"],
		name: "Real Valheim",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892 },
		ports: { udp: [8892, 8893], tcp: [] },
		extraFree: [],
		onlineMin: 10,
		logName: /./,
	},
	enshrouded: {
		templateId: "enshrouded",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["enshrouded_server"],
		name: "Real Enshrouded",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892 },
		ports: { udp: [8892], tcp: [] },
		extraFree: [],
		onlineMin: 10,
		logName: /./,
	},
	subsistence: {
		templateId: "subsistence",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["Subsistence"],
		name: "Real Subsistence",
		params: { serverPassword: "TestJoin1", port: 8892 },
		ports: { udp: [8892], tcp: [] },
		// Its own Steam/query defaults; the user's real Subsistence is running on this PC.
		extraFree: [7777, 27015],
		onlineMin: 10,
		logName: /./,
	},
	dragonwilds: {
		templateId: "dragonwilds",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["RSDragonwildsServer","RSDragonwildsServer-Win64-Shipping"],
		name: "Real Dragonwilds",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892 },
		ports: { udp: [8892], tcp: [] },
		extraFree: [7777],
		onlineMin: 10,
		logName: /./,
	},
	windrose: {
		templateId: "windrose",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["WindroseServer-Win64-Shipping","WindroseServer"],
		name: "Real Windrose",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892 },
		ports: { udp: [8892], tcp: [] },
		extraFree: [7777, 7778],
		onlineMin: 10,
		logName: /./,
	},
	palworld: {
		templateId: "palworld",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["PalServer","PalServer-Win64-Shipping-Cmd","PalServer-Win64-Shipping"],
		name: "Real Palworld",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", rconPassword: "TestRcon1", port: 8892, queryPort: 8894, rconPort: 8895 },
		ports: { udp: [8892], tcp: [8894, 8895] },
		noLogFile: true,
		extraFree: [8211, 27015],
		onlineMin: 10,
		logName: /./,
	},
	"7days": {
		templateId: "7days",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["7DaysToDieServer","7DaysToDie"],
		name: "Real 7 Days",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892 },
		ports: { udp: [8892, 8893, 8894, 8895], tcp: [8892] },
		extraFree: [8080, 8081, 26900],
		onlineMin: 15,
		logName: /./,
	},
	"ark-ase": {
		templateId: "ark-ase",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["ShooterGameServer"],
		name: "Real ARK Evolved",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", rconPassword: "TestRcon1", mapCode: "TheIsland", port: 8892, queryPort: 8894, rconPort: 8895 },
		ports: { udp: [8892, 8893, 8894], tcp: [8895] },
		extraFree: [27015, 7777, 7778],
		onlineMin: 15,
		logName: /./,
	},
	"ark-asa": {
		templateId: "ark-asa",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["ArkAscendedServer"],
		name: "Real ARK Ascended",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", rconPassword: "TestRcon1", mapCode: "TheIsland_WP", clusterId: "TestCluster", port: 8892, queryPort: 8894, rconPort: 8895 },
		ports: { udp: [8892], tcp: [8894, 8895] },
		extraFree: [27015, 7777, 7778],
		onlineMin: 20,
		logName: /./,
	},
};

/** Games in the order they are run: small and quick first, so harness problems show up cheaply. */
export const ORDER = ["valheim", "enshrouded", "subsistence", "dragonwilds", "windrose", "palworld", "7days", "ark-ase", "ark-asa", "conan"];

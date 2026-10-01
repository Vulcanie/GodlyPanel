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
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892, telnetPort: 7101 },
		ports: { udp: [8892, 8894], tcp: [8892, 7101] },
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
		extraFree: [27015],
		probeCommands: ["ListPlayers", "KickPlayer 76561198000000000", "BanPlayer 76561198000000000", "UnbanPlayer 76561198000000000", "AllowPlayerToJoinNoCheck 76561198000000000", "DisallowPlayerToJoinNoCheck 76561198000000000", "ServerChat hello"],
		onlineMin: 15,
		logName: /./,
	},
	"ark-asa": {
		templateId: "ark-asa",
		// Programs this game runs. If any is already running on this PC (a real server), the game is skipped.
		programs: ["ArkAscendedServer"],
		name: "Real ARK Ascended",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", rconPassword: "TestRcon1", mapCode: "TheIsland_WP", clusterId: "TestCluster", port: 8892, queryPort: 8894, rconPort: 8895 },
		ports: { udp: [8892, 8894], tcp: [8895] },
		extraFree: [27015],
		probeCommands: ["ListPlayers", "KickPlayer 76561198000000000", "BanPlayer 76561198000000000", "UnbanPlayer 76561198000000000", "AllowPlayerToJoinNoCheck 76561198000000000", "DisallowPlayerToJoinNoCheck 76561198000000000", "ServerChat hello"],
		onlineMin: 20,
		logName: /./,
	},
	satisfactory: {
		templateId: "satisfactory",
		programs: ["FactoryServer", "FactoryServer-Win64-Shipping-Cmd"],
		name: "Real Satisfactory",
		params: { port: 8892, queryPort: 8894 },
		ports: { udp: [8892], tcp: [8892, 8894] },
		extraFree: [],
		onlineMin: 8,
		logName: /./,
	},
	sotf: {
		templateId: "sotf",
		programs: ["SonsOfTheForestDS"],
		name: "Real Sons of the Forest",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892, queryPort: 8895 },
		ports: { udp: [8892, 8894, 8895], tcp: [] },
		extraFree: [8766, 27016, 9700],
		portsWaitMin: 2,
		onlineMin: 6,
		logName: /./,
	},
	corekeeper: {
		templateId: "corekeeper",
		programs: ["CoreKeeperServer"],
		name: "Real Core Keeper",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892 },
		ports: { udp: [8892], tcp: [] },
		extraFree: [27015],
		onlineMin: 5,
		logName: /./,
	},
	vrising: {
		templateId: "vrising",
		programs: ["VRisingServer"],
		name: "Real V Rising",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", port: 8892, queryPort: 8894 },
		ports: { udp: [8892, 8894], tcp: [] },
		extraFree: [9876, 9877],
		onlineMin: 6,
		logName: /./,
	},
	zomboid: {
		templateId: "zomboid",
		programs: [],
		name: "Real Zomboid",
		params: { sessionName: "GodlyTest", serverPassword: "TestJoin1", rconPassword: "TestRcon1", port: 8892, rconPort: 7101, maxMemoryGB: 3 },
		ports: { udp: [8892, 8893], tcp: [7101] },
		extraFree: [16261, 16262, 27015, 8766, 8767],
		probeCommands: ["players", "help", "save", "kickuser GpNobody", "banuser GpNobody", "unbanuser GpNobody", "adduser GpNobody pw", "servermsg \"hello\""],
		onlineMin: 10,
		logName: /./,
	},
	rust: {
		templateId: "rust",
		programs: ["RustDedicated"],
		name: "Real Rust",
		params: { sessionName: "GodlyTest", rconPassword: "TestRcon1", port: 8892, queryPort: 8894, rconPort: 7101, worldSize: 1000 },
		ports: { udp: [8892, 8894], tcp: [7101] },
		extraFree: [28015, 28016, 28017],
		probeCommands: ["status", "playerlist", "server.save", "kick 76561198000000000", "ban 76561198000000000", "unban 76561198000000000", "say hello"],
		onlineMin: 12,
		logName: /./,
	},
};

/** Games in the order they are run: small and quick first, so harness problems show up cheaply. */
export const ORDER = ["valheim", "enshrouded", "subsistence", "dragonwilds", "windrose", "palworld", "7days", "ark-ase", "ark-asa", "conan", "rust", "zomboid", "satisfactory", "vrising", "corekeeper", "sotf"];

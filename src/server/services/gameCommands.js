// What each game's console understands. Getting one wrong is silent (an unknown
// command is ignored), so they live in one place rather than being repeated in
// the stop, update, restart and backup code.

/**
 * A command that forces a world save, sent before a stop, an update or a live
 * backup. Only games with a real, documented one are listed; for the rest this is
 * null and the caller does without.
 */
export function getSaveCommand(server) {
	switch (server.type) {
		case "ark":
			return "saveworld";
		case "minecraft":
			return "save-all flush";
		// Conan's RCON has no save command; its Shutdown saves as it exits, which is
		// why Stop uses that and nothing here.
		case "conan":
			return null;
		case "Palword":
			return "Save";
		case "rust":
			return "server.save";
		case "zomboid":
			return "save";
		default:
			return null;
	}
}

/**
 * Commands that stop a game writing its world while a live backup copies it, and let it carry on after.
 * Only Minecraft has them: it keeps saving in the background, and a chunk caught half-written is a damaged world.
 * Whatever "off" does, "on" must follow, even when the copy fails.
 */
export function getSavePauseCommands(server) {
	return server.type === "minecraft" ? { off: "save-off", on: "save-on" } : null;
}

/** The in-game broadcast for a warning message, or null when the game has none. */
export function getBroadcastCommand(server, message) {
	switch (server.type) {
		case "ark":
			return `serverchat ${message}`;
		case "minecraft":
			return `say ${message}`;
		case "Palword":
			return `Broadcast ${message}`;
		case "rust":
			return `say ${message}`;
		case "zomboid":
			return `servermsg "${message.replace(/"/g, "'")}"`;
		case "conan":
			return `broadcast ${message}`;
		default:
			return null;
	}
}

/**
 * Commands the game runs without answering at all (checked on a real Rust server: "say" gets no
 * reply, so waiting for one times out even though the message went out).
 */
export function answersNothing(server, command) {
	return server.type === "rust" && /^say /.test(command);
}

/** The RCON command that shuts the server down cleanly. */
export function stopCommandFor(server) {
	switch (server.type) {
		case "minecraft":
			return "stop";
		case "conan":
			return "Shutdown";
		case "rust":
		case "zomboid":
			return "quit";
		default:
			return "DoExit";
	}
}

import React from "react";
import { Alert } from "@mui/material";

/**
 * Spells out every port a game will use, including the ones it takes for itself
 * next to the game port, so nothing needed is left closed on the router, and
 * nothing is accidentally chosen for something else. Shown while creating a
 * server and while editing its ports.
 *
 * @param implicit  [{ offset, label }] ports taken relative to the game port
 */
// `hideClash`: the editor already lists clashes from its own live check.
function PortsToOpen({ game, query, rcon, implicit = [], gameName, hideClash = false }) {
	const gamePort = Number(game);
	if (implicit.length === 0 || !Number.isInteger(gamePort) || gamePort <= 0) return null;

	const queryPort = Number(query);
	const udp = [gamePort, ...implicit.map((i) => gamePort + i.offset)];
	if (Number.isInteger(queryPort) && queryPort > 0 && !udp.includes(queryPort)) udp.push(queryPort);

	const clash = hideClash ? null : implicit.find((i) => queryPort === gamePort + i.offset || Number(rcon) === gamePort + i.offset);

	return (
		<Alert severity={clash ? "error" : "info"} sx={{ my: 1 }}>
			{clash ? (
				<>
					Port {gamePort + clash.offset} is used by {gameName} itself ({clash.label}), so it can't be used for
					anything else. Pick a different query or RCON port.
				</>
			) : (
				<>
					<strong>Open these UDP ports</strong> on your router and Windows Firewall so people can join:{" "}
					<strong>{[...udp].sort((x, y) => x - y).join(", ")}</strong>.
					{implicit.map((i) => (
						<span key={i.offset}>
							{" "}
							Port {gamePort + i.offset} is {gameName}'s own ({i.label}); it is chosen for you.
						</span>
					))}
					{rcon ? " The RCON port only needs to work on this PC." : ""}
				</>
			)}
		</Alert>
	);
}

export default PortsToOpen;

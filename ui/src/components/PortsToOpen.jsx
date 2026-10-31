import React from "react";
import { Alert } from "@mui/material";
import { t, useT } from "../i18n";

/**
 * The port the game keeps for itself that the query or RCON port was set to, if
 * any. The create button stays disabled while there is one. Every game keeps the
 * port after its game port free (some use it, the rest might), so this applies to
 * all of them.
 */
export function findPortClash(implicit = [], { port, queryPort, rconPort } = {}) {
	const gamePort = Number(port);
	if (!Number.isInteger(gamePort) || gamePort <= 0) return null;
	return implicit.find((i) => Number(queryPort) === gamePort + i.offset || Number(rconPort) === gamePort + i.offset) ?? null;
}

/**
 * Spells out every port a game will use, including the ones it takes for itself
 * next to the game port, so nothing needed is left closed on the router, and
 * nothing is accidentally chosen for something else. Shown while creating a
 * server and while editing its ports.
 *
 * @param implicit  [{ offset, label, precaution }] ports kept free relative to the
 *                  game port. `precaution` ones are reserved in case the game uses
 *                  them, so they aren't listed as ports to open.
 */
// `hideClash`: the editor already lists clashes from its own live check.
function PortsToOpen({ game, query, rcon, implicit = [], gameName, hideClash = false }) {
	useT();
	const gamePort = Number(game);
	if (implicit.length === 0 || !Number.isInteger(gamePort) || gamePort <= 0) return null;

	const clash = hideClash ? null : findPortClash(implicit, { port: gamePort, queryPort: query, rconPort: rcon });
	const known = implicit.filter((i) => !i.precaution);

	if (clash) {
		return (
			<Alert severity="error" sx={{ my: 1 }}>
				{clash.precaution
					? t("ports.clashPrecaution", { port: gamePort + clash.offset, game: gameName })
					: t("ports.clashUsed", { port: gamePort + clash.offset, game: gameName, label: clash.label })}
			</Alert>
		);
	}
	if (known.length === 0) return null;

	const queryPort = Number(query);
	const udp = [gamePort, ...known.map((i) => gamePort + i.offset)];
	if (Number.isInteger(queryPort) && queryPort > 0 && !udp.includes(queryPort)) udp.push(queryPort);

	return (
		<Alert severity="info" sx={{ my: 1 }}>
			<strong>{t("ports.openUdp")}</strong> {t("ports.openUdpRest")}{" "}
			<strong>{[...udp].sort((x, y) => x - y).join(", ")}</strong>.
			{known.map((i) => (
				<span key={i.offset}>
					{" "}
					{t("ports.ownPort", { port: gamePort + i.offset, game: gameName, label: i.label })}
				</span>
			))}
			{rcon ? ` ${t("ports.rconLocal")}` : ""}
		</Alert>
	);
}

export default PortsToOpen;

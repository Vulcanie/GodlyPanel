import React from "react";
import { Box } from "@mui/material";
import { t, useT } from "../../i18n";

/**
 * A status light: green with a soft pulse when something is live, amber when it is busy, grey when it is off.
 * `state` is "online" | "busy" | "offline".
 */
function LiveDot({ state = "offline", size = 10, pulse = true, sx }) {
	useT();
	const colour = (t) => t.palette.status[state] ?? t.palette.status.offline;
	// Read out by screen readers. The words are the states' own names, in lower case.
	const word = state === "online" ? t("shell.state.online") : state === "busy" ? t("shell.state.busy") : state === "offline" ? t("shell.state.offline") : state;
	return (
		<Box
			component="span"
			role="img"
			aria-label={word}
			sx={{
				position: "relative",
				display: "inline-block",
				width: size,
				height: size,
				borderRadius: "50%",
				flexShrink: 0,
				backgroundColor: colour,
				boxShadow: state === "offline" ? "none" : (t) => t.custom.glow(colour(t)),
				"&::after":
					pulse && state !== "offline"
						? { content: '""', position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: colour, animation: "gp-pulse 2.2s ease-out infinite" }
						: undefined,
				...sx,
			}}
		/>
	);
}

export default React.memo(LiveDot);

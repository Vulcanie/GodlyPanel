import React from "react";
import { LinearProgress } from "@mui/material";
import { amber, green, red } from "@mui/material/colors";

// One progress bar and one set of "getting full" thresholds for every meter —
// the system RAM/CPU bar and each server's heap bar used to carry their own
// copies of both.
export function levelColor(percent) {
	if (percent >= 90) return red[500];
	if (percent >= 75) return amber[600];
	return green[500];
}

function LevelBar({ percent, height = 8, width }) {
	return (
		<LinearProgress
			variant="determinate"
			value={Math.min(percent, 100)}
			sx={{
				width,
				height,
				borderRadius: height / 2,
				backgroundColor: "action.selected",
				"& .MuiLinearProgress-bar": { backgroundColor: levelColor(percent) },
			}}
		/>
	);
}

export default LevelBar;

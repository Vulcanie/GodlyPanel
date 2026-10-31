import React from "react";
import { LinearProgress } from "@mui/material";
import { t, useT } from "../i18n";

// One progress bar and one set of "getting full" thresholds for every meter —
// the system RAM/CPU bar and each server's heap bar used to carry their own
// copies of both.

/** The theme colour for a meter that is this full: a palette path such as "warning.main", so both themes get their own shade. */
export function levelColor(percent) {
	if (percent >= 90) return "error.main";
	if (percent >= 75) return "warning.main";
	return "success.main";
}

function LevelBar({ percent, height = 8, width }) {
	// Re-renders this bar when the language changes, so the aria-label below switches with it.
	useT();
	const value = Number.isFinite(Number(percent)) ? Math.max(0, Math.min(Number(percent), 100)) : 0;
	return (
		<LinearProgress
			variant="determinate"
			value={value}
			aria-label={t("common.percentFull", { percent: Math.round(value) })}
			sx={{
				width,
				height,
				borderRadius: height / 2,
				backgroundColor: "action.selected",
				"& .MuiLinearProgress-bar": { backgroundColor: levelColor(value), borderRadius: height / 2 },
			}}
		/>
	);
}

export default LevelBar;

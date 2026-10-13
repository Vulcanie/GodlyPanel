import React from "react";
import { Box, Chip } from "@mui/material";
import InfoTip from "../InfoTip";

/**
 * A control with its (i) beside it. The control keeps the full width and the (i) sits at its right edge, so a label that is
 * printed inside the control (a text box, a drop-down) still has its explanation within reach without taking a line of its own.
 *
 * `info`     the help id for the (i); nothing is drawn when it is missing.
 * `restart`  shows a small "Restart needed" chip: the saved value only takes effect after the panel restarts.
 * `center`   centre the (i) on the control (for a switch or a heading) instead of lining it up with a text box's first line.
 */
function TipRow({ info, restart = false, center = false, children, sx }) {
	return (
		<Box sx={{ display: "flex", alignItems: center ? "center" : "flex-start", gap: 0.5, minWidth: 0, ...sx }}>
			<Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
			{info && <InfoTip id={info} sx={{ ml: 0, mt: center ? 0 : 0.75 }} />}
			{restart && (
				<Chip
					size="small"
					variant="outlined"
					label="Restart needed"
					title="Takes effect after a restart"
					sx={{ alignSelf: center ? "center" : "flex-start", mt: center ? 0 : 0.75, height: 22, fontSize: 11 }}
				/>
			)}
		</Box>
	);
}

export default TipRow;

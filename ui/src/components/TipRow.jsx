import React from "react";
import { Box } from "@mui/material";
import InfoTip from "./InfoTip";

/**
 * A control with its (i) beside it. The icon sits outside the control (not inside its label) so that clicking it never toggles a
 * switch or checkbox, and so the control keeps a clean accessible name.
 */
function TipRow({ id, text, children, sx }) {
	return (
		<Box sx={{ display: "inline-flex", alignItems: "center", maxWidth: "100%", minWidth: 0, ...sx }}>
			{children}
			<InfoTip id={id} text={text} />
		</Box>
	);
}

export default TipRow;

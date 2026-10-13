import React from "react";
import { Box } from "@mui/material";
import EmptyState from "./ui/EmptyState";

/** The standard empty state, with less air around it, for a panel that sits inside a page rather than being the page. */
function CompactEmpty({ icon, title, children, action }) {
	return (
		<Box sx={{ "& > .MuiBox-root": { py: 4 } }}>
			<EmptyState icon={icon} title={title} action={action}>
				{children}
			</EmptyState>
		</Box>
	);
}

export default CompactEmpty;

import React from "react";
import { Box, Paper, Typography } from "@mui/material";

/** A titled card: the standard container for a group of related controls. */
function SectionCard({ title, subtitle, icon, actions, children, sx, contentSx, danger = false, id }) {
	return (
		<Paper variant="outlined" id={id} sx={{ borderRadius: 4, borderColor: danger ? "error.main" : "divider", overflow: "hidden", mb: 2, ...sx }}>
			{(title || actions) && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.75, borderBottom: 1, borderColor: "divider" }}>
					{icon && <Box sx={{ display: "grid", placeItems: "center", color: danger ? "error.main" : "primary.main" }}>{icon}</Box>}
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Typography variant="subtitle1" sx={{ color: danger ? "error.main" : undefined }}>
							{title}
						</Typography>
						{subtitle && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{subtitle}
							</Typography>
						)}
					</Box>
					{actions}
				</Box>
			)}
			<Box sx={{ p: 2.5, ...contentSx }}>{children}</Box>
		</Paper>
	);
}

export default SectionCard;

import React from "react";
import { Box, Typography } from "@mui/material";

/** The heading of a page: a title, a line saying what the page is for, and the page's main actions on the right. */
function PageHeader({ title, subtitle, actions, icon, sx }) {
	return (
		<Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3, ...sx }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
				{icon && (
					<Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: "grid", placeItems: "center", color: "primary.main", background: (t) => t.custom.gradientSoft, flexShrink: 0 }}>{icon}</Box>
				)}
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="h5" component="h1" noWrap>
						{title}
					</Typography>
					{subtitle && (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{subtitle}
						</Typography>
					)}
				</Box>
			</Box>
			{actions && <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>{actions}</Box>}
		</Box>
	);
}

export default PageHeader;

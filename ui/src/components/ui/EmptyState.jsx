import React from "react";
import { Box, Typography } from "@mui/material";

function EmptyState({ icon, title, children, action }) {
	return (
		<Box sx={{ textAlign: "center", py: 8, px: 2, color: "text.secondary" }}>
			{icon && <Box sx={{ display: "inline-grid", placeItems: "center", width: 64, height: 64, borderRadius: 4, mb: 2, color: "primary.main", background: (t) => t.custom.gradientSoft }}>{icon}</Box>}
			<Typography variant="h6" sx={{ color: "text.primary" }}>
				{title}
			</Typography>
			{children && <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 460, mx: "auto" }}>{children}</Typography>}
			{action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
		</Box>
	);
}

export default EmptyState;

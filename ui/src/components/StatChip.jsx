import React from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import { copyToClipboard } from "../utils/clipboard";

// A small labeled pill for one piece of server data (Players, Ping, an
// address, etc). Independent flex items instead of table cells means a row
// of these wraps naturally to multiple lines on a narrow viewport rather
// than clipping or forcing horizontal scroll.
function StatChip({ icon, label, value, copyable }) {
	const [tooltip, setTooltip] = React.useState("Copy");

	const handleCopy = (e) => {
		e.stopPropagation();
		copyToClipboard(value, setTooltip);
		setTimeout(() => setTooltip("Copy"), 1500);
	};

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 0.5,
				px: 1,
				py: 0.5,
				borderRadius: 999,
				bgcolor: "rgba(255,255,255,0.06)",
				border: "1px solid rgba(255,255,255,0.08)",
				transition: "background-color 0.15s ease",
				"&:hover": {
					bgcolor: "rgba(255,255,255,0.1)",
				},
			}}
		>
			{icon}
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="caption">{value}</Typography>
			{copyable && (
				<Tooltip title={tooltip}>
					<IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
						<ContentCopyIcon sx={{ fontSize: 13 }} />
					</IconButton>
				</Tooltip>
			)}
		</Box>
	);
}

export default StatChip;

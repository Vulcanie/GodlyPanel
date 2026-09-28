import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { amber, green, red } from "@mui/material/colors";

function levelColor(percent) {
	if (percent >= 90) return red[500];
	if (percent >= 75) return amber[600];
	return green[500];
}

// Compact JVM heap usage bar for a single Minecraft server tile — distinct
// from the CPU/RAM StatChip (which reflects the OS process's working set),
// this is the actual -Xmx ceiling the server can hit before GC pressure
// turns into player-visible lag.
function HeapBar({ usedMB, maxMB, percent }) {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 0.75,
				px: 1,
				py: 0.5,
				borderRadius: 999,
				bgcolor: "rgba(255,255,255,0.06)",
				border: "1px solid rgba(255,255,255,0.08)",
			}}
		>
			<Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
				Heap
			</Typography>
			<LinearProgress
				variant="determinate"
				value={Math.min(percent, 100)}
				sx={{
					width: 60,
					height: 6,
					borderRadius: 3,
					backgroundColor: "rgba(255,255,255,0.1)",
					"& .MuiLinearProgress-bar": { backgroundColor: levelColor(percent) },
				}}
			/>
			<Typography variant="caption" sx={{ flexShrink: 0 }}>
				{(usedMB / 1024).toFixed(1)}/{(maxMB / 1024).toFixed(1)} GB ({percent}%)
			</Typography>
		</Box>
	);
}

export default HeapBar;

import React from "react";
import { Box, Typography } from "@mui/material";
import LevelBar from "./LevelBar";

// Compact JVM heap usage bar for a single Minecraft server tile — distinct
// from the CPU/RAM StatChip (which reflects the OS process's working set),
// this is the actual -Xmx ceiling the server can hit before GC pressure
// turns into player-visible lag.
const gb = (mb) => (Number(mb) / 1024).toFixed(1);

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
				bgcolor: (t) => t.custom.hover,
				border: (t) => `1px solid ${t.palette.divider}`,
			}}
		>
			<Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
				Heap
			</Typography>
			<LevelBar percent={percent} height={6} width={60} />
			<Typography variant="caption" sx={{ flexShrink: 0, fontFamily: (t) => t.custom.mono, fontSize: 11 }}>
				{gb(usedMB)}/{gb(maxMB)} GB ({Math.round(Number(percent) || 0)}%)
			</Typography>
		</Box>
	);
}

export default HeapBar;

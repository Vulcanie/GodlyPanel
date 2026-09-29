import React from "react";
import { Box, Typography } from "@mui/material";
import LevelBar from "./LevelBar";

function Meter({ label, percent, detail }) {
	return (
		<Box sx={{ flex: 1, minWidth: 180 }}>
			<Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
				<Typography variant="body2">{label}</Typography>
				<Typography variant="body2" color="text.secondary">
					{detail}
				</Typography>
			</Box>
			<LevelBar percent={percent} />
		</Box>
	);
}

// Machine-wide RAM/CPU reading, updated live over SSE (see App.js's
// "system_stats" handler) — not per-server, just "is the box under
// pressure right now."
function SystemStatsBar({ stats }) {
	if (!stats || stats.totalMemMB == null) return null;

	return (
		<Box
			sx={{
				display: "flex",
				flexWrap: "wrap",
				gap: 3,
				p: 2,
				mb: 3,
				borderRadius: 2,
				backgroundColor: "rgba(255,255,255,0.03)",
				border: "1px solid rgba(255,255,255,0.08)",
			}}
		>
			<Meter
				label="RAM"
				percent={stats.usedMemPercent}
				detail={`${(stats.usedMemMB / 1024).toFixed(1)} / ${(stats.totalMemMB / 1024).toFixed(1)} GB (${stats.usedMemPercent}%)`}
			/>
			<Meter label="CPU" percent={stats.cpuPercent} detail={`${stats.cpuPercent}%`} />
		</Box>
	);
}

export default SystemStatsBar;

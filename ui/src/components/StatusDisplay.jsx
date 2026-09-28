import React from "react";
import { Card, CardContent, Typography, Chip } from "@mui/material";
import { green, red } from "@mui/material/colors";

// This component displays the live status of a server on the config page.
function StatusDisplay({ serverStatus }) {
	if (!serverStatus) {
		return null; // Don't render anything if there's no status data
	}

	const isOnline = serverStatus.online;

	return (
		<Card sx={{ width: { xs: "100%", md: 240 } }}>
			<CardContent>
				<Typography variant="h6" gutterBottom>
					Live Status
				</Typography>
				<Chip
					label={isOnline ? "ONLINE" : "OFFLINE"}
					sx={{
						backgroundColor: isOnline ? green[500] : red[500],
						color: "white",
						mb: 1,
						fontWeight: "bold",
					}}
				/>
				<Typography variant="body2">
					<strong>Players:</strong> {serverStatus.playerCount ?? 0}
				</Typography>
				{isOnline && serverStatus.ping != null && (
					<Typography variant="body2">
						<strong>Ping:</strong> {serverStatus.ping} ms
					</Typography>
				)}
			</CardContent>
		</Card>
	);
}

export default StatusDisplay;

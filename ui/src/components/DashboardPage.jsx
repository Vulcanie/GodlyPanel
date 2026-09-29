import React from "react";
import {
	Box,
	Typography,
	FormControlLabel,
	Switch,
	Button,
	CircularProgress,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import GameCard from "./GameCard";
import SystemStatsBar from "./SystemStatsBar";

// Groups the flat servers map into { [type]: [{name, ...status}] }
function groupByType(servers) {
	const groups = {};
	for (const [name, status] of Object.entries(servers)) {
		const type = status.type || "unknown";
		if (!groups[type]) groups[type] = [];
		groups[type].push({ name, ...status });
	}
	return groups;
}

// This component displays the main list of game sections, each collapsible
// and listing its server instances.
function DashboardPage({
	servers,
	systemStats,
	serverStats,
	loading,
	onNavigate,
	onCreateServer,
	apiError,
	userRole,
	appearance,
}) {
	const [showOffline, setShowOffline] = React.useState(true);
	// Only ever set by an explicit user click — see isGroupOpen below for how
	// an unset entry's default is derived instead of stored, so newly-added
	// game types and live online/offline changes are picked up for free.
	const [openGroups, setOpenGroups] = React.useState({});

	// groupByType previously recomputed on every render, including
	// systemStats/serverStats-only SSE ticks where `servers` itself hadn't
	// changed at all. Memoizing it means those ticks return the exact same
	// object/array references, which — combined with React.memo on GameCard —
	// lets a systemStats-only tick skip re-rendering every card entirely.
	const groups = React.useMemo(() => groupByType(servers), [servers]);
	const gameTypes = Object.keys(groups).filter((type) =>
		showOffline ? true : groups[type].some((s) => s.online),
	);

	// A group with any online instance defaults open (useful at a glance
	// without a wall of expanded empty sections); fully-offline groups
	// default closed. A manual toggle always wins once made.
	const isGroupOpen = (type) =>
		type in openGroups ? openGroups[type] : groups[type].some((s) => s.online);

	const toggleGroup = (type) => {
		setOpenGroups((prev) => ({ ...prev, [type]: !isGroupOpen(type) }));
	};

	const expandAll = () => {
		setOpenGroups(Object.fromEntries(gameTypes.map((t) => [t, true])));
	};

	const collapseAll = () => {
		setOpenGroups(Object.fromEntries(gameTypes.map((t) => [t, false])));
	};

	return (
		<>
			{apiError ? (
				<Typography align="center" color="error" sx={{ mb: 2 }}>
					API error: {apiError}
				</Typography>
			) : null}

			<Typography align="center" sx={{ color: grey[500], mb: 2 }}>
				Live updates enabled (SSE)
			</Typography>

			<SystemStatsBar stats={systemStats} />

			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					justifyContent: "flex-end",
					alignItems: "center",
					gap: { xs: 1, sm: 2 },
					mb: 2,
				}}
			>
				{userRole === "admin" && (
					<Button
						variant="contained"
						color="success"
						startIcon={<AddIcon />}
						onClick={onCreateServer}
					>
						Create Server
					</Button>
				)}
				<Button size="small" onClick={expandAll}>
					Expand All
				</Button>
				<Button size="small" onClick={collapseAll}>
					Collapse All
				</Button>
				<FormControlLabel
					control={
						<Switch
							checked={showOffline}
							onChange={(e) => setShowOffline(e.target.checked)}
						/>
					}
					label="Show Offline"
				/>
			</Box>

			{loading ? (
				<CircularProgress sx={{ display: "block", mx: "auto" }} />
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2 } }}>
					{gameTypes.map((type) => (
						<GameCard
							key={type}
							gameType={type}
							instances={groups[type]}
							onNavigate={onNavigate}
							userRole={userRole}
							showOffline={showOffline}
							serverStats={serverStats}
							isOpen={isGroupOpen(type)}
							onToggle={() => toggleGroup(type)}
							appearance={appearance?.[type.toLowerCase()]}
						/>
					))}
				</Box>
			)}
		</>
	);
}

export default DashboardPage;

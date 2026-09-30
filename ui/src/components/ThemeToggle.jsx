import React from "react";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { BrightnessAuto as AutoIcon, DarkMode as DarkIcon, LightMode as LightIcon } from "@mui/icons-material";
import { useThemeMode } from "../ThemeMode";

const OPTIONS = [
	{ mode: "system", label: "Match Windows", icon: <AutoIcon fontSize="small" /> },
	{ mode: "light", label: "Light", icon: <LightIcon fontSize="small" /> },
	{ mode: "dark", label: "Dark", icon: <DarkIcon fontSize="small" /> },
];

/** A small button in the header that picks light, dark or follow-Windows. */
function ThemeToggle() {
	const { mode, resolved, setMode } = useThemeMode();
	const [anchor, setAnchor] = React.useState(null);
	const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[0];
	return (
		<>
			<Tooltip title={`Appearance: ${current.label}`}>
				<IconButton size="small" aria-label="Appearance" onClick={(e) => setAnchor(e.currentTarget)}>
					{mode === "system" ? <AutoIcon fontSize="small" /> : resolved === "dark" ? <DarkIcon fontSize="small" /> : <LightIcon fontSize="small" />}
				</IconButton>
			</Tooltip>
			<Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
				{OPTIONS.map((o) => (
					<MenuItem
						key={o.mode}
						selected={o.mode === mode}
						onClick={() => {
							setMode(o.mode);
							setAnchor(null);
						}}
					>
						<ListItemIcon>{o.icon}</ListItemIcon>
						<ListItemText>{o.label}</ListItemText>
					</MenuItem>
				))}
			</Menu>
		</>
	);
}

export default ThemeToggle;

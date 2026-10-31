import React from "react";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { BrightnessAuto as AutoIcon, DarkMode as DarkIcon, LightMode as LightIcon } from "@mui/icons-material";
import { useThemeMode } from "../ThemeMode";
import { t, useT } from "../i18n";

const OPTIONS = [
	{ mode: "system", icon: <AutoIcon fontSize="small" /> },
	{ mode: "light", icon: <LightIcon fontSize="small" /> },
	{ mode: "dark", icon: <DarkIcon fontSize="small" /> },
];

function optionLabel(mode) {
	if (mode === "light") return t("theme.light");
	if (mode === "dark") return t("theme.dark");
	return t("theme.matchWindows");
}

/** A small button in the header that picks light, dark or follow-Windows. */
function ThemeToggle() {
	useT();
	const { mode, resolved, setMode } = useThemeMode();
	const [anchor, setAnchor] = React.useState(null);
	const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[0];
	return (
		<>
			<Tooltip title={t("theme.tooltip", { mode: optionLabel(current.mode) })}>
				<IconButton size="small" aria-label={t("common.appearance")} aria-haspopup="menu" onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: "text.secondary", "&:hover": { color: "text.primary", bgcolor: (t) => t.custom.hover } }}>
					{mode === "system" ? <AutoIcon fontSize="small" /> : resolved === "dark" ? <DarkIcon fontSize="small" /> : <LightIcon fontSize="small" />}
				</IconButton>
			</Tooltip>
			<Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { borderRadius: 3, border: 1, borderColor: "divider", minWidth: 180 } } }}>
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
						<ListItemText>{optionLabel(o.mode)}</ListItemText>
					</MenuItem>
				))}
			</Menu>
		</>
	);
}

export default ThemeToggle;

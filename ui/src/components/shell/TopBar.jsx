import React from "react";
import { Box, Breadcrumbs, ButtonBase, IconButton, Typography } from "@mui/material";
import { Menu as MenuIcon, Search as SearchIcon } from "@mui/icons-material";
import { t, useT } from "../../i18n";

function pageTitle(page) {
	if (page === "dashboard") return t("common.dashboard");
	if (page === "createServer") return t("common.createAServer");
	if (page === "settings") return t("common.settings");
	if (page === "users") return t("common.people");
	if (page === "roles") return t("common.roles");
	if (page === "activity") return t("common.activity");
	return "";
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** The strip across the top of the page: where you are, and the way into the command palette. */
function TopBar({ nav, go, onMenu, onPalette, showPalette }) {
	useT();
	const onServer = nav.page === "config" || nav.page === "batchEditor";
	return (
		<Box
			sx={{
				position: "sticky",
				top: 0,
				zIndex: (t) => t.zIndex.appBar,
				display: "flex",
				alignItems: "center",
				gap: 1.5,
				px: { xs: 2, md: 4 },
				height: 56,
				backdropFilter: "blur(14px)",
				backgroundColor: (t) => t.custom.glass,
				borderBottom: 1,
				borderColor: "divider",
			}}
		>
			<IconButton onClick={onMenu} aria-label={t("shell.openMenu")} sx={{ display: { md: "none" } }}>
				<MenuIcon />
			</IconButton>

			<Breadcrumbs separator="›" sx={{ flex: 1, minWidth: 0, "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" } }}>
				{onServer ? (
					[
						<ButtonBase key="d" onClick={() => go("dashboard", null)} sx={{ color: "text.secondary", fontSize: 14, borderRadius: 1 }}>
							{t("common.dashboard")}
						</ButtonBase>,
						<ButtonBase key="s" onClick={() => go("config", nav.server)} sx={{ color: nav.page === "batchEditor" ? "text.secondary" : "text.primary", fontWeight: 600, fontSize: 14, borderRadius: 1 }}>
							{nav.server}
						</ButtonBase>,
						nav.page === "batchEditor" && (
							<Typography key="b" variant="body2" sx={{ fontWeight: 600 }}>
								{t("shell.launchScript")}
							</Typography>
						),
					].filter(Boolean)
				) : (
					<Typography variant="body2" sx={{ fontWeight: 600 }}>
						{pageTitle(nav.page)}
					</Typography>
				)}
			</Breadcrumbs>

			{showPalette && (
				<ButtonBase
					onClick={onPalette}
					aria-label={t("shell.searchOrJump")}
					data-testid="open-palette"
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1,
						px: 1.5,
						height: 36,
						minWidth: { sm: 240 },
						borderRadius: 2.5,
						border: 1,
						borderColor: "divider",
						color: "text.secondary",
						bgcolor: (t) => t.custom.hover,
						justifyContent: "flex-start",
						"&:hover": { borderColor: "primary.main" },
					}}
				>
					<SearchIcon sx={{ fontSize: 18 }} />
					<Typography variant="body2" sx={{ flex: 1, textAlign: "left", display: { xs: "none", sm: "block" } }}>
						{t("shell.searchOrJumpText")}
					</Typography>
					<Box component="kbd" sx={{ display: { xs: "none", sm: "inline" }, fontFamily: "inherit", fontSize: 11, px: 0.75, py: 0.1, borderRadius: 1, border: 1, borderColor: "divider" }}>
						{isMac ? "⌘" : "Ctrl"} K
					</Box>
				</ButtonBase>
			)}
		</Box>
	);
}

export default TopBar;

import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ThemeToggle from "./ThemeToggle";

// The full-screen frame around the sign-in page and the first-run wizard: the same colour wash as the rest of the panel, two soft
// glows drifting behind a centred glass card, the logo and the name. Kept in one place so both screens feel like one product.

const GRADIENT_TEXT = {
	backgroundImage: (t) => t.custom.gradient,
	WebkitBackgroundClip: "text",
	backgroundClip: "text",
	color: "transparent",
	WebkitTextFillColor: "transparent",
};

/** The logo above the GodlyPanel wordmark. */
export function Brand({ compact = false }) {
	return (
		<Box sx={{ textAlign: "center", mb: compact ? 2 : 3 }}>
			<Box
				component="img"
				src="/logo.svg"
				alt=""
				width={compact ? 52 : 64}
				height={compact ? 52 : 64}
				sx={{ display: "block", mx: "auto", mb: 1.5, borderRadius: 4, boxShadow: (t) => `0 10px 30px ${alpha(t.palette.brand.violet, 0.45)}, 0 0 0 1px ${alpha("#ffffff", 0.08)}` }}
			/>
			<Typography component="div" sx={{ ...GRADIENT_TEXT, fontSize: compact ? 26 : 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
				GodlyPanel
			</Typography>
		</Box>
	);
}

/** Two blurred colour blobs behind the card. They only drift slowly, and stand still for people who asked for less motion. */
function Glows() {
	const blob = (colour, sx) => ({
		position: "absolute",
		width: { xs: 280, sm: 460 },
		height: { xs: 280, sm: 460 },
		borderRadius: "50%",
		background: (t) => `radial-gradient(circle, ${alpha(t.palette.brand[colour], t.palette.mode === "dark" ? 0.3 : 0.18)} 0%, transparent 68%)`,
		filter: "blur(10px)",
		pointerEvents: "none",
		...sx,
	});
	return (
		<>
			<Box aria-hidden sx={blob("violet", { top: { xs: -80, sm: -120 }, left: { xs: -100, sm: "8%" } })} />
			<Box aria-hidden sx={blob("cyan", { bottom: { xs: -90, sm: -140 }, right: { xs: -100, sm: "6%" } })} />
		</>
	);
}

/**
 * @param {{ width?: number, children: React.ReactNode, footer?: React.ReactNode }} props
 * `width` is the card's widest size in pixels; on a phone it is always the screen's width less a small margin.
 */
function AuthShell({ width = 440, children, footer }) {
	return (
		<Box
			sx={{
				position: "relative",
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				px: 2,
				py: { xs: 4, sm: 6 },
				overflow: "hidden",
				backgroundColor: "background.default",
				backgroundImage: (t) => t.custom.backdrop,
				backgroundRepeat: "no-repeat",
				backgroundAttachment: "fixed",
			}}
		>
			<Glows />
			<Box sx={{ position: "absolute", top: 12, right: 12 }}>
				<ThemeToggle />
			</Box>
			<Paper
				elevation={0}
				sx={{
					position: "relative",
					width: "100%",
					maxWidth: width,
					p: { xs: 3, sm: 4 },
					borderRadius: 5,
					border: 1,
					borderColor: "divider",
					backgroundColor: (t) => t.custom.glass,
					backdropFilter: "blur(18px)",
					boxShadow: (t) => t.custom.shadow,
					animation: "gp-rise .35s ease-out",
					// A hairline of the brand gradient along the top edge.
					"&::before": { content: '""', position: "absolute", left: 24, right: 24, top: 0, height: 2, borderRadius: 2, background: (t) => t.custom.gradient, opacity: 0.9 },
				}}
			>
				{children}
			</Paper>
			{footer && (
				<Box sx={{ position: "relative", mt: 3, textAlign: "center", maxWidth: width, color: "text.secondary" }}>{footer}</Box>
			)}
		</Box>
	);
}

export default AuthShell;

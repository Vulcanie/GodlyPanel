import React from "react";
import { Box, ButtonBase, Collapse, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

// A card that folds away to one line: its name, a short hint about what's inside, and an arrow. Used where a page is
// a long stack of cards (the panel's Settings, a server's Settings), so what you want can be found by its name instead
// of by scrolling. What was open is remembered in this browser.

const STORAGE_KEY = "gp.sections";

const read = () => {
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
};

const write = (value) => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} catch {
		// Remembering what was open is a convenience.
	}
};

/** Which sections are open, remembered across visits. `set` takes a patch ({ id: true }) or a function of the old state. */
export function useSectionState() {
	const [state, setState] = React.useState(read);
	const set = React.useCallback((patch) => {
		setState((previous) => {
			const next = typeof patch === "function" ? patch(previous) : { ...previous, ...patch };
			write(next);
			return next;
		});
	}, []);
	return [state, set];
}

/**
 * @param {{ title: string, hint?: string, open: boolean, onToggle: () => void, danger?: boolean, id?: string, children: React.ReactNode }} props
 * Nothing inside is mounted while it is closed, so a card that loads or polls data does so only when it's looked at.
 */
function CollapsibleSection({ title, hint, open, onToggle, danger = false, id, children }) {
	return (
		<Box sx={{ mb: 2 }} data-section={id}>
			<Paper
				variant="outlined"
				sx={{
					borderRadius: "16px",
					overflow: "hidden",
					borderColor: danger ? "error.main" : open ? (t) => alpha(t.palette.primary.main, 0.45) : "divider",
					transition: "border-color .2s",
					...(open ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: "none" } : {}),
				}}
			>
				<ButtonBase
					onClick={onToggle}
					aria-expanded={open}
					sx={{
						width: "100%",
						display: "flex",
						alignItems: "center",
						gap: 1.5,
						px: 2,
						py: 1.5,
						textAlign: "left",
						justifyContent: "flex-start",
						transition: "background-color .15s",
						"&:hover": { bgcolor: (t) => t.custom.hover },
						"&.Mui-focusVisible": { bgcolor: (t) => t.custom.hover },
					}}
				>
					<ExpandMoreIcon sx={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s", color: danger ? "error.main" : "text.secondary" }} />
					<Typography variant="subtitle1" sx={{ color: danger ? "error.main" : undefined, flexShrink: 0 }}>
						{title}
					</Typography>
					{hint && !open && (
						<Typography variant="body2" sx={{ color: "text.secondary", ml: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: { xs: "none", sm: "block" } }}>
							{hint}
						</Typography>
					)}
				</ButtonBase>
			</Paper>
			<Collapse in={open} unmountOnExit>
				<Box sx={{ "& > .MuiPaper-root": { mb: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 } }}>{children}</Box>
			</Collapse>
		</Box>
	);
}

export default CollapsibleSection;

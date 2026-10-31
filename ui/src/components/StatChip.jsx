import React from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import { copyToClipboard } from "../utils/clipboard";
import { t, useT } from "../i18n";

// A small labeled pill for one piece of server data (Players, Ping, an
// address, etc). Independent flex items instead of table cells means a row
// of these wraps naturally to multiple lines on a narrow viewport rather
// than clipping or forcing horizontal scroll.
function StatChip({ icon, label, value, copyable }) {
	// Re-renders this chip when the language changes, so the t() text below switches with it.
	useT();
	// null until a copy has happened; then the copy's result ("Copied!" or "Failed!") shows for a moment, and "Copy" comes back.
	const [result, setResult] = React.useState(null);
	const tooltip = result ?? t("common.copy");
	const timer = React.useRef(null);
	React.useEffect(() => () => clearTimeout(timer.current), []);

	const handleCopy = (e) => {
		e.stopPropagation();
		copyToClipboard(value, setResult);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setResult(null), 1500);
	};

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 0.5,
				px: 1,
				py: 0.5,
				borderRadius: 999,
				bgcolor: (t) => t.custom.hover,
				border: (t) => `1px solid ${t.palette.divider}`,
				transition: "background-color 0.15s ease, border-color 0.15s ease",
				"&:hover": { borderColor: "primary.main" },
			}}
		>
			{icon}
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="caption" sx={{ fontWeight: 600 }}>
				{value}
			</Typography>
			{copyable && (
				<Tooltip title={tooltip}>
					<IconButton size="small" aria-label={t("common.copyLabel", { label })} onClick={handleCopy} sx={{ p: 0.25 }}>
						<ContentCopyIcon sx={{ fontSize: 13 }} />
					</IconButton>
				</Tooltip>
			)}
		</Box>
	);
}

export default StatChip;

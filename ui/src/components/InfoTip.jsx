import React from "react";
import { Box, IconButton, Link, Tooltip, Typography } from "@mui/material";
import { InfoOutlined as InfoIcon, OpenInNew as OpenIcon } from "@mui/icons-material";
import { findHelp } from "../help/helpIndex";
import { GUIDES, guideUrl } from "../help/guides";

/**
 * A small (i) beside a setting. Hovering it, focusing it with the keyboard, or tapping it on a phone shows what the setting
 * does and a link to the part of the guide on GitHub that explains how to use it.
 *
 * Give it an `id` from the help registry (src/help/panelHelp.js), or `text` (and optionally `guide` and `heading`) for a one-off.
 * It renders nothing if there is nothing to say, so it is safe to put next to anything.
 */
function InfoTip({ id, text, guide, heading, size = 16, sx }) {
	const entry = id ? findHelp(id) : null;
	const body = text ?? entry?.text;
	const guideKey = guide ?? entry?.guide;
	const guideHeading = heading ?? entry?.title;
	if (!body) return null;
	const url = guideKey ? guideUrl(guideKey, guideHeading) : null;

	const content = (
		<Box sx={{ py: 0.5 }}>
			{entry?.title && (
				<Typography variant="subtitle2" sx={{ color: "inherit", mb: 0.5 }}>
					{entry.title}
				</Typography>
			)}
			<Typography variant="body2" sx={{ color: "inherit", whiteSpace: "pre-line" }}>
				{body}
			</Typography>
			{url && (
				<Link
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					underline="always"
					sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 1, fontSize: 13, color: "primary.light" }}
				>
					How to use this: {GUIDES[guideKey]?.title ?? "guide"} <OpenIcon sx={{ fontSize: 13 }} />
				</Link>
			)}
		</Box>
	);

	return (
		<Tooltip
			title={content}
			arrow
			placement="top"
			enterDelay={120}
			// Long enough to move the pointer onto the tooltip and click its link.
			leaveDelay={300}
			enterTouchDelay={0}
			leaveTouchDelay={8000}
			slotProps={{ tooltip: { sx: { maxWidth: 360, p: 1.5, fontSize: 13, lineHeight: 1.45 } } }}
		>
			<IconButton
				size="small"
				aria-label={`About this setting${entry?.title ? `: ${entry.title}` : ""}`}
				// The icon is for reading, not for acting: it must not toggle the switch or open the row it sits in.
				onClick={(e) => e.stopPropagation()}
				sx={{ p: 0.25, ml: 0.5, color: "text.secondary", verticalAlign: "middle", "&:hover": { color: "primary.main" }, ...sx }}
			>
				<InfoIcon sx={{ fontSize: size }} />
			</IconButton>
		</Tooltip>
	);
}

export default React.memo(InfoTip);

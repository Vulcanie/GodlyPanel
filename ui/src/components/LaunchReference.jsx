import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Typography } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { launchDefFor } from "../catalog/launchArgs";
import { guideUrl } from "../help/guides";
import { cardAccordionSx } from "./cardStyles";

/** An argument as it would be written on the line. */
function exampleLine(arg, def) {
	if (arg.kind === "bool") return arg.flag;
	if (arg.example.startsWith("-")) return arg.example;
	if (arg.kind === "attached") return `${arg.flag}${arg.example}`;
	const style = arg.style ?? def.style;
	return style === "equals" ? `${arg.flag}=${arg.example}` : `${arg.flag} ${arg.example}`;
}

/**
 * Every launch argument a game takes and what it does, whether or not the form above edits it. For a game that is set up by its
 * launch line (Valheim, Rust) this is the manual for the line; for the others it explains the arguments in the start script.
 */
function LaunchReference({ gameType, onEditStartScript, defaultOpen = false }) {
	const def = launchDefFor(gameType);
	const [open, setOpen] = React.useState(defaultOpen);
	if (!def) return null;

	const groups = [];
	for (const arg of def.args) {
		let g = groups.find((x) => x.name === arg.group);
		if (!g) groups.push((g = { name: arg.group, args: [] }));
		g.args.push(arg);
	}

	return (
		<Accordion expanded={open} onChange={(_, v) => setOpen(v)} disableGutters sx={cardAccordionSx} data-testid="launch-reference">
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
					<Typography variant="subtitle1">All launch arguments for {def.title}</Typography>
					<Chip size="small" variant="outlined" label={def.args.length} />
				</Box>
			</AccordionSummary>
			<AccordionDetails>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
					{def.intro} They are on {def.where}.
					{!def.editable && onEditStartScript && (
						<>
							{" "}
							<Button size="small" onClick={onEditStartScript}>
								Edit the start script
							</Button>
						</>
					)}
				</Typography>
				{groups.map((group) => (
					<Box key={group.name} sx={{ mb: 2 }}>
						<Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.2 }}>
							{group.name}
						</Typography>
						{group.args.map((arg) => (
							<Box key={arg.flag} sx={{ display: "flex", gap: 2, py: 1, borderTop: 1, borderColor: "divider", flexWrap: "wrap" }}>
								<Box sx={{ flex: "0 0 240px", maxWidth: "100%" }}>
									<Typography component="code" variant="body2" sx={{ fontFamily: (t) => t.custom.mono, fontWeight: 600, wordBreak: "break-all" }}>
										{arg.flag}
										{arg.kind === "attached" ? "<value>" : ""}
									</Typography>
									<Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
										{arg.managed && <Chip size="small" label="set by the panel" sx={{ height: 18, fontSize: 11 }} />}
										{arg.edit === false && !arg.managed && <Chip size="small" variant="outlined" label="not in the form" sx={{ height: 18, fontSize: 11 }} />}
									</Box>
								</Box>
								<Box sx={{ flex: "1 1 280px", minWidth: 0 }}>
									<Typography variant="body2">
										<strong>{arg.label}.</strong> {arg.description}
									</Typography>
									{arg.options && (
										<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
											Values: {arg.options.map((o) => (Array.isArray(o) ? o[0] : o)).join(", ")}
										</Typography>
									)}
									{arg.example && (
										<Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontFamily: (t) => t.custom.mono }}>
											Example: {exampleLine(arg, def)}
										</Typography>
									)}
								</Box>
							</Box>
						))}
					</Box>
				))}
				<Button size="small" href={guideUrl("launch", def.title)} target="_blank" rel="noopener noreferrer">
					Read this as a guide on GitHub
				</Button>
			</AccordionDetails>
		</Accordion>
	);
}

export default LaunchReference;

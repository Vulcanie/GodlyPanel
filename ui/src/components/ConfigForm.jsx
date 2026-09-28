import React from "react";
import {
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Box,
	Typography,
	Switch,
	TextField,
	IconButton,
	Tooltip,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon, ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import { copyToClipboard } from "../utils/clipboard";
import { prettifyKey } from "../utils/prettifyKey";
import { detectSettingType, toBoolString } from "../utils/settingType";

function SettingControl({ settingKey, value, onChange }) {
	const isPassword = /password/i.test(settingKey);
	const type = detectSettingType(value);
	const [copyTooltip, setCopyTooltip] = React.useState("Copy");

	const handleCopy = (e) => {
		e.stopPropagation();
		copyToClipboard(String(value), setCopyTooltip);
		setTimeout(() => setCopyTooltip("Copy"), 1500);
	};

	if (type === "boolean") {
		const checked = String(value).trim().toLowerCase() === "true";
		return (
			<Switch
				checked={checked}
				onChange={(e) => onChange(toBoolString(e.target.checked, value))}
			/>
		);
	}

	return (
		<TextField
			size="small"
			fullWidth
			type={type === "number" ? "number" : "text"}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			slotProps={{
				input: isPassword
					? {
							endAdornment: (
								<Tooltip title={copyTooltip}>
									<IconButton size="small" onClick={handleCopy}>
										<ContentCopyIcon sx={{ fontSize: 16 }} />
									</IconButton>
								</Tooltip>
							),
						}
					: undefined,
			}}
		/>
	);
}

function StructuredListEditor({ entry, onChange }) {
	const items = Array.isArray(entry.value) ? entry.value : [];

	const updateItem = (index, key, rawNewValue) => {
		const originalValue = items[index][key];
		const type = detectSettingType(originalValue);
		let coerced = rawNewValue;
		if (type === "boolean") coerced = String(rawNewValue).toLowerCase() === "true";
		else if (type === "number") coerced = rawNewValue === "" ? rawNewValue : Number(rawNewValue);

		const next = items.map((item, i) =>
			i === index ? { ...item, [key]: coerced } : item,
		);
		onChange(next);
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{items.map((item, index) => (
				<Box
					key={index}
					sx={{
						border: "1px solid",
						borderColor: "grey.800",
						borderRadius: 1,
						p: 2,
					}}
				>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						{item.name || `Entry ${index + 1}`}
					</Typography>
					<Box
						sx={{
							display: "grid",
							gap: 1.5,
							gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
						}}
					>
						{Object.entries(item).map(([key, value]) => (
							<Box key={key}>
								<Typography
									variant="caption"
									sx={{ color: grey[500], display: "block", mb: 0.5 }}
								>
									{prettifyKey(key)}
								</Typography>
								<SettingControl
									settingKey={key}
									value={String(value)}
									onChange={(newVal) => updateItem(index, key, newVal)}
								/>
							</Box>
						))}
					</Box>
				</Box>
			))}
		</Box>
	);
}

function ConfigForm({ groups, onChange }) {
	const [expanded, setExpanded] = React.useState(groups[0]?.name);

	return (
		<Box>
			{groups.map((group) => (
				<Accordion
					key={group.name}
					expanded={expanded === group.name}
					onChange={(_, isExp) => setExpanded(isExp ? group.name : false)}
					disableGutters
				>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography variant="subtitle1">{group.name}</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
							{group.settings.map((entry) =>
								entry.structured ? (
									<Box key={entry.id}>
										<Typography variant="subtitle2" sx={{ mb: 1 }}>
											{entry.label}
										</Typography>
										<StructuredListEditor
											entry={entry}
											onChange={(newArr) => onChange(entry, newArr)}
										/>
									</Box>
								) : (
									<Box
										key={entry.id}
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
											flexWrap: "wrap",
										}}
									>
										<Box sx={{ flex: { xs: "1 1 100%", sm: "0 0 300px" } }}>
											<Typography variant="body2">{entry.label}</Typography>
											{entry.description && (
												<Typography
													variant="caption"
													sx={{ color: grey[500] }}
												>
													{entry.description}
												</Typography>
											)}
										</Box>
										<Box sx={{ flex: 1, minWidth: 180, maxWidth: 320 }}>
											<SettingControl
												settingKey={entry.key}
												value={entry.value}
												onChange={(newVal) => onChange(entry, newVal)}
											/>
										</Box>
									</Box>
								),
							)}
						</Box>
					</AccordionDetails>
				</Accordion>
			))}
		</Box>
	);
}

export default ConfigForm;

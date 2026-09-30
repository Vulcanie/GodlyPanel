import React from "react";
import { Alert, Box, Chip, TextField, Typography } from "@mui/material";
import { api } from "../api/client";

/** A server's tags: labels used to search and group the dashboard. Administrators only. */
function TagsEditor({ serverName, tags = [] }) {
	const [draft, setDraft] = React.useState("");
	const [error, setError] = React.useState(null);
	const [saved, setSaved] = React.useState(null);
	const current = saved ?? tags;

	// The live status catches up within a few seconds; until then show what was just saved.
	React.useEffect(() => {
		setSaved(null);
	}, [tags.join("\u0000")]); // eslint-disable-line react-hooks/exhaustive-deps

	const save = async (next) => {
		setError(null);
		try {
			const r = await api.put(`/api/server/${encodeURIComponent(serverName)}/tags`, { tags: next });
			setSaved(r.tags);
		} catch (e) {
			setError(e.message);
		}
	};

	const add = () => {
		const tag = draft.trim();
		if (!tag) return;
		setDraft("");
		if (!current.some((t) => t.toLowerCase() === tag.toLowerCase())) save([...current, tag]);
	};

	return (
		<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center", mb: 1.5 }}>
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				Tags:
			</Typography>
			{current.map((tag) => (
				<Chip key={tag} size="small" label={tag} onDelete={() => save(current.filter((t) => t !== tag))} />
			))}
			<TextField
				size="small"
				variant="standard"
				placeholder={current.length ? "add another" : "add a tag, e.g. friends"}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && add()}
				onBlur={add}
				inputProps={{ "aria-label": "Add a tag", maxLength: 24 }}
				sx={{ minWidth: 140 }}
			/>
			{error && (
				<Alert severity="warning" onClose={() => setError(null)} sx={{ py: 0 }}>
					{error}
				</Alert>
			)}
		</Box>
	);
}

export default TagsEditor;

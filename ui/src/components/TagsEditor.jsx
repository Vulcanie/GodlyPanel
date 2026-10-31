import React from "react";
import { Alert, Box, Chip, TextField } from "@mui/material";
import { api } from "../api/client";
import { t, useT, errorText } from "../i18n";

/** A server's tags: labels used to search and group the dashboard. Administrators only. */
function TagsEditor({ serverName, tags = [] }) {
	// Re-renders this editor when the language changes, so the t() text below switches with it.
	useT();
	const [draft, setDraft] = React.useState("");
	const [error, setError] = React.useState(null);
	const [saved, setSaved] = React.useState(null);
	const current = saved ?? tags;

	// The live status catches up within a few seconds; until then show what was just saved.
	React.useEffect(() => {
		setSaved(null);
	}, [tags.join("\u0000"), serverName]); // eslint-disable-line react-hooks/exhaustive-deps

	// Another server starts with nothing half-typed and no old error.
	React.useEffect(() => {
		setDraft("");
		setError(null);
	}, [serverName]);

	const save = async (next) => {
		setError(null);
		try {
			const r = await api.put(`/api/server/${encodeURIComponent(serverName)}/tags`, { tags: next });
			setSaved(r.tags);
		} catch (e) {
			setError(errorText(e));
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
			{current.map((tag) => (
				<Chip key={tag} size="small" label={tag} onDelete={() => save(current.filter((t) => t !== tag))} />
			))}
			<TextField
				size="small"
				variant="standard"
				placeholder={current.length ? t("tags.addAnother") : t("tags.addExample")}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && add()}
				onBlur={add}
				inputProps={{ "aria-label": t("tags.add"), maxLength: 24 }}
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

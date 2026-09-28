import React from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import { grey } from "@mui/material/colors";

function RconConsole({ apiBase, serverName, authToken }) {
	const [command, setCommand] = React.useState("");
	const [log, setLog] = React.useState([]);
	const [sending, setSending] = React.useState(false);

	const send = async () => {
		const cmd = command.trim();
		if (!cmd || sending) return;
		setSending(true);
		setCommand("");
		try {
			const res = await fetch(
				`${apiBase}/api/control/${encodeURIComponent(serverName)}/rcon`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${authToken}`,
						"ngrok-skip-browser-warning": "true",
					},
					body: JSON.stringify({ command: cmd }),
				},
			);
			const data = await res.json();
			setLog((prev) => [
				...prev,
				{
					command: cmd,
					response: data.response ?? data.error ?? "(no response)",
				},
			]);
		} catch (err) {
			setLog((prev) => [
				...prev,
				{ command: cmd, response: "Failed to send command." },
			]);
		} finally {
			setSending(false);
		}
	};

	return (
		<Box
			sx={{
				mt: 3,
				border: "1px solid",
				borderColor: "grey.800",
				borderRadius: 1,
				p: 2,
			}}
		>
			<Typography variant="subtitle1" sx={{ mb: 1 }}>
				RCON Console
			</Typography>
			<Box
				sx={{
					maxHeight: 220,
					overflowY: "auto",
					backgroundColor: "#1a1a1a",
					borderRadius: 1,
					p: 1.5,
					mb: 1.5,
					fontFamily: "monospace",
					fontSize: 13,
				}}
			>
				{log.length === 0 ? (
					<Typography variant="body2" sx={{ color: grey[600] }}>
						No commands sent yet.
					</Typography>
				) : (
					log.map((entry, i) => (
						<Box key={i} sx={{ mb: 1 }}>
							<Typography variant="body2" sx={{ color: "#7fd0ff" }}>
								&gt; {entry.command}
							</Typography>
							<Typography
								variant="body2"
								sx={{ color: grey[300], whiteSpace: "pre-wrap" }}
							>
								{entry.response}
							</Typography>
						</Box>
					))
				)}
			</Box>
			<Box sx={{ display: "flex", gap: 1 }}>
				<TextField
					size="small"
					fullWidth
					placeholder="Enter RCON command"
					value={command}
					onChange={(e) => setCommand(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") send();
					}}
				/>
				<Button
					variant="contained"
					onClick={send}
					disabled={sending || !command.trim()}
				>
					Send
				</Button>
			</Box>
		</Box>
	);
}

export default RconConsole;

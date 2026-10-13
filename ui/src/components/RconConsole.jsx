import React from "react";
import { Box, Button, TextField } from "@mui/material";
import { Terminal as TerminalIcon } from "@mui/icons-material";
import { api } from "../api/client";
import SectionCard from "./ui/SectionCard";

/**
 * Send a command to the game's console (RCON) and read the answer. The up and down arrows step through what was sent before,
 * as in any terminal. The black panel is a terminal in both the light and the dark theme.
 */
function RconConsole({ serverName }) {
	const [command, setCommand] = React.useState("");
	const [log, setLog] = React.useState([]);
	const [sending, setSending] = React.useState(false);
	const history = React.useRef([]);
	const cursor = React.useRef(-1);
	const screen = React.useRef(null);

	React.useEffect(() => {
		if (screen.current) screen.current.scrollTop = screen.current.scrollHeight;
	}, [log]);

	const send = async () => {
		const cmd = command.trim();
		if (!cmd || sending) return;
		setSending(true);
		setCommand("");
		history.current = [cmd, ...history.current.filter((c) => c !== cmd)].slice(0, 50);
		cursor.current = -1;
		try {
			const data = await api.post(`/api/control/${encodeURIComponent(serverName)}/rcon`, { command: cmd });
			setLog((prev) => [...prev, { command: cmd, response: data.response ?? data.error ?? "(no response)" }]);
		} catch (err) {
			setLog((prev) => [...prev, { command: cmd, response: err.message || "The command could not be sent.", failed: true }]);
		} finally {
			setSending(false);
		}
	};

	const onKeyDown = (e) => {
		if (e.key === "Enter") return send();
		if (e.key === "ArrowUp" && history.current.length) {
			e.preventDefault();
			cursor.current = Math.min(history.current.length - 1, cursor.current + 1);
			setCommand(history.current[cursor.current]);
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			cursor.current = Math.max(-1, cursor.current - 1);
			setCommand(cursor.current === -1 ? "" : history.current[cursor.current]);
		}
	};

	return (
		<SectionCard title="Console" subtitle="Commands go to the game's own console (RCON)" icon={<TerminalIcon />}>
			<Box
				ref={screen}
				data-testid="rcon-screen"
				sx={{ height: 240, overflowY: "auto", backgroundColor: "#0b0f17", border: 1, borderColor: "divider", borderRadius: 2, p: 1.5, mb: 1.5, fontFamily: (t) => t.custom.mono, fontSize: 13, color: "#cbd5e1" }}
			>
				{log.length === 0 ? (
					<Box sx={{ color: "#64748b" }}>No commands sent yet. Try "help".</Box>
				) : (
					log.map((entry, i) => (
						<Box key={i} sx={{ mb: 1 }}>
							<Box sx={{ color: "#7dd3fc" }}>&gt; {entry.command}</Box>
							<Box sx={{ whiteSpace: "pre-wrap", color: entry.failed ? "#fda4af" : "#cbd5e1" }}>{entry.response}</Box>
						</Box>
					))
				)}
			</Box>
			<Box sx={{ display: "flex", gap: 1 }}>
				<TextField size="small" fullWidth placeholder="Enter a command" value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={onKeyDown} slotProps={{ htmlInput: { "aria-label": "Console command", autoComplete: "off", spellCheck: false } }} />
				<Button variant="contained" onClick={send} disabled={sending || !command.trim()}>
					Send
				</Button>
			</Box>
		</SectionCard>
	);
}

export default RconConsole;

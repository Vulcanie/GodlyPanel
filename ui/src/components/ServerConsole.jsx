import React from "react";
import { Box, Typography } from "@mui/material";
import { api } from "../api/client";

const POLL_MS = 2000;
// Enough to scroll back through a startup without holding a whole log in the page.
const MAX_CHARS = 200_000;

/**
 * Live output of a server the panel launched itself. Follows the log file by
 * offset, so each poll transfers only what's new.
 */
function ServerConsole({ serverName, active }) {
	const [text, setText] = React.useState("");
	const [exists, setExists] = React.useState(null);
	const offset = React.useRef(undefined);
	const box = React.useRef(null);
	const stickToBottom = React.useRef(true);

	// A different server starts from scratch.
	React.useEffect(() => {
		offset.current = undefined;
		setText("");
		setExists(null);
	}, [serverName]);

	React.useEffect(() => {
		if (!active) return undefined;
		let stopped = false;

		const tick = async () => {
			try {
				const query =
					offset.current === undefined
						? ""
						: `?offset=${offset.current}`;
				const data = await api.get(
					`/api/server/${encodeURIComponent(serverName)}/log${query}`,
				);
				if (stopped) return;
				setExists(data.exists);
				if (data.exists) {
					offset.current = data.next;
					setText((prev) => {
						const joined = data.reset
							? data.text
							: prev + data.text;
						return joined.length > MAX_CHARS
							? joined.slice(-MAX_CHARS)
							: joined;
					});
				}
			} catch {
				// Transient; try again next tick.
			}
		};

		tick();
		const timer = setInterval(tick, POLL_MS);
		return () => {
			stopped = true;
			clearInterval(timer);
		};
	}, [serverName, active]);

	// Keep following the end unless the reader has scrolled up to look at something.
	React.useEffect(() => {
		const el = box.current;
		if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
	}, [text]);

	const onScroll = () => {
		const el = box.current;
		if (el)
			stickToBottom.current =
				el.scrollHeight - el.scrollTop - el.clientHeight < 24;
	};

	if (exists === false) {
		return (
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				No output captured yet. Servers started in "No window" mode show
				their live output here.
			</Typography>
		);
	}

	return (
		<Box
			ref={box}
			onScroll={onScroll}
			component="pre"
			sx={{
				m: 0,
				p: 1.5,
				height: 280,
				overflow: "auto",
				fontFamily: "Consolas, 'Cascadia Mono', monospace",
				fontSize: 12,
				lineHeight: 1.45,
				whiteSpace: "pre-wrap",
				wordBreak: "break-word",
				bgcolor: "#0b0b0b",
				border: "1px solid rgba(255,255,255,0.08)",
				borderRadius: 1,
			}}
		>
			{text || "Waiting for output..."}
		</Box>
	);
}

export default ServerConsole;

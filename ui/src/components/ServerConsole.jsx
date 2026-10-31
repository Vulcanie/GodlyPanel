import React from "react";
import { Box, Typography } from "@mui/material";
import { api } from "../api/client";
import { t, useT } from "../i18n";

const POLL_MS = 2000;
// Enough to scroll back through a startup without holding a whole log in the page.
const MAX_CHARS = 200_000;

/**
 * Live output of a server the panel launched itself. Follows the log file by
 * offset, so each poll transfers only what's new.
 */
function ServerConsole({ serverName, active }) {
	// Re-renders this console when the language changes, so the t() text below switches with it.
	useT();
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
				{t("console.noOutput")}
			</Typography>
		);
	}

	return (
		<Box
			ref={box}
			onScroll={onScroll}
			component="pre"
			role="log"
			aria-label={t("console.output")}
			data-testid="server-console"
			sx={{
				m: 0,
				p: 1.5,
				height: 280,
				overflow: "auto",
				fontFamily: (t) => t.custom.mono,
				fontSize: 12,
				lineHeight: 1.45,
				whiteSpace: "pre-wrap",
				wordBreak: "break-word",
				bgcolor: "background.default",
				border: 1,
				borderColor: "divider",
				borderRadius: 2,
				color: "text.primary",
			}}
		>
			{text || t("console.waiting")}
		</Box>
	);
}

export default ServerConsole;

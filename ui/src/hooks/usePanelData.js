import React from "react";
import { api } from "../api/client";
import { emitLive } from "../liveEvents";

/**
 * Everything the panel shows live: the servers and their status, the PC's CPU and memory, each server's own, and the artwork
 * settings. It starts with a read of each, then keeps them current from the panel's event stream. Some paths between the browser and
 * the panel (a temporary Cloudflare link, certain proxies) cut live streams, so when the stream is down or has gone quiet it asks
 * for the same information every few seconds instead.
 *
 * `connection` is "live" (the stream is delivering), "polling" (asking every few seconds) or "offline" (the panel isn't answering).
 */
export function usePanelData(signedIn, role) {
	const [servers, setServers] = React.useState({});
	const [systemStats, setSystemStats] = React.useState(null);
	const [serverStats, setServerStats] = React.useState([]);
	const [appearance, setAppearance] = React.useState(null);
	const [apiError, setApiError] = React.useState(null);
	const [loading, setLoading] = React.useState(true);
	const [allowedServers, setAllowedServers] = React.useState(null);
	const [connection, setConnection] = React.useState("polling");

	React.useEffect(() => {
		if (!signedIn) return undefined;
		let alive = true;

		const loadInitial = async () => {
			// Independent reads, so a slow one doesn't hold up the rest.
			const status = api
				.get("/api/status")
				.then((s) => alive && (setServers(s), setApiError(null)))
				.catch((err) => alive && setApiError(err.message))
				.finally(() => alive && setLoading(false));
			const system = api
				.get("/api/system-stats")
				.then((s) => alive && s?.totalMemMB != null && setSystemStats(s))
				.catch(() => {});
			const perServer = api
				.get("/api/server-stats")
				.then((s) => alive && Array.isArray(s) && setServerStats(s))
				.catch(() => {});
			const art = api
				.get("/api/appearance")
				.then(({ types }) => alive && setAppearance(types))
				.catch(() => {});
			// A moderator may be limited to some servers; everyone else can open any they are allowed to see.
			const mine = (role === "moderator" ? api.get("/api/my-servers") : Promise.resolve(null))
				.then((list) => alive && setAllowedServers(list))
				.catch(() => alive && setAllowedServers(null));
			await Promise.all([status, system, perServer, art, mine]);
		};
		loadInitial();

		const events = new EventSource("/api/events");

		let streamOk = false;
		let lastEvent = Date.now();
		let lastPoll = 0;
		const poll = async () => {
			if (Date.now() - lastPoll < 8000) return;
			lastPoll = Date.now();
			try {
				setServers(await api.get("/api/status"));
				setApiError(null);
				setConnection((c) => (c === "live" ? c : "polling"));
				const stats = await api.get("/api/system-stats").catch(() => null);
				if (stats?.totalMemMB != null) setSystemStats(stats);
				const perServer = await api.get("/api/server-stats").catch(() => null);
				if (Array.isArray(perServer)) setServerStats(perServer);
			} catch (err) {
				setApiError(err.message);
				setConnection("offline");
			}
		};
		const fallback = setInterval(() => {
			if (!streamOk || Date.now() - lastEvent > 45_000) poll();
		}, 10_000);

		// Only a message counts as proof the stream works: a proxy may let it open and then hold back everything.
		events.onmessage = (event) => {
			streamOk = true;
			lastEvent = Date.now();
			// Any message, including the 15s heartbeat, means the connection is alive. EventSource reconnects on its own after a
			// transient error, and without clearing here the "lost connection" banner would never go away.
			setApiError(null);
			setConnection("live");
			if (!event.data) return;

			let data;
			try {
				data = JSON.parse(event.data);
			} catch {
				return;
			}
			// Anything only one component cares about (a backup's progress, an activity line) is handed to whoever listens for it.
			emitLive(data.type, data);
			switch (data.type) {
				case "server_update":
				case "server_added":
					setServers((prev) => ({ ...prev, [data.serverName]: data.status }));
					break;
				case "server_removed":
					setServers((prev) => {
						const copy = { ...prev };
						delete copy[data.serverName];
						return copy;
					});
					break;
				case "system_stats":
					setSystemStats(data.stats);
					break;
				case "server_stats":
					setServerStats(data.stats);
					break;
				case "appearance_updated":
					// An admin changed a card's look; everyone watching sees it without reloading.
					setAppearance((prev) => ({
						...prev,
						[data.gameType]: {
							mode: data.appearance.mode ?? "auto",
							color: data.appearance.color ?? null,
							color2: data.appearance.color2 ?? null,
							appId: data.appearance.appId ?? null,
							image: data.appearance.image ?? null,
							version: data.appearance.updatedAt ?? 0,
						},
					}));
					break;
				default:
					break;
			}
		};

		events.onerror = () => {
			streamOk = false;
			setConnection("polling");
			poll();
		};

		return () => {
			alive = false;
			clearInterval(fallback);
			events.close();
		};
	}, [signedIn, role]);

	return { servers, systemStats, serverStats, appearance, apiError, loading, allowedServers, connection };
}

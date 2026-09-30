import React from "react";
import { api } from "./api/client";
import { onLive } from "./liveEvents";

// What each server is in the middle of right now (starting, stopping, backing
// up...), so the dashboard and the server page can say so and hold back buttons
// that would be refused.

const OperationsContext = React.createContext({});

const LABELS = {
	starting: "Starting…",
	stopping: "Stopping…",
	restarting: "Restarting…",
	updating: "Updating…",
	"backing up": "Backing up…",
	restoring: "Restoring…",
	"changing mods": "Changing mods…",
};

export const operationLabel = (op) => LABELS[op] ?? `${op}…`;

export function OperationsProvider({ children }) {
	const [operations, setOperations] = React.useState({});

	React.useEffect(() => {
		let alive = true;
		api
			.get("/api/operations")
			.then((all) => alive && setOperations(Object.fromEntries(Object.entries(all).map(([name, { op }]) => [name, op]))))
			.catch(() => {});
		const off = onLive("server_operation", (e) =>
			setOperations((prev) => {
				const next = { ...prev };
				if (e.operation) next[e.serverName] = e.operation;
				else delete next[e.serverName];
				return next;
			}),
		);
		return () => {
			alive = false;
			off();
		};
	}, []);

	return <OperationsContext.Provider value={operations}>{children}</OperationsContext.Provider>;
}

/** The operation running on a server, or null. */
export const useOperation = (name) => React.useContext(OperationsContext)[name] ?? null;
export const useOperations = () => React.useContext(OperationsContext);

import React from "react";
import { api } from "../api/client";

/**
 * What the signed-in person has chosen to hide ("don't show this again"), kept on their account on the server so it holds in every
 * browser and at every address. `prefs` is null until it has loaded. `save(patch)` shows the change at once and keeps it.
 *
 * `legacy` moves a choice an older version kept in this browser's local storage onto the account, once:
 *   legacy: [{ storageKey, pref, read: (stored) => value }]
 */
export function usePreferences(legacy = []) {
	const [prefs, setPrefs] = React.useState(null);

	const save = React.useCallback(async (patch) => {
		setPrefs((p) => ({ ...(p ?? {}), ...patch }));
		try {
			const r = await api.put("/api/auth/preferences", patch);
			setPrefs(r.prefs);
		} catch {
			// It was shown as chosen; if keeping it failed it comes back next time.
		}
	}, []);

	React.useEffect(() => {
		let alive = true;
		api
			.get("/api/auth/preferences")
			.then((r) => {
				if (!alive) return;
				setPrefs(r.prefs);
				for (const { storageKey, pref, read } of legacy) {
					try {
						const stored = localStorage.getItem(storageKey);
						if (stored === null) continue;
						const value = read(stored);
						if (value !== undefined && r.prefs[pref] === undefined) save({ [pref]: value });
						localStorage.removeItem(storageKey);
					} catch {
						// Local storage isn't available; nothing to carry over.
					}
				}
			})
			.catch(() => alive && setPrefs({}));
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return [prefs, save];
}

import React from "react";

// Moving around the panel, kept in step with the browser's own history so its Back and Forward buttons step through the panel
// instead of leaving it.

const HOME = { page: "dashboard", server: null, tab: null };

export function useNavigation(signedIn) {
	const [nav, setNav] = React.useState(HOME);
	const navRef = React.useRef(HOME);
	// What each history entry showed, by position, so an in-app Back button can step back through history when the entry before is
	// where it's headed (rather than piling up a new entry every time you go back).
	const trail = React.useRef([HOME]);
	const position = () => window.history.state?.idx ?? 0;

	const apply = React.useCallback((next) => {
		navRef.current = next;
		setNav(next);
	}, []);

	// undefined keeps what is current (the batch editor and its Back button keep the server).
	const go = React.useCallback(
		(page, server, tab) => {
			const next = {
				page,
				server: server === undefined ? navRef.current.server : server,
				tab: tab === undefined ? (server === undefined || server === navRef.current.server ? navRef.current.tab : null) : tab,
			};
			apply(next);
			try {
				const idx = position() + 1;
				trail.current.length = idx;
				trail.current[idx] = next;
				window.history.pushState({ ...next, idx }, "");
			} catch {
				// History is a convenience; the panel works without it.
			}
		},
		[apply],
	);

	const back = React.useCallback(
		(page) => {
			const previous = trail.current[position() - 1];
			if (previous && previous.page === page) window.history.back();
			else go(page, page === "dashboard" ? null : undefined);
		},
		[go],
	);

	// Switching a tab is not a new place to come back to.
	const setTab = React.useCallback(
		(tab) => {
			const next = { ...navRef.current, tab };
			apply(next);
			try {
				trail.current[position()] = next;
				window.history.replaceState({ ...next, idx: position() }, "");
			} catch {
				// Ignore.
			}
		},
		[apply],
	);

	React.useEffect(() => {
		try {
			window.history.replaceState({ ...HOME, idx: 0 }, "");
		} catch {
			// Ignore.
		}
		const onPop = (event) => {
			const state = event.state || { ...HOME, idx: 0 };
			apply({ page: state.page || "dashboard", server: state.server ?? null, tab: state.tab ?? null });
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [apply]);

	// Signing out and back in as someone else must not land on the previous person's page (a view-only user arriving on Settings).
	React.useEffect(() => {
		if (!signedIn) apply(HOME);
	}, [signedIn, apply]);

	return { nav, go, back, setTab };
}

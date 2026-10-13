import React from "react";

// Where the person is in the panel, and how to move. Provided by App so the sidebar, the command palette and the pages all move the
// same way (and the browser's Back button follows).
//
//   page    "dashboard" | "createServer" | "settings" | "users" | "activity" | "config" (a server) | "batchEditor"
//   server  the server's name, on the pages that are about one
//   tab     the server tab that is open
//   go(page, server?, tab?)      move, recording the move in the browser's history
//   setTab(tab)                  switch tab on a server page (no new history entry)
//   back(page)                   go back to `page`, stepping back through history when that is where it came from

export const NavContext = React.createContext({
	page: "dashboard",
	server: null,
	tab: null,
	go: () => {},
	setTab: () => {},
	back: () => {},
});

export const useNav = () => React.useContext(NavContext);

import React from "react";
import PortsEditor from "./PortsEditor";
import NetworkPanel from "./NetworkPanel";

/** Everything about reaching the server: its ports, the addresses to share, and whether Windows Firewall lets people in. */
function ServerNetworkTab({ serverName, isAdmin }) {
	return (
		<>
			{isAdmin && <PortsEditor serverName={serverName} />}
			<NetworkPanel serverName={serverName} canChangeFirewall={isAdmin} />
		</>
	);
}

export default ServerNetworkTab;

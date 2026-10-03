// Live-update fan-out. Split out of the routes so the guest dashboard, the
// admin API and the poller all talk to one place.

const clients = new Set();

// One machine's panel, so this only needs to stop a misbehaving client from
// opening connections without limit.
const MAX_CLIENTS = 32;
const HEARTBEAT_MS = 15000;

/**
 * @param {object} payload
 * @param {(client: {userId: string, role: string}) => boolean} [filter]
 */
export function broadcastSseEvent(payload, filter) {
	const data = `data: ${JSON.stringify(payload)}\n\n`;
	for (const client of [...clients]) {
		if (filter && !filter(client)) continue;
		try {
			client.res.write(data);
		} catch {
			// A dead socket used to throw here and abort the whole loop, so
			// one stale client could silently stop everyone else receiving
			// updates. Drop it and carry on.
			drop(client);
		}
	}
}

function drop(client) {
	clearInterval(client.heartbeat);
	clients.delete(client);
	try {
		client.res.end();
	} catch {
		// Already gone.
	}
}

/**
 * `limits` keeps one kind of viewer from crowding out the rest: clients in a `group` are counted
 * (and capped) among themselves, and one `address` may hold only `perAddress` streams.
 */
export function addSseClient(req, res, user, { group = null, maxGroup = MAX_CLIENTS, address = null, perAddress = Infinity } = {}) {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("X-Accel-Buffering", "no");
	if (res.flushHeaders) res.flushHeaders();

	const mine = [...clients].filter((c) => c.group === group);
	if (mine.length >= maxGroup || (address && mine.filter((c) => c.address === address).length >= perAddress)) {
		res.write(`data: ${JSON.stringify({ type: "error", message: "Too many live connections." })}\n\n`);
		res.end();
		return;
	}

	const client = {
		res,
		userId: user?.id ?? null,
		role: user?.role ?? null,
		group,
		address,
		heartbeat: setInterval(() => {
			try {
				res.write("data: {}\n\n");
			} catch {
				drop(client);
			}
		}, HEARTBEAT_MS),
	};

	clients.add(client);
	res.write(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`);

	req.on("close", () => drop(client));
}

/** Ends every stream belonging to a user — used when they're disabled or deleted. */
export function dropSessionsFor(userId) {
	for (const client of [...clients]) {
		if (client.userId === userId) drop(client);
	}
}

/** Ends every stream the test accepts — used when a whole class of viewer stops being allowed in. */
export function dropClientsWhere(test) {
	for (const client of [...clients]) {
		if (test(client)) drop(client);
	}
}

export function clientCount() {
	return clients.size;
}

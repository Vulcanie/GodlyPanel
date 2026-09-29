export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reject if `promise` hasn't settled in `ms`. The timer is cleared as soon as
 * it does — the previous copies left one live timer per call until it fired,
 * which on a poll of every server every few seconds is a steady pile of them.
 */
export function withTimeout(promise, ms, label = "operation") {
	let timer;
	const timeout = new Promise((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

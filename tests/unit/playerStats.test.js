import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "../../src/server/services/playerStats.js";

// Busiest moment, average crowd, when people play, and a line per day, from minute points.

const MIN = 60_000;
const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

describe("player statistics", () => {
	it("says nothing useful about no data, without failing", () => {
		const s = computeStats([]);
		assert.equal(s.samples, 0);
		assert.equal(s.peak.players, 0);
		assert.equal(s.hours, null);
	});

	it("finds the peak, the average, the uptime and the player hours", () => {
		const pts = [
			{ t: at(2026, 9, 28, 20, 0), players: 2, playersMax: 3, up: 1 },
			{ t: at(2026, 9, 28, 20, 1), players: 4, playersMax: 6, up: 1 },
			{ t: at(2026, 9, 28, 20, 2), players: 0, playersMax: 0, up: 0 },
			{ t: at(2026, 9, 28, 20, 3), players: 0, playersMax: 0, up: 0 },
		];
		const s = computeStats(pts);
		assert.equal(s.peak.players, 6);
		assert.equal(new Date(s.peak.at).getMinutes(), 1);
		assert.equal(s.averagePlayers, 1.5);
		assert.equal(s.averageWhileUp, 3, "the average over the time it was up");
		assert.equal(s.uptimePercent, 50);
		assert.equal(s.playerHours, 0.1, "6 player-minutes");
	});

	it("builds the weekday-by-hour grid in local time", () => {
		// Monday 2026-09-28 20:xx: two readings of 4 and 6 players.
		const s = computeStats([
			{ t: at(2026, 9, 28, 20, 5), players: 4, up: 1 },
			{ t: at(2026, 9, 28, 20, 35), players: 6, up: 1 },
			{ t: at(2026, 9, 29, 3, 0), players: 1, up: 1 },
		]);
		assert.equal(s.hours[1][20], 5, "Monday 8pm averages 5");
		assert.equal(s.hours[2][3], 1, "Tuesday 3am");
		assert.equal(s.hours[1][3], null, "no data is null, not zero");
	});

	it("gives a line per day, with its peak and play time", () => {
		const s = computeStats([
			{ t: at(2026, 9, 28, 20, 0), players: 2, playersMax: 4, up: 1 },
			{ t: at(2026, 9, 28, 21, 0), players: 3, playersMax: 3, up: 1 },
			{ t: at(2026, 9, 29, 20, 0), players: 1, playersMax: 1, up: 0 },
		]);
		assert.deepEqual(s.daily.map((d) => d.date), ["2026-09-28", "2026-09-29"]);
		assert.equal(s.daily[0].peak, 4);
		assert.equal(s.daily[0].playerMinutes, 5);
		assert.equal(s.daily[1].uptimePercent, 0);
	});

	it("weights hourly points by the hour they stand for", () => {
		const s = computeStats([{ t: at(2026, 9, 28, 20, 0), players: 2, up: 1 }], 60 * MIN);
		assert.equal(s.playerHours, 2);
		assert.equal(s.daily[0].playerMinutes, 120);
	});
});

#!/usr/bin/env bash
# Runs the real-install check in a window mode for several games, one at a time (they share the test
# panel's port). Output goes to C:/gp-testbed/logs-window/<game>-<mode>.log.
#   bash tests/real/run-window-batch.sh windowless palworld 7days rust
# Games whose real servers are running are skipped by the harness itself (exit code 3).
set -u
cd "$(dirname "$0")/../.."
unset ELECTRON_RUN_AS_NODE
mode="$1"
shift
mkdir -p /c/gp-testbed/logs-window
for game in "$@"; do
	log="/c/gp-testbed/logs-window/${game}-${mode}.log"
	echo "[$(date +%H:%M:%S)] ${game} (${mode})"
	node tests/real/conformance.mjs --game "$game" --window "$mode" >"$log" 2>&1
	echo "[$(date +%H:%M:%S)] ${game} (${mode}) exit $? — $(grep -E '^[0-9]+ passed' "$log" | tail -1)"
done
echo "[$(date +%H:%M:%S)] batch finished"

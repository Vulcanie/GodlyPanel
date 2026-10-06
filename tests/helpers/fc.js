import fc from "fast-check";

// Property-based tests: instead of a few hand-picked inputs, a rule that must hold for every input of some shape, checked on
// many generated ones. When it fails, fast-check shrinks the input to the smallest one that still fails and prints it with
// the seed to reproduce it.
//
// In CI and in `npm test` the seed is fixed, so a run is the same every time and a failure is never a one-off. To go looking for
// bugs, let it roam:
//
//   $env:FC_SEED = "random"; $env:FC_RUNS = "20000"; node --test tests/unit/properties.*.test.js
//
// To replay a failure it printed:  $env:FC_SEED = "<the seed it printed>"

const seedFrom = (value) => (value === "random" ? undefined : Number.isFinite(Number(value)) ? Number(value) : 20261005);

/** Run a property with this project's defaults (a fixed seed and a modest number of runs unless told otherwise). */
export function check(property, options = {}) {
	fc.assert(property, {
		seed: seedFrom(process.env.FC_SEED),
		numRuns: Number(process.env.FC_RUNS) || 200,
		...options,
	});
}

export { fc };

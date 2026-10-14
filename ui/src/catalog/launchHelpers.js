// The two shorthands a launch-argument list is written with (see launchArgs.js for what an argument is).
export const A = (arg) => ({ kind: "value", edit: true, ...arg });
export const FLAG = (arg) => ({ kind: "bool", edit: true, ...arg });

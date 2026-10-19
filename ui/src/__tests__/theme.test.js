import { describe, it, expect } from "vitest";
import { buildTheme } from "../theme.js";

// Someone who has asked their system for less motion (Windows: "Show animations in Windows" off) gets instant hover and colour
// transitions. Animations are left alone: the rule once shortened every animation to 0.01 ms, which made the endless ones (the online
// dot, the loading wheels) race in a browser. Only a browser applies the setting; the desktop app does not, which is why only the
// web looked wrong.

const rule = (mode) => buildTheme(mode).components.MuiCssBaseline.styleOverrides["@media (prefers-reduced-motion: reduce)"];

describe("the reduced-motion rule", () => {
	for (const mode of ["dark", "light"]) {
		it(`makes transitions instant for a ${mode} theme`, () => {
			const declarations = Object.values(rule(mode))[0];
			expect(declarations.transitionDuration).toMatch(/!important/);
		});

		it(`never touches an animation's speed or repeat (${mode})`, () => {
			for (const declarations of Object.values(rule(mode))) {
				expect(Object.keys(declarations).filter((k) => k.startsWith("animation"))).toEqual([]);
			}
		});
	}
});

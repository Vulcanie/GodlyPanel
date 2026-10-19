import { describe, it, expect } from "vitest";
import { buildTheme } from "../theme.js";

// Someone who has asked their system for less motion (Windows: "Show animations in Windows" off) gets no decorative movement. The
// rule that does that once shortened every animation to 0.01 ms but left the endless ones looping, so the online dot and the
// spinners flickered at the fastest speed instead of stopping. (Only a browser applies the setting; the desktop app did not, which
// is why only the web looked wrong.)

const rule = (mode) => buildTheme(mode).components.MuiCssBaseline.styleOverrides["@media (prefers-reduced-motion: reduce)"];

describe("the reduced-motion rule", () => {
	for (const mode of ["dark", "light"]) {
		it(`plays an animation once, not endlessly, for a ${mode} theme`, () => {
			const [selector, declarations] = Object.entries(rule(mode))[0];
			expect(selector).toContain("*");
			expect(declarations.animationDuration).toMatch(/!important/);
			expect(declarations.animationIterationCount).toBe("1 !important");
		});

		it(`still lets a loading spinner or progress bar move, because it says something is happening (${mode})`, () => {
			const [selector] = Object.entries(rule(mode))[0];
			expect(selector).toContain(".MuiCircularProgress-root");
			expect(selector).toContain(".MuiLinearProgress-root");
		});
	}
});

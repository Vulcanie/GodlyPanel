import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The panel serves the built interface itself (src/server/app.js reads ui/build), so the output folder keeps the name the
// rest of the app, the packager and the browser tests already use.
//
// In development `npm run dev:ui` serves the interface with hot reload on port 3000 and forwards /api (including the live
// event stream) to a running panel, so the browser still sees one origin. Set GHP_API to point at a panel on another port.
const API = process.env.GHP_API || "http://127.0.0.1:8765";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 3000,
		proxy: { "/api": { target: API, changeOrigin: false } },
	},
	build: {
		outDir: "build",
		emptyOutDir: true,
		sourcemap: false,
		// The panel's Content-Security-Policy allows scripts only from its own address, and an inline preload helper would break that.
		modulePreload: { polyfill: false },
		rollupOptions: {
			output: {
				// The component library is the bulk of the download and changes far less often than the panel's own code.
				manualChunks: (id) => {
					if (!id.includes("node_modules")) return undefined;
					if (id.includes("@mui") || id.includes("@emotion")) return "mui";
					return "vendor";
				},
			},
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.js"],
		// The machine running these is also running everything else: never more than two at once.
		maxWorkers: 2,
	},
});

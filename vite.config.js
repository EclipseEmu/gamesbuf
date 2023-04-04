import { resolve } from "path";
import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

export default defineConfig({
	test: {},
	build: {
		lib: {
			entry: resolve(__dirname, "src/mod.ts"),
			name: "gamesbuf",
			fileName: "gamesbuf",
		},
	},
	plugins: [
		dts({
			libFolderPath: "node_modules/typescript/lib",
			insertTypesEntry: true,
		}),
	],
});

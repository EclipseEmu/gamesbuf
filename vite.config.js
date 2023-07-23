import { resolve } from "path";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

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

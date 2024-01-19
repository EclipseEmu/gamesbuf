import dts from "vite-plugin-dts";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
	build: {
		lib: {
			entry: fileURLToPath(new URL("./src/mod.ts", import.meta.url)),
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

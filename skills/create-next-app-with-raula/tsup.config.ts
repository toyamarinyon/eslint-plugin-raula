import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["scaffold.ts"],
	outDir: "dist",
	format: ["esm"],
	outExtension: () => ({ js: ".mjs" }),
	dts: false,
	clean: true,
	sourcemap: false,
	target: "es2022",
});

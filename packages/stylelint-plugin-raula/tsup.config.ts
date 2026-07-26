import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["index.ts", "css.ts", "cli.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	outDir: "dist",
	sourcemap: false,
	target: "es2022",
});

import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["index.ts", "tailwind.ts", "next-layout.ts", "css.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	outDir: "dist",
	sourcemap: false,
	target: "es2022",
});

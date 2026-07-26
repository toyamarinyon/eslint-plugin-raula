import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// eslint-plugin-raula's rules.test.ts relies on ESLint's RuleTester,
		// which calls the global describe/it itself rather than importing them.
		globals: true,
		include: [
			"packages/**/*.test.ts",
			"apps/**/*.test.ts",
			"skills/**/*.test.ts",
		],
		exclude: ["**/node_modules/**", "**/dist/**"],
	},
});

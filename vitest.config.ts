import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pinned to this file's own directory so `include` still resolves correctly
// when invoked with a different cwd, e.g. `pnpm --filter <pkg> run test`.
const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		root: repoRoot,
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

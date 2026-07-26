import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

test("raula oxlint plugin reports fixture violations", () => {
	const result = spawnSync("node_modules/.bin/oxlint", ["--format", "json"], {
		cwd: currentDir,
		encoding: "utf8",
	});

	expect(result.error).toBeUndefined();
	expect(result.status).not.toBe(0);
	expect(result.stdout).not.toBe("");

	const { diagnostics } = JSON.parse(result.stdout);
	const reports = diagnostics
		.filter((diagnostic: { code: string }) =>
			diagnostic.code.startsWith("raula("),
		)
		.map((diagnostic: { code: string; filename: string }) => ({
			filename: diagnostic.filename,
			rule: diagnostic.code.replace(/^raula\(([^)]+)\)$/, "$1"),
		}));

	// exhaustive-tailwind-classes and no-await-in-layout have no oxlint-plugin-raula
	// equivalent yet (see packages/oxlint-plugin-raula/README.md) — they are not
	// exercised by this fixture. See stylelint-output.test.ts for the CSS rules.
	expect(reports).toHaveLength(2);

	expect(reports).toContainEqual({
		filename: "app/page.tsx",
		rule: "no-inline-style-prop",
	});
	expect(reports).toContainEqual({
		filename: "app/page.tsx",
		rule: "no-css-modules",
	});
});

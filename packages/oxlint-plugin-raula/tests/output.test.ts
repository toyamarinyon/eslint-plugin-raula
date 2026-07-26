import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dir, "..");

test("raula oxlint plugin reports fixture violations", () => {
	const result = spawnSync(
		process.execPath,
		[
			"node_modules/.bin/oxlint",
			"--config",
			"fixtures/.oxlintrc.json",
			"--format",
			"json",
			"fixtures/app/page.tsx",
		],
		{
			cwd: packageRoot,
			encoding: "utf8",
		},
	);

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

	expect(reports).toHaveLength(2);

	expect(reports).toContainEqual({
		filename: "fixtures/app/page.tsx",
		rule: "no-inline-style-prop",
	});
	expect(reports).toContainEqual({
		filename: "fixtures/app/page.tsx",
		rule: "no-css-modules",
	});
});

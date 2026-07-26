import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("raula css preset reports fixture violations", async () => {
	const outputDir = await mkdtemp(join(tmpdir(), "raula-stylelint-output-"));
	const outputFile = join(outputDir, "results.json");

	try {
		const result = spawnSync(
			process.execPath,
			[
				"node_modules/.bin/stylelint",
				"app/globals.css",
				"--formatter",
				"json",
				"--output-file",
				outputFile,
			],
			{
				cwd: import.meta.dir,
				encoding: "utf8",
			},
		);

		expect(result.error).toBeUndefined();
		expect(result.status).not.toBe(0);

		const output = await readFile(outputFile, "utf8");
		const results = JSON.parse(output);
		const reports = results.flatMap((fileResult) =>
			fileResult.warnings
				.filter((warning) => warning.rule?.startsWith("raula/"))
				.map((warning) => ({
					source: fileResult.source,
					warning,
				})),
		);

		expect(reports).toHaveLength(3);

		expect(reports).toContainEqual(
			expect.objectContaining({
				source: expect.stringMatching(/\/app\/globals\.css$/),
				warning: expect.objectContaining({
					rule: "raula/exhaustive-tailwind-theme-tokens",
					severity: "error",
				}),
			}),
		);
		expect(reports).toContainEqual(
			expect.objectContaining({
				source: expect.stringMatching(/\/app\/globals\.css$/),
				warning: expect.objectContaining({
					rule: "raula/no-disallowed-global-class-selectors",
					severity: "error",
				}),
			}),
		);
		expect(reports).toContainEqual(
			expect.objectContaining({
				source: expect.stringMatching(/\/app\/globals\.css$/),
				warning: expect.objectContaining({
					rule: "raula/no-document-element-styles-in-css",
					severity: "error",
				}),
			}),
		);
	} finally {
		await rm(outputDir, { recursive: true, force: true });
	}
});

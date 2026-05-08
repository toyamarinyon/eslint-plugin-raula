import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("raula presets report fixture violations", () => {
	const result = spawnSync(
		process.execPath,
		["node_modules/.bin/eslint", "--format", "json"],
		{
			cwd: import.meta.dir,
			encoding: "utf8",
		},
	);

	expect(result.status).not.toBe(0);

	const results = JSON.parse(result.stdout);
	const reports = results.flatMap((fileResult) =>
		fileResult.messages
			.filter((message) => message.ruleId?.startsWith("raula/"))
			.map((message) => ({
				filePath: fileResult.filePath,
				message,
			})),
	);

	expect(reports).toHaveLength(7);

	expect(reports).toContainEqual(
		expect.objectContaining({
			filePath: expect.stringMatching(/\/app\/globals\.css$/),
			message: expect.objectContaining({
				ruleId: "raula/exhaustive-tailwind-theme-tokens",
				severity: 2,
			}),
		}),
	);
	expect(reports).toContainEqual(
		expect.objectContaining({
			filePath: expect.stringMatching(/\/app\/globals\.css$/),
			message: expect.objectContaining({
				ruleId: "raula/no-disallowed-global-class-selectors",
				severity: 2,
			}),
		}),
	);
	expect(reports).toContainEqual(
		expect.objectContaining({
			filePath: expect.stringMatching(/\/app\/globals\.css$/),
			message: expect.objectContaining({
				ruleId: "raula/no-document-element-styles-in-css",
				severity: 2,
			}),
		}),
	);
	expect(reports).toContainEqual(
		expect.objectContaining({
			filePath: expect.stringMatching(/\/app\/layout\.tsx$/),
			message: expect.objectContaining({
				ruleId: "raula/no-await-in-layout",
				severity: 2,
			}),
		}),
	);
	expect(reports).toContainEqual(
		expect.objectContaining({
			filePath: expect.stringMatching(/\/app\/page\.tsx$/),
			message: expect.objectContaining({
				ruleId: "raula/exhaustive-tailwind-classes",
				severity: 2,
			}),
		}),
	);
	expect(reports).toContainEqual(
		expect.objectContaining({
			filePath: expect.stringMatching(/\/app\/page\.tsx$/),
			message: expect.objectContaining({
				ruleId: "raula/no-inline-style-prop",
				severity: 2,
			}),
		}),
	);
	expect(reports).toContainEqual(
		expect.objectContaining({
			filePath: expect.stringMatching(/\/app\/page\.module\.css$/),
			message: expect.objectContaining({
				ruleId: "raula/no-css-modules",
				severity: 2,
			}),
		}),
	);
});

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("raula/no-css-modules reports the fixture CSS module", () => {
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
	const cssModuleReports = results.flatMap((fileResult) =>
		fileResult.messages
			.filter((message) => message.ruleId === "raula/no-css-modules")
			.map((message) => ({
				filePath: fileResult.filePath,
				message,
			})),
	);

	expect(cssModuleReports).toHaveLength(1);

	const [report] = cssModuleReports;
	expect(report.filePath.endsWith("/app/page.module.css")).toBe(true);
	expect(report.message.severity).toBe(2);
});

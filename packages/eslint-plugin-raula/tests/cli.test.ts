import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";

import {
	findEslintConfig,
	getAgentsFileUpdate,
	install,
	updateEslintConfig,
} from "../cli";

const createNextConfig = `import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
`;

function createWritableBuffer() {
	let output = "";
	return {
		stream: new Writable({
			write(chunk, _encoding, callback) {
				output += chunk.toString();
				callback();
			},
		}),
		get output() {
			return output;
		},
	};
}

describe("eslint-plugin-raula CLI", () => {
	test("adds Raula presets to create-next flat config", () => {
		const updated = updateEslintConfig(createNextConfig);

		expect(
			updated,
		).toBe(`import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import raulaTailwind from "eslint-plugin-raula/tailwind";
import raulaNextLayout from "eslint-plugin-raula/next-layout";

const eslintConfig = defineConfig([
  ...raulaTailwind,
  ...raulaNextLayout,
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
`);
		expect(updateEslintConfig(updated)).toBe(updated);
	});

	test("adds Raula presets to export default array flat config", () => {
		const source = `export default [
\t{
\t\trules: {},
\t},
];
`;

		const updated = updateEslintConfig(source);

		expect(updated).toContain(
			'import raulaTailwind from "eslint-plugin-raula/tailwind";',
		);
		expect(updated).toContain(
			'import raulaNextLayout from "eslint-plugin-raula/next-layout";',
		);
		expect(updated).toContain("\t...raulaTailwind,\n\t...raulaNextLayout,");
	});

	test("throws for unsupported config shapes", () => {
		expect(() =>
			updateEslintConfig("export default function config() { return []; }"),
		).toThrow("Could not find a supported flat config array");
	});

	test("finds every root ESLint config candidate", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "raula-cli-"));
		await writeFile(join(cwd, "eslint.config.mjs"), "export default [];");
		await writeFile(join(cwd, "eslint.config.js"), "export default [];");

		const configs = await findEslintConfig(cwd);

		expect(configs.map((config) => config.split("/").at(-1))).toEqual([
			"eslint.config.js",
			"eslint.config.mjs",
		]);
	});

	test("keeps managed AGENTS block idempotent", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "raula-cli-"));
		await writeFile(
			join(cwd, "AGENTS.md"),
			[
				"# Local instructions",
				"",
				"<!-- eslint-plugin-raula-instruct-start -->",
				"<!-- Managed by `eslint-plugin-raula instruct` -->",
				"Before editing files that touch styling, JSX className usage, global CSS selectors, or Next.js layout files, read:",
				"`./node_modules/eslint-plugin-raula/REFERENCE.md`",
				"This block is supplemental and should complement, not override, local project instructions.",
				"<!-- eslint-plugin-raula-instruct-end -->",
				"",
			].join("\n"),
		);

		const update = await getAgentsFileUpdate(cwd);

		expect(update.next).toBe(update.existing);
	});

	test("accepts piped yes answers for ESLint config and AGENTS prompts", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "raula-cli-"));
		await writeFile(join(cwd, "eslint.config.mjs"), createNextConfig);
		await writeFile(join(cwd, "AGENTS.md"), "# Local instructions\n");
		const output = createWritableBuffer();

		await install(cwd, {
			input: Readable.from(["y\ny\n"]),
			output: output.stream,
		});

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");

		expect(eslintConfig).toContain(
			'import raulaTailwind from "eslint-plugin-raula/tailwind";',
		);
		expect(eslintConfig).toContain(
			'import raulaNextLayout from "eslint-plugin-raula/next-layout";',
		);
		expect(eslintConfig).toContain(
			"  ...raulaTailwind,\n  ...raulaNextLayout,\n  ...nextVitals,",
		);
		expect(agents).toContain("<!-- eslint-plugin-raula-instruct-start -->");
		expect(output.output).toContain("Apply ESLint config changes?");
		expect(output.output).toContain(
			"Update AGENTS.md with Raula instructions?",
		);
	});
});

import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	findEslintConfig,
	getAgentsFileUpdate,
	install,
	runCli,
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

type MockUi = {
	confirmCalls: number;
	errors: string[];
	outros: string[];
	cancels: string[];
	ui: {
		intro(message: string): void;
		outro(message: string): void;
		info(message: string): void;
		warn(message: string): void;
		error(message: string): void;
		cancel(message: string): void;
		progress(message: string): void;
		confirm(message: string): Promise<boolean | "cancel">;
	};
};

function createMockUi(confirmAnswers: Array<boolean | "cancel"> = []): MockUi {
	let confirmCalls = 0;
	const errors: string[] = [];
	const outros: string[] = [];
	const cancels: string[] = [];

	return {
		get confirmCalls() {
			return confirmCalls;
		},
		errors,
		outros,
		cancels,
		ui: {
			intro() {},
			outro(message: string) {
				outros.push(message);
			},
			info() {},
			warn() {},
			error(message: string) {
				errors.push(message);
			},
			cancel(message: string) {
				cancels.push(message);
			},
			progress() {},
			async confirm() {
				confirmCalls += 1;
				const next = confirmAnswers.shift();
				return next ?? false;
			},
		},
	};
}

function stripAnsi(value: string | undefined): string {
	return value?.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "") ?? "";
}

async function setupInstallFixture() {
	const cwd = await mkdtemp(join(tmpdir(), "raula-cli-"));
	await writeFile(join(cwd, "eslint.config.mjs"), createNextConfig);
	await writeFile(join(cwd, "AGENTS.md"), "# Local instructions\n");
	return { cwd };
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

	test("preserves 2-space indentation for create-next style config", () => {
		const updated = updateEslintConfig(createNextConfig);

		expect(updated).toContain(
			"  ...raulaTailwind,\n  ...raulaNextLayout,\n  ...nextVitals,",
		);
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

	test("uses tab indentation for tab-indented config arrays", () => {
		const source = `import { defineConfig } from "eslint/config";

const eslintConfig = defineConfig([
\t{
\t\trules: {},
\t},
]);

export default eslintConfig;
`;

		const updated = updateEslintConfig(source);

		expect(updated).toContain(
			"\t...raulaTailwind,\n\t...raulaNextLayout,\n\t{",
		);
	});

	test("uses 4-space indentation for 4-space-indented config arrays", () => {
		const source = `import { defineConfig } from "eslint/config";

const eslintConfig = defineConfig([
    {
        rules: {},
    },
]);

export default eslintConfig;
`;

		const updated = updateEslintConfig(source);

		expect(updated).toContain(
			"    ...raulaTailwind,\n    ...raulaNextLayout,\n    {",
		);
	});

	test("uses detected file indentation for empty defineConfig array", () => {
		const source = `import { defineConfig } from "eslint/config";

function noop() {
    return true;
}

export default defineConfig([]);
`;

		const updated = updateEslintConfig(source);

		expect(updated).toContain("defineConfig([\n    ...raulaTailwind,");
		expect(updated).toContain("    ...raulaNextLayout,");
	});

	test("falls back to 2 spaces when indentation cannot be detected", () => {
		const source = "export default [];\n";

		const updated = updateEslintConfig(source);

		expect(updated).toContain("export default [\n  ...raulaTailwind,");
		expect(updated).toContain("  ...raulaNextLayout,");
	});

	test("empty config array ignores later indented blocks when inferring array item indentation", () => {
		const source = `const values = [1];

export default defineConfig([]);

if (values.length > 0) {
        console.log("later 8-space-indented block");
}
`;

		const updated = updateEslintConfig(source);

		expect(updated).toContain("defineConfig([\n    ...raulaTailwind,");
		expect(updated).toContain("    ...raulaNextLayout,");
		expect(updated).not.toContain("defineConfig([\n        ...raulaTailwind,");
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
				"<!-- eslint-plugin-raula-start -->",
				"<!-- Managed by `eslint-plugin-raula install` -->",
				"Before editing files that touch styling, JSX className usage, global CSS selectors, or Next.js layout files, read:",
				"`./node_modules/eslint-plugin-raula/REFERENCE.md`",
				"This block is supplemental and should complement, not override, local project instructions.",
				"<!-- eslint-plugin-raula-end -->",
				"",
			].join("\n"),
		);

		const update = await getAgentsFileUpdate(cwd);

		expect(update.next).toBe(update.existing);
	});

	test("--eslint --agents-md updates both targets without prompting", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();

		await install(cwd, {
			options: { eslint: true, agentsMd: true },
			ui: mock.ui,
		});

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(eslintConfig).toContain(
			'import raulaTailwind from "eslint-plugin-raula/tailwind";',
		);
		expect(agents).toContain("<!-- eslint-plugin-raula-start -->");
		expect(mock.confirmCalls).toBe(0);
		expect(stripAnsi(mock.outros.at(-1))).toContain(
			"Success! Updated ESLint config and AGENTS.md.",
		);
	});

	test("--eslint --no-agents-md updates only ESLint config", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();

		await install(cwd, {
			options: { eslint: true, agentsMd: false },
			ui: mock.ui,
		});

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(eslintConfig).toContain(
			'import raulaTailwind from "eslint-plugin-raula/tailwind";',
		);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.confirmCalls).toBe(0);
		expect(stripAnsi(mock.outros.at(-1))).toContain(
			"Success! Updated ESLint config.",
		);
	});

	test("--no-eslint --agents-md updates only AGENTS.md", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();

		await install(cwd, {
			options: { eslint: false, agentsMd: true },
			ui: mock.ui,
		});

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(eslintConfig).not.toContain(
			'import raulaTailwind from "eslint-plugin-raula/tailwind";',
		);
		expect(agents).toContain("<!-- eslint-plugin-raula-start -->");
		expect(mock.confirmCalls).toBe(0);
		expect(stripAnsi(mock.outros.at(-1))).toContain(
			"Success! Updated AGENTS.md.",
		);
	});

	test("--no-eslint --no-agents-md applies no changes", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();

		await install(cwd, {
			options: { eslint: false, agentsMd: false },
			ui: mock.ui,
		});

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(eslintConfig).toBe(createNextConfig);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.confirmCalls).toBe(0);
		expect(mock.outros.at(-1)).toBe("No changes applied.");
	});

	test("--eslint prompts only AGENTS.md when AGENTS option is unspecified", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi([false]);

		await install(cwd, {
			options: { eslint: true, agentsMd: undefined },
			ui: mock.ui,
		});

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(eslintConfig).toContain(
			'import raulaTailwind from "eslint-plugin-raula/tailwind";',
		);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.confirmCalls).toBe(1);
		expect(stripAnsi(mock.outros.at(-1))).toContain(
			"Success! Updated ESLint config.",
		);
	});

	test("cancel during prompt does not update either file", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi(["cancel"]);

		await install(cwd, {
			options: { eslint: undefined, agentsMd: undefined },
			ui: mock.ui,
		});

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(eslintConfig).toBe(createNextConfig);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.confirmCalls).toBe(1);
		expect(mock.cancels.at(-1)).toBe("Cancelled. No changes applied.");
		expect(mock.outros.at(-1)).toBe("No changes applied.");
	});

	test("conflicting options fail and do not update files", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();
		process.exitCode = 0;

		await runCli(
			["node", "eslint-plugin-raula", "install", "--eslint", "--no-eslint"],
			cwd,
			mock.ui,
		);

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(eslintConfig).toBe(createNextConfig);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.errors.at(-1)).toContain("Conflicting options");
		process.exitCode = 0;
	});

	test("unknown option fails and does not update files", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();
		process.exitCode = 0;

		await runCli(
			["node", "eslint-plugin-raula", "install", "--wat"],
			cwd,
			mock.ui,
		);

		const eslintConfig = await readFile(join(cwd, "eslint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(eslintConfig).toBe(createNextConfig);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.errors.at(-1)).toBe("Unknown option: --wat");
		process.exitCode = 0;
	});
});

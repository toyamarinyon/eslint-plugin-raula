import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
	findStylelintConfig,
	getAgentsFileUpdate,
	install,
	runCli,
	updateStylelintConfig,
} from "../cli";

const configWithoutExtends = `/** @type {import('stylelint').Config} */
export default {
  rules: {
    "color-no-invalid-hex": true,
  },
};
`;

const configWithExtendsArray = `export default {
\textends: ["stylelint-config-standard"],
\trules: {},
};
`;

const configWithExtendsString = `export default {
  extends: "stylelint-config-standard",
};
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

async function setupInstallFixture(config = configWithoutExtends) {
	const cwd = await mkdtemp(join(tmpdir(), "raula-stylelint-cli-"));
	await writeFile(join(cwd, "stylelint.config.mjs"), config);
	await writeFile(join(cwd, "AGENTS.md"), "# Local instructions\n");
	return { cwd };
}

describe("stylelint-plugin-raula CLI", () => {
	test("inserts extends array when config has no extends field", () => {
		const updated = updateStylelintConfig(configWithoutExtends);

		expect(updated).toContain('extends: ["stylelint-plugin-raula/css"],');
		expect(updateStylelintConfig(updated)).toBe(updated);
	});

	test("prepends to an existing extends array", () => {
		const updated = updateStylelintConfig(configWithExtendsArray);

		expect(updated).toContain(
			'extends: ["stylelint-plugin-raula/css", "stylelint-config-standard"],',
		);
	});

	test("converts a single extends string into an array", () => {
		const updated = updateStylelintConfig(configWithExtendsString);

		expect(updated).toContain(
			'extends: ["stylelint-plugin-raula/css", "stylelint-config-standard"]',
		);
	});

	test("is idempotent once the preset is present", () => {
		const updated = updateStylelintConfig(configWithoutExtends);
		expect(updateStylelintConfig(updated)).toBe(updated);
	});

	test("throws for unsupported config shapes", () => {
		expect(() =>
			updateStylelintConfig("export default function config() { return {}; }"),
		).toThrow("Could not find a supported stylelint config object");
	});

	test("finds every root stylelint config candidate", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "raula-stylelint-cli-"));
		await writeFile(join(cwd, "stylelint.config.mjs"), "export default {};");
		await writeFile(join(cwd, "stylelint.config.js"), "export default {};");

		const configs = await findStylelintConfig(cwd);

		expect(configs.map((config) => config.split("/").at(-1))).toEqual([
			"stylelint.config.js",
			"stylelint.config.mjs",
		]);
	});

	test("keeps managed AGENTS block idempotent", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "raula-stylelint-cli-"));
		await writeFile(
			join(cwd, "AGENTS.md"),
			[
				"# Local instructions",
				"",
				"<!-- stylelint-plugin-raula-start -->",
				"<!-- Managed by `stylelint-plugin-raula install` -->",
				"Before editing `app/globals.css` or other global stylesheets, read:",
				"`./node_modules/stylelint-plugin-raula/REFERENCE.md`",
				"This block is supplemental and should complement, not override, local project instructions.",
				"<!-- stylelint-plugin-raula-end -->",
				"",
			].join("\n"),
		);

		const update = await getAgentsFileUpdate(cwd);

		expect(update.next).toBe(update.existing);
	});

	test("--stylelint --agents-md updates both targets without prompting", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();

		await install(cwd, {
			options: { stylelint: true, agentsMd: true },
			ui: mock.ui,
		});

		const config = await readFile(join(cwd, "stylelint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(config).toContain('extends: ["stylelint-plugin-raula/css"],');
		expect(agents).toContain("<!-- stylelint-plugin-raula-start -->");
		expect(mock.confirmCalls).toBe(0);
		expect(stripAnsi(mock.outros.at(-1))).toContain(
			"Success! Updated stylelint config and AGENTS.md.",
		);
	});

	test("--stylelint --no-agents-md updates only stylelint config", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();

		await install(cwd, {
			options: { stylelint: true, agentsMd: false },
			ui: mock.ui,
		});

		const config = await readFile(join(cwd, "stylelint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(config).toContain('extends: ["stylelint-plugin-raula/css"],');
		expect(agents).toBe("# Local instructions\n");
		expect(mock.confirmCalls).toBe(0);
		expect(stripAnsi(mock.outros.at(-1))).toContain(
			"Success! Updated stylelint config.",
		);
	});

	test("--no-stylelint --agents-md updates only AGENTS.md", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();

		await install(cwd, {
			options: { stylelint: false, agentsMd: true },
			ui: mock.ui,
		});

		const config = await readFile(join(cwd, "stylelint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(config).not.toContain("stylelint-plugin-raula/css");
		expect(agents).toContain("<!-- stylelint-plugin-raula-start -->");
		expect(mock.confirmCalls).toBe(0);
		expect(stripAnsi(mock.outros.at(-1))).toContain(
			"Success! Updated AGENTS.md.",
		);
	});

	test("--no-stylelint --no-agents-md applies no changes", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();

		await install(cwd, {
			options: { stylelint: false, agentsMd: false },
			ui: mock.ui,
		});

		const config = await readFile(join(cwd, "stylelint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(config).toBe(configWithoutExtends);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.confirmCalls).toBe(0);
		expect(mock.outros.at(-1)).toBe("No changes applied.");
	});

	test("cancel during prompt does not update either file", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi(["cancel"]);

		await install(cwd, {
			options: { stylelint: undefined, agentsMd: undefined },
			ui: mock.ui,
		});

		const config = await readFile(join(cwd, "stylelint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(config).toBe(configWithoutExtends);
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
			[
				"node",
				"stylelint-plugin-raula",
				"install",
				"--stylelint",
				"--no-stylelint",
			],
			cwd,
			mock.ui,
		);

		const config = await readFile(join(cwd, "stylelint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(config).toBe(configWithoutExtends);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.errors.at(-1)).toContain("Conflicting options");
		process.exitCode = 0;
	});

	test("unknown option fails and does not update files", async () => {
		const { cwd } = await setupInstallFixture();
		const mock = createMockUi();
		process.exitCode = 0;

		await runCli(
			["node", "stylelint-plugin-raula", "install", "--wat"],
			cwd,
			mock.ui,
		);

		const config = await readFile(join(cwd, "stylelint.config.mjs"), "utf8");
		const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
		expect(config).toBe(configWithoutExtends);
		expect(agents).toBe("# Local instructions\n");
		expect(mock.errors.at(-1)).toBe("Unknown option: --wat");
		process.exitCode = 0;
	});
});

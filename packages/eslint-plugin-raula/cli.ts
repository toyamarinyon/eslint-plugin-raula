import fs from "node:fs/promises";
import path from "node:path";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";

const START = "<!-- eslint-plugin-raula-start -->";
const END = "<!-- eslint-plugin-raula-end -->";
const AGENTS_FILE = "AGENTS.md";
const REFERENCE_PATH = "./node_modules/eslint-plugin-raula/REFERENCE.md";
const ESLINT_CONFIG_FILES = [
	"eslint.config.js",
	"eslint.config.mjs",
	"eslint.config.cjs",
	"eslint.config.ts",
	"eslint.config.mts",
	"eslint.config.cts",
];
const RAULA_TAILWIND_IMPORT =
	'import raulaTailwind from "eslint-plugin-raula/tailwind";';
const RAULA_NEXT_LAYOUT_IMPORT =
	'import raulaNextLayout from "eslint-plugin-raula/next-layout";';
const RAULA_TAILWIND_SPREAD = "...raulaTailwind,";
const RAULA_NEXT_LAYOUT_SPREAD = "...raulaNextLayout,";

const BLOCK = `${START}\n<!-- Managed by \`eslint-plugin-raula install\` -->\nBefore editing files that touch styling, JSX className usage, global CSS selectors, or Next.js layout files, read:\n\`${REFERENCE_PATH}\`\nThis block is supplemental and should complement, not override, local project instructions.\n${END}`;
const CLEAR_LINE = "\r\x1b[2K";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

const color = {
	cyan: (value: string) => `\x1b[36m${value}\x1b[0m`,
	green: (value: string) => `\x1b[32m${value}\x1b[0m`,
	yellow: (value: string) => `\x1b[33m${value}\x1b[0m`,
	underline: (value: string) => `\x1b[4m${value}\x1b[0m`,
} as const;

function escapeForRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type AgentsFileUpdate = {
	existing: string;
	next: string;
	target: string;
};

type CliUi = {
	intro(message: string): void;
	outro(message: string): void;
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
	cancel(message: string): void;
	progress(message: string): void;
	confirm(message: string): Promise<boolean | "cancel">;
	close?(): void;
};

function createConsoleUi(): CliUi {
	const rl = createInterface({
		input: process.stdin,
		crlfDelay: Number.POSITIVE_INFINITY,
	});
	const lines = rl[Symbol.asyncIterator]();

	return {
		intro(message: string): void {
			console.log(message);
		},
		outro(message: string): void {
			console.log(`\n${message}`);
		},
		info(message: string): void {
			console.log(`${color.green("✔")} ${message}`);
		},
		warn(message: string): void {
			console.warn(`! ${message}`);
		},
		error(message: string): void {
			console.error(`! ${message}`);
		},
		cancel(message: string): void {
			console.log(`× ${message}`);
		},
		progress(message: string): void {
			console.log(`\n${message}`);
		},
		async confirm(message: string): Promise<boolean | "cancel"> {
			if (
				process.stdin.isTTY &&
				process.stdout.isTTY &&
				typeof process.stdin.setRawMode === "function"
			) {
				return confirmWithKeypress(message);
			}

			process.stdout.write(`→ ${message} > Yes / No `);
			const line = await lines.next();
			const answer = line.done ? "" : line.value;
			const normalized = answer.trim().toLowerCase();
			const result =
				normalized === "" || normalized === "y" || normalized === "yes";
			if (process.stdout.isTTY) {
				process.stdout.write("\x1b[1A\x1b[2K");
			} else if (!process.stdin.isTTY) {
				process.stdout.write("\n");
			}
			console.log(`${color.green("✔")} ${message} > ${formatChoices(result)}`);
			return result;
		},
		close(): void {
			rl.close();
		},
	};
}

function formatChoice(label: "No" | "Yes", selected: boolean): string {
	if (!selected) {
		return label;
	}
	return color.underline(color.cyan(label));
}

function formatChoices(selected: boolean): string {
	const no = formatChoice("No", !selected);
	const yes = formatChoice("Yes", selected);
	return `${no} / ${yes}`;
}

function formatEmphasis(value: string): string {
	return color.yellow(value);
}

async function confirmWithKeypress(
	message: string,
	defaultValue = true,
): Promise<boolean | "cancel"> {
	let selected = defaultValue;
	const render = () => {
		process.stdout.write(
			`${CLEAR_LINE}${color.cyan("?")} ${message} ${color.cyan("›")} ${formatChoices(selected)}`,
		);
	};
	const renderDone = () => {
		process.stdout.write(
			`${CLEAR_LINE}${color.green("✔")} ${message} ${color.cyan("›")} ${formatChoices(selected)}\n`,
		);
	};

	emitKeypressEvents(process.stdin);
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdout.write(HIDE_CURSOR);
	render();

	return new Promise((resolve) => {
		const cleanup = () => {
			process.stdin.off("keypress", onKeypress);
			process.stdin.setRawMode(false);
			process.stdout.write(SHOW_CURSOR);
			rlResumeIfNeeded();
		};
		const finish = (value: boolean | "cancel") => {
			cleanup();
			if (value === "cancel") {
				process.stdout.write(`${CLEAR_LINE}`);
			} else {
				renderDone();
			}
			resolve(value);
		};
		const onKeypress = (
			_chunk: string,
			key: { name?: string; ctrl?: boolean },
		) => {
			if (key.ctrl && key.name === "c") {
				finish("cancel");
				return;
			}
			if (key.name === "left" || key.name === "right") {
				selected = !selected;
				render();
				return;
			}
			if (key.name === "tab") {
				selected = !selected;
				render();
				return;
			}
			if (key.name === "return" || key.name === "enter") {
				finish(selected);
			}
		};

		process.stdin.on("keypress", onKeypress);
	});
}

function rlResumeIfNeeded(): void {
	if (!process.stdin.isPaused()) {
		return;
	}
	process.stdin.resume();
}

type InstallOptionValue = boolean | undefined;

type InstallOptions = {
	eslint: InstallOptionValue;
	agentsMd: InstallOptionValue;
};

type InstallInput = {
	options?: InstallOptions;
	ui?: CliUi;
};

const defaultInstallOptions: InstallOptions = {
	eslint: undefined,
	agentsMd: undefined,
};

export async function getAgentsFileUpdate(
	cwd: string,
): Promise<AgentsFileUpdate> {
	const target = path.join(cwd, AGENTS_FILE);
	const existing = await fs.readFile(target, "utf8").catch(() => "");
	const blockRegex = new RegExp(
		`${escapeForRegExp(START)}[\\s\\S]*?${escapeForRegExp(END)}\\s*`,
		"g",
	);

	const next = blockRegex.test(existing)
		? existing.replace(blockRegex, BLOCK)
		: `${existing.trimEnd()}\n\n${BLOCK}\n`;

	return { existing, next: `${next.trimEnd()}\n`, target };
}

export async function findEslintConfig(cwd: string): Promise<string[]> {
	const found: string[] = [];
	for (const file of ESLINT_CONFIG_FILES) {
		const target = path.join(cwd, file);
		const stat = await fs.stat(target).catch(() => undefined);
		if (stat?.isFile()) {
			found.push(target);
		}
	}
	return found;
}

function findMatchingBracket(source: string, openIndex: number): number {
	let depth = 0;
	let quote: '"' | "'" | "`" | undefined;
	let escaped = false;
	let lineComment = false;
	let blockComment = false;

	for (let index = openIndex; index < source.length; index += 1) {
		const current = source[index];
		const next = source[index + 1];

		if (lineComment) {
			if (current === "\n") {
				lineComment = false;
			}
			continue;
		}

		if (blockComment) {
			if (current === "*" && next === "/") {
				blockComment = false;
				index += 1;
			}
			continue;
		}

		if (quote) {
			if (escaped) {
				escaped = false;
			} else if (current === "\\") {
				escaped = true;
			} else if (current === quote) {
				quote = undefined;
			}
			continue;
		}

		if (current === "/" && next === "/") {
			lineComment = true;
			index += 1;
			continue;
		}

		if (current === "/" && next === "*") {
			blockComment = true;
			index += 1;
			continue;
		}

		if (current === '"' || current === "'" || current === "`") {
			quote = current;
			continue;
		}

		if (current === "[") {
			depth += 1;
		} else if (current === "]") {
			depth -= 1;
			if (depth === 0) {
				return index;
			}
		}
	}

	return -1;
}

function findConfigArray(source: string): number {
	const defineConfigMatch = /defineConfig\s*\(\s*\[/.exec(source);
	if (defineConfigMatch) {
		return source.indexOf("[", defineConfigMatch.index);
	}

	const exportDefaultMatch = /export\s+default\s+\[/.exec(source);
	if (exportDefaultMatch) {
		return source.indexOf("[", exportDefaultMatch.index);
	}

	return -1;
}

function getLineIndent(source: string, index: number): string {
	const lineStart = source.lastIndexOf("\n", index) + 1;
	const match = /^[\t ]*/.exec(source.slice(lineStart));
	return match?.[0] ?? "";
}

function detectIndentUnit(source: string): string {
	const indents = source.match(/^[ \t]+(?=\S)/gm) ?? [];
	let tabIndentedLines = 0;
	const spaceIndentLengths: number[] = [];

	for (const indent of indents) {
		if (indent.includes("\t")) {
			tabIndentedLines += 1;
			continue;
		}
		spaceIndentLengths.push(indent.length);
	}

	if (tabIndentedLines > 0) {
		return "\t";
	}

	if (spaceIndentLengths.length === 0) {
		return "  ";
	}

	const scoreFor = (size: number): number =>
		spaceIndentLengths.filter((length) => length % size === 0).length;
	const score2 = scoreFor(2);
	const score4 = scoreFor(4);

	if (score4 > 0 && score4 >= score2) {
		return "    ";
	}
	if (score2 > 0) {
		return "  ";
	}

	return "  ";
}

function getArrayItemIndent(
	source: string,
	openIndex: number,
	closeIndex: number,
	indentUnit: string,
): string {
	const lineIndent = getLineIndent(source, openIndex);
	const arrayBody = source.slice(openIndex + 1, closeIndex);
	const firstItemIndent = /^\n([ \t]+)\S/m.exec(arrayBody);
	return firstItemIndent?.[1] ?? `${lineIndent}${indentUnit}`;
}

function insertImports(source: string): string {
	const imports: string[] = [];
	const next = source;

	if (!/["']eslint-plugin-raula\/tailwind["']/.test(next)) {
		imports.push(RAULA_TAILWIND_IMPORT);
	}
	if (!/["']eslint-plugin-raula\/next-layout["']/.test(next)) {
		imports.push(RAULA_NEXT_LAYOUT_IMPORT);
	}
	if (imports.length === 0) {
		return next;
	}

	const importMatches = [...next.matchAll(/^import[\s\S]*?;/gm)];
	if (importMatches.length === 0) {
		return `${imports.join("\n")}\n\n${next}`;
	}

	const lastImport = importMatches.at(-1);
	if (!lastImport || lastImport.index === undefined) {
		return `${imports.join("\n")}\n\n${next}`;
	}

	const insertAt = lastImport.index + lastImport[0].length;
	return `${next.slice(0, insertAt)}\n${imports.join("\n")}${next.slice(insertAt)}`;
}

function insertPresetSpreads(source: string): string {
	let next = source;
	const openIndex = findConfigArray(next);
	if (openIndex === -1) {
		throw new Error(
			"Could not find a supported flat config array. Please update your ESLint config manually.",
		);
	}

	const closeIndex = findMatchingBracket(next, openIndex);
	if (closeIndex === -1) {
		throw new Error(
			"Could not parse the ESLint config array. Please update your ESLint config manually.",
		);
	}

	const body = next.slice(openIndex + 1, closeIndex);
	const spreads: string[] = [];
	if (!body.includes(RAULA_TAILWIND_SPREAD)) {
		spreads.push(RAULA_TAILWIND_SPREAD);
	}
	if (!body.includes(RAULA_NEXT_LAYOUT_SPREAD)) {
		spreads.push(RAULA_NEXT_LAYOUT_SPREAD);
	}
	if (spreads.length === 0) {
		return next;
	}

	const indentUnit = detectIndentUnit(next);
	const itemIndent = getArrayItemIndent(
		next,
		openIndex,
		closeIndex,
		indentUnit,
	);
	const insertion = `\n${spreads.map((spread) => `${itemIndent}${spread}`).join("\n")}`;
	next = `${next.slice(0, openIndex + 1)}${insertion}${next.slice(openIndex + 1)}`;
	return next;
}

export function updateEslintConfig(source: string): string {
	let next = insertImports(source);
	next = insertPresetSpreads(next);
	return next;
}

function formatUpdatedTargets(targets: string[]): string {
	if (targets.length === 0) {
		return "";
	}
	if (targets.length === 1) {
		return targets[0]!;
	}
	return `${targets.slice(0, -1).join(", ")} and ${targets.at(-1)}`;
}

function getPendingUpdate(existing: string, next: string): boolean {
	return existing !== next;
}

function parseInstallOptions(args: string[]): InstallOptions {
	const options: InstallOptions = { ...defaultInstallOptions };

	for (const arg of args) {
		if (arg === "--eslint") {
			if (options.eslint === false) {
				throw new Error("Conflicting options: --eslint and --no-eslint");
			}
			options.eslint = true;
			continue;
		}
		if (arg === "--no-eslint") {
			if (options.eslint === true) {
				throw new Error("Conflicting options: --eslint and --no-eslint");
			}
			options.eslint = false;
			continue;
		}
		if (arg === "--agents-md") {
			if (options.agentsMd === false) {
				throw new Error("Conflicting options: --agents-md and --no-agents-md");
			}
			options.agentsMd = true;
			continue;
		}
		if (arg === "--no-agents-md") {
			if (options.agentsMd === true) {
				throw new Error("Conflicting options: --agents-md and --no-agents-md");
			}
			options.agentsMd = false;
			continue;
		}
		throw new Error(`Unknown option: ${arg}`);
	}

	return options;
}

export async function install(
	cwd: string,
	input: InstallInput = {},
): Promise<void> {
	const ui = input.ui ?? createConsoleUi();
	const options = input.options ?? defaultInstallOptions;
	try {
		ui.intro("Installing eslint-plugin-raula...");

		const configs = await findEslintConfig(cwd);
		if (configs.length === 0) {
			ui.warn(
				`No ESLint flat config found. Looked for: ${ESLINT_CONFIG_FILES.join(", ")}`,
			);
			ui.outro("No changes applied.");
			return;
		}
		if (configs.length > 1) {
			ui.warn(
				"Multiple ESLint config files found. Please keep one or update manually:",
			);
			for (const config of configs) {
				ui.warn(`- ${path.relative(cwd, config)}`);
			}
			ui.outro("No changes applied.");
			return;
		}

		const [configFile] = configs;
		if (!configFile) {
			return;
		}

		const configBefore = await fs.readFile(configFile, "utf8");
		let configAfter: string;
		try {
			configAfter = updateEslintConfig(configBefore);
		} catch (error) {
			if (error instanceof Error) {
				ui.warn(error.message);
			}
			ui.outro("No changes applied.");
			return;
		}

		ui.info(`Found ESLint config: ${path.relative(cwd, configFile)}`);

		const configPending = getPendingUpdate(configBefore, configAfter);
		if (!configPending) {
			ui.info(`${path.basename(configFile)} already includes Raula presets.`);
		}

		const agentsUpdate = await getAgentsFileUpdate(cwd);
		const agentsPending = getPendingUpdate(
			agentsUpdate.existing,
			agentsUpdate.next,
		);
		if (!agentsPending) {
			ui.info("AGENTS.md already includes the Raula reference block.");
		}

		if (!configPending && !agentsPending) {
			ui.outro("Everything is already up to date.");
			return;
		}

		let shouldUpdateConfig = false;
		let shouldUpdateAgents = false;

		if (configPending) {
			if (options.eslint !== undefined) {
				shouldUpdateConfig = options.eslint;
			} else {
				const result = await ui.confirm(
					`Would you like to update ${formatEmphasis(path.relative(cwd, configFile))} with Raula presets?`,
				);
				if (result === "cancel") {
					ui.cancel("Cancelled. No changes applied.");
					ui.outro("No changes applied.");
					return;
				}
				shouldUpdateConfig = result;
			}
		}

		if (agentsPending) {
			if (options.agentsMd !== undefined) {
				shouldUpdateAgents = options.agentsMd;
			} else {
				const result = await ui.confirm(
					`Would you like to update ${formatEmphasis(AGENTS_FILE)} with Raula instructions?`,
				);
				if (result === "cancel") {
					ui.cancel("Cancelled. No changes applied.");
					ui.outro("No changes applied.");
					return;
				}
				shouldUpdateAgents = result;
			}
		}

		const updatedTargets: string[] = [];
		if (shouldUpdateConfig || shouldUpdateAgents) {
			ui.progress("Updating...");
		}
		if (shouldUpdateConfig) {
			await fs.writeFile(configFile, configAfter, "utf8");
			updatedTargets.push("ESLint config");
		}
		if (shouldUpdateAgents) {
			await fs.writeFile(agentsUpdate.target, agentsUpdate.next, "utf8");
			updatedTargets.push("AGENTS.md");
		}

		if (updatedTargets.length > 0) {
			ui.outro(
				`${color.green("Success!")} Updated ${formatUpdatedTargets(updatedTargets)}.`,
			);
		} else {
			ui.outro("No changes applied.");
		}
	} finally {
		ui.close?.();
	}
}

function showUsage(): void {
	console.log("Usage: eslint-plugin-raula install [options]");
	console.log("");
	console.log("Options:");
	console.log("  --eslint       Update ESLint config without prompting");
	console.log("  --no-eslint    Skip ESLint config update without prompting");
	console.log("  --agents-md    Update AGENTS.md without prompting");
	console.log("  --no-agents-md Skip AGENTS.md update without prompting");
}

export async function runCli(
	argv = process.argv,
	cwd = process.cwd(),
	ui?: CliUi,
): Promise<void> {
	const command = argv[2];
	if (command === "install") {
		const installUi = ui ?? createConsoleUi();
		try {
			const options = parseInstallOptions(argv.slice(3));
			await install(cwd, { options, ui: installUi });
			return;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Invalid install options.";
			installUi.error(message);
			installUi.close?.();
			process.exitCode = 1;
			return;
		}
	}

	showUsage();
	process.exitCode = 1;
}

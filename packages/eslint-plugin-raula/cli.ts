import fs from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

const START = "<!-- eslint-plugin-raula-instruct-start -->";
const END = "<!-- eslint-plugin-raula-instruct-end -->";
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

const BLOCK = `${START}\n<!-- Managed by \`eslint-plugin-raula instruct\` -->\nBefore editing files that touch styling, JSX className usage, global CSS selectors, or Next.js layout files, read:\n\`${REFERENCE_PATH}\`\nThis block is supplemental and should complement, not override, local project instructions.\n${END}`;

const colors = {
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	cyan: "\x1b[36m",
	dim: "\x1b[2m",
	reset: "\x1b[0m",
} as const;

function color(value: string, code: string): string {
	return `${code}${value}${colors.reset}`;
}

const log = {
	info(message: string): void {
		console.log(`${color("info", colors.cyan)} ${message}`);
	},
	success(message: string): void {
		console.log(`${color("success", colors.green)} ${message}`);
	},
	warn(message: string): void {
		console.warn(`${color("warn", colors.yellow)} ${message}`);
	},
};

function escapeForRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type AgentsFileUpdate = {
	existing: string;
	next: string;
	target: string;
};

type CliIO = {
	input: Readable;
	output: Writable;
};

type PromptSession = {
	ask(question: string): Promise<string>;
	close(): void;
};

const defaultIO: CliIO = {
	input: process.stdin,
	output: process.stdout,
};

function createPromptSession(io: CliIO): PromptSession {
	const rl = createInterface({
		input: io.input,
		crlfDelay: Number.POSITIVE_INFINITY,
	});
	const lines = rl[Symbol.asyncIterator]();

	return {
		async ask(question: string): Promise<string> {
			io.output.write(question);
			const answer = await lines.next();
			return answer.done ? "" : answer.value;
		},
		close(): void {
			rl.close();
		},
	};
}

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

export async function updateAgentsFile(cwd: string): Promise<void> {
	const { next, target } = await getAgentsFileUpdate(cwd);
	await fs.writeFile(target, next, "utf8");
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

function getArrayItemIndent(source: string, openIndex: number): string {
	const lineIndent = getLineIndent(source, openIndex);
	const bodyStart = source.slice(openIndex + 1);
	const firstItemIndent = /^\n([ \t]+)\S/m.exec(bodyStart);
	return firstItemIndent?.[1] ?? `${lineIndent}\t`;
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

	const itemIndent = getArrayItemIndent(next, openIndex);
	const insertion = `\n${spreads.map((spread) => `${itemIndent}${spread}`).join("\n")}`;
	next = `${next.slice(0, openIndex + 1)}${insertion}${next.slice(openIndex + 1)}`;
	return next;
}

export function updateEslintConfig(source: string): string {
	let next = insertImports(source);
	next = insertPresetSpreads(next);
	return next;
}

function createUnifiedDiff(
	file: string,
	before: string,
	after: string,
): string {
	if (before === after) {
		return color(`No changes for ${file}`, colors.dim);
	}

	const beforeLines = before.split("\n");
	const afterLines = after.split("\n");
	const table = Array.from({ length: beforeLines.length + 1 }, () =>
		Array.from({ length: afterLines.length + 1 }, () => 0),
	);

	for (
		let beforeIndex = beforeLines.length - 1;
		beforeIndex >= 0;
		beforeIndex -= 1
	) {
		for (
			let afterIndex = afterLines.length - 1;
			afterIndex >= 0;
			afterIndex -= 1
		) {
			table[beforeIndex]![afterIndex] =
				beforeLines[beforeIndex] === afterLines[afterIndex]
					? table[beforeIndex + 1]![afterIndex + 1]! + 1
					: Math.max(
							table[beforeIndex + 1]![afterIndex]!,
							table[beforeIndex]![afterIndex + 1]!,
						);
		}
	}

	const operations: { type: "same" | "added" | "removed"; value: string }[] =
		[];
	let beforeIndex = 0;
	let afterIndex = 0;
	while (beforeIndex < beforeLines.length || afterIndex < afterLines.length) {
		if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
			operations.push({ type: "same", value: beforeLines[beforeIndex]! });
			beforeIndex += 1;
			afterIndex += 1;
		} else if (
			afterIndex < afterLines.length &&
			(beforeIndex === beforeLines.length ||
				table[beforeIndex]![afterIndex + 1]! >=
					table[beforeIndex + 1]![afterIndex]!)
		) {
			operations.push({ type: "added", value: afterLines[afterIndex]! });
			afterIndex += 1;
		} else {
			operations.push({ type: "removed", value: beforeLines[beforeIndex]! });
			beforeIndex += 1;
		}
	}

	const lines = [
		color(`--- ${file}`, colors.dim),
		color(`+++ ${file}`, colors.dim),
	];
	const changedIndexes = new Set<number>();
	for (let index = 0; index < operations.length; index += 1) {
		if (operations[index]!.type !== "same") {
			for (
				let contextIndex = Math.max(0, index - 3);
				contextIndex <= Math.min(operations.length - 1, index + 3);
				contextIndex += 1
			) {
				changedIndexes.add(contextIndex);
			}
		}
	}

	let skipped = false;
	for (let index = 0; index < operations.length; index += 1) {
		if (!changedIndexes.has(index)) {
			skipped = true;
			continue;
		}
		if (skipped) {
			lines.push(color(" ...", colors.dim));
			skipped = false;
		}

		const operation = operations[index]!;
		if (operation.type === "same") {
			lines.push(` ${operation.value}`);
		} else if (operation.type === "added") {
			lines.push(color(`+${operation.value}`, colors.green));
		} else {
			lines.push(color(`-${operation.value}`, colors.red));
		}
	}

	return lines.join("\n");
}

async function confirm(
	prompt: PromptSession,
	question: string,
	defaultValue = false,
): Promise<boolean> {
	const suffix = defaultValue ? "Y/n" : "y/N";
	const answer = await prompt.ask(`${question} (${suffix}) `);
	const normalized = answer.trim().toLowerCase();
	if (normalized === "") {
		return defaultValue;
	}
	return normalized === "y" || normalized === "yes";
}

export async function install(
	cwd: string,
	io: CliIO = defaultIO,
): Promise<void> {
	const configs = await findEslintConfig(cwd);
	if (configs.length === 0) {
		log.warn(
			`No ESLint flat config found. Looked for: ${ESLINT_CONFIG_FILES.join(", ")}`,
		);
		return;
	}
	if (configs.length > 1) {
		log.warn(
			"Multiple ESLint config files found. Please keep one or update manually:",
		);
		for (const config of configs) {
			console.warn(`  - ${path.relative(cwd, config)}`);
		}
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
			log.warn(error.message);
		}
		return;
	}

	if (configBefore === configAfter) {
		log.info(`${path.basename(configFile)} already includes Raula presets.`);
	} else {
		const prompt = createPromptSession(io);
		console.log(
			createUnifiedDiff(
				path.relative(cwd, configFile),
				configBefore,
				configAfter,
			),
		);

		try {
			const shouldUpdateConfig = await confirm(
				prompt,
				"Apply ESLint config changes?",
			);
			if (shouldUpdateConfig) {
				await fs.writeFile(configFile, configAfter, "utf8");
				log.success(`Updated ${path.relative(cwd, configFile)}.`);
			} else {
				log.info("Skipped ESLint config update.");
			}

			const agentsUpdate = await getAgentsFileUpdate(cwd);
			if (agentsUpdate.existing === agentsUpdate.next) {
				log.info("AGENTS.md already includes the Raula reference block.");
				return;
			}

			console.log(
				createUnifiedDiff(
					path.relative(cwd, agentsUpdate.target),
					agentsUpdate.existing,
					agentsUpdate.next,
				),
			);
			const shouldUpdateAgents = await confirm(
				prompt,
				"Update AGENTS.md with Raula instructions?",
			);
			if (shouldUpdateAgents) {
				await fs.writeFile(agentsUpdate.target, agentsUpdate.next, "utf8");
				log.success("Updated AGENTS.md.");
			} else {
				log.info("Skipped AGENTS.md update.");
			}
		} finally {
			prompt.close();
		}
		return;
	}

	const agentsUpdate = await getAgentsFileUpdate(cwd);
	if (agentsUpdate.existing === agentsUpdate.next) {
		log.info("AGENTS.md already includes the Raula reference block.");
		return;
	}

	const prompt = createPromptSession(io);
	try {
		console.log(
			createUnifiedDiff(
				path.relative(cwd, agentsUpdate.target),
				agentsUpdate.existing,
				agentsUpdate.next,
			),
		);
		const shouldUpdateAgents = await confirm(
			prompt,
			"Update AGENTS.md with Raula instructions?",
		);
		if (shouldUpdateAgents) {
			await fs.writeFile(agentsUpdate.target, agentsUpdate.next, "utf8");
			log.success("Updated AGENTS.md.");
		} else {
			log.info("Skipped AGENTS.md update.");
		}
	} finally {
		prompt.close();
	}
}

function showUsage(): void {
	console.log("Usage: eslint-plugin-raula <command>");
	console.log("");
	console.log("Commands:");
	console.log("  install   Update ESLint flat config and optionally AGENTS.md");
	console.log(
		"  instruct  Update AGENTS.md with a managed Raula reference block",
	);
}

export async function runCli(
	argv = process.argv,
	cwd = process.cwd(),
	io: CliIO = defaultIO,
): Promise<void> {
	const command = argv[2];
	if (command === "install") {
		await install(cwd, io);
		return;
	}

	if (command === "instruct") {
		await updateAgentsFile(cwd);
		log.success("Updated AGENTS.md with eslint-plugin-raula reference block.");
		return;
	}

	showUsage();
	process.exitCode = 1;
}

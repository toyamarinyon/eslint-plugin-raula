import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ruleDocs } from "../rules";
import type { RuleDoc } from "../rules/docs";

type PresetMeta = {
	name: string;
	file: string;
	glob: string;
};

type ExampleWithLanguage = {
	label: string;
	code: string;
	language: string;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const referencesDir = path.join(packageRoot, "references");
const generatedNotice =
	"<!-- This file is generated from rule docs. Do not edit directly. -->";

const presetFile = {
	name: "stylelint-plugin-raula/css",
	file: path.join(packageRoot, "css.ts"),
	fallbackGlob: "app/globals.css",
};

const filesPattern = /files\s*:\s*\[(.*?)\]/gs;
const rulePattern = /"raula\/([^"]+)"\s*:/g;
const literalPattern = /["'`]([^"'`]+)["'`]/g;

function extractFiles(source: string): string[] {
	const files = new Set<string>();
	for (const match of source.matchAll(filesPattern)) {
		if (!match[1]) {
			continue;
		}
		for (const item of match[1].matchAll(literalPattern)) {
			files.add(item[1]);
		}
	}

	return [...files];
}

function extractRules(source: string): string[] {
	const rules = new Set<string>();
	for (const match of source.matchAll(rulePattern)) {
		rules.add(match[1]);
	}

	return [...rules].sort();
}

async function buildApplicability(): Promise<Map<string, PresetMeta[]>> {
	const source = await fs.readFile(presetFile.file, "utf8");
	const globs = extractFiles(source);
	const glob = globs.length > 0 ? globs.join(", ") : presetFile.fallbackGlob;
	const rules = extractRules(source);

	const preset: PresetMeta = {
		name: presetFile.name,
		file: presetFile.file,
		glob,
	};

	const map = new Map<string, PresetMeta[]>();
	for (const rule of rules) {
		map.set(rule, [preset]);
	}

	return map;
}

function formatExamples(examples: ExampleWithLanguage[]): string {
	return examples
		.map((example) =>
			[
				`- ${example.label}`,
				"",
				`\`\`\`${example.language}`,
				example.code,
				"```",
			].join("\n"),
		)
		.join("\n\n");
}

function renderRuleDoc(
	name: string,
	meta: RuleDoc,
	applicability: PresetMeta[],
): string {
	const lines =
		applicability.length > 0
			? applicability.map((preset) => `- ${preset.name} (${preset.glob})`)
			: ["- Manual usage only"];

	const options = meta.options
		? `## Options\n\n- ${meta.options.description}\n\n\`\`\`ts\n${meta.options.schema}\n\`\`\``
		: "";

	return [
		generatedNotice,
		"",
		`# raula/${name}`,
		"",
		`- Title: ${meta.title}`,
		`- Category: ${meta.category}`,
		"",
		"## Applicability",
		"",
		...lines,
		"",
		"## Summary",
		"",
		meta.summary,
		"",
		"## Why",
		"",
		meta.why,
		"",
		"## Bad",
		"",
		formatExamples(meta.bad as ExampleWithLanguage[]),
		"",
		"## Good",
		"",
		formatExamples(meta.good as ExampleWithLanguage[]),
		...(options ? ["", options] : []),
		"",
	].join("\n");
}

function renderIndex(
	rulesByName: Record<string, RuleDoc>,
	applicability: Map<string, PresetMeta[]>,
): string {
	const sortedEntries = Object.entries(rulesByName).sort(([nameA], [nameB]) =>
		nameA.localeCompare(nameB),
	);
	const lines = sortedEntries.map(([name, entry]) => {
		const presets = applicability.get(name) ?? [];
		const applies =
			presets.length > 0
				? presets
						.map((preset) => `  - ${preset.name} (files: ${preset.glob})`)
						.join("\n")
				: "  - Manual usage only";

		return `- [raula/${name}](./references/${name}.md) — ${entry.summary}\n${applies}`;
	});

	return [
		generatedNotice,
		"",
		"# stylelint-plugin-raula Reference",
		"",
		"Read this file before editing `app/globals.css` or other global stylesheets.",
		"",
		"## Rules",
		"",
		...lines,
		"",
	].join("\n");
}

async function main() {
	const applicability = await buildApplicability();
	await fs.mkdir(referencesDir, { recursive: true });

	const ruleNames = Object.keys(ruleDocs).sort();
	for (const ruleName of ruleNames) {
		const meta: RuleDoc = ruleDocs[ruleName as keyof typeof ruleDocs];
		await fs.writeFile(
			path.join(referencesDir, `${ruleName}.md`),
			renderRuleDoc(ruleName, meta, applicability.get(ruleName) ?? []),
			"utf8",
		);
	}

	await fs.writeFile(
		path.join(packageRoot, "REFERENCE.md"),
		renderIndex(ruleDocs, applicability),
		"utf8",
	);
}

await main();

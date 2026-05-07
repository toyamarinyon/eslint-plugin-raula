import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ruleDocs } from "../rules";

type PresetMeta = {
	name: string;
	file: string;
	glob: string;
	rules: string[];
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

const presetFiles: Array<Omit<PresetMeta, "rules">> = [
	{
		name: "eslint-plugin-raula/tailwind",
		file: path.join(packageRoot, "tailwind.ts"),
		glob: "**/*.{js,jsx,ts,tsx}, app/globals.css",
	},
	{
		name: "eslint-plugin-raula/next-layout",
		file: path.join(packageRoot, "next-layout.ts"),
		glob: "app/**/layout.{js,jsx,ts,tsx}",
	},
];

const rulePattern = /"raula\/([^\"]+)"\s*:\s*"[^"]+"/g;
const filesPattern = /files\s*:\s*\[(.*?)\]/gs;
const configPattern =
	/files\s*:\s*\[(.*?)\][\s\S]*?rules\s*:\s*{([\s\S]*?)\n\s*},\n\s*}/g;
const literalPattern = /["'`]([^"'`]+)["'`]/g;

function extractFiles(source: string) {
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

function extractRules(source: string) {
	const rules = new Set<string>();
	for (const match of source.matchAll(rulePattern)) {
		rules.add(match[1]);
	}

	return [...rules].sort();
}

function extractConfigEntries(source: string) {
	const entries: Array<{ files: string[]; rules: string[] }> = [];
	for (const match of source.matchAll(configPattern)) {
		const filesSource = match[1];
		const rulesSource = match[2];
		if (!filesSource || !rulesSource) {
			continue;
		}

		entries.push({
			files: [...filesSource.matchAll(literalPattern)].map((item) => item[1]),
			rules: extractRules(rulesSource),
		});
	}

	return entries;
}

async function buildPresetMeta() {
	const withRules = await Promise.all(
		presetFiles.map(async (preset) => {
			const source = await fs.readFile(preset.file, "utf8");
			const entries = extractConfigEntries(source);
			if (entries.length > 0) {
				return entries.map((entry) => ({
					name: preset.name,
					file: preset.file,
					glob: entry.files.length > 0 ? entry.files.join(", ") : preset.glob,
					rules: entry.rules,
				}));
			}

			const sourceGlobs = extractFiles(source);
			return [{
				name: preset.name,
				file: preset.file,
				glob: sourceGlobs.length > 0 ? sourceGlobs.join(", ") : preset.glob,
				rules: extractRules(source),
			}];
		}),
	);

	const map = new Map<string, PresetMeta[]>();
	for (const preset of withRules.flat()) {
		for (const rule of preset.rules) {
			const list = map.get(rule) ?? [];
			list.push(preset);
			list.sort((a, b) => a.name.localeCompare(b.name));
			map.set(rule, list);
		}
	}

	return map;
}

function formatExamples(examples: ExampleWithLanguage[]) {
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
	meta: (typeof ruleDocs)[string],
	applicability: PresetMeta[],
) {
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
	rulesByName: typeof ruleDocs,
	applicability: Map<string, PresetMeta[]>,
) {
	const sortedEntries = Object.entries(rulesByName).toSorted(
		([nameA], [nameB]) => nameA.localeCompare(nameB),
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
		"# eslint-plugin-raula Reference",
		"",
		"Read this file before editing styling, JSX className usage, global CSS, or Next.js layout files.",
		"",
		"## Rules",
		"",
		...lines,
		"",
	].join("\n");
}

async function main() {
	const applicability = await buildPresetMeta();
	await fs.mkdir(referencesDir, { recursive: true });

	for (const ruleName of Object.keys(ruleDocs).toSorted()) {
		const meta = ruleDocs[ruleName];
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

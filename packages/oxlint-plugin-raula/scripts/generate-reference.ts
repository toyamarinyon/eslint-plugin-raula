import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ruleDocs } from "../rules/index.mjs";

type RuleDoc = {
	title: string;
	category: string;
	summary: string;
	why: string;
	bad: Array<{ label: string; code: string; language: string }>;
	good: Array<{ label: string; code: string; language: string }>;
	options?: { description: string; schema: string };
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const referencesDir = path.join(packageRoot, "references");
const generatedNotice =
	"<!-- This file is generated from rule docs. Do not edit directly. -->";

// This package does not ship a config preset yet (unlike eslint-plugin-raula's
// tailwind.ts/next-layout.ts or stylelint-plugin-raula's css.ts), so
// applicability is hand-maintained here rather than parsed from a preset
// source file. Update this if a shareable oxlint config is added later.
const applicability: Record<string, string> = {
	"no-css-modules": "**/*.{js,jsx,ts,tsx}",
	"no-inline-style-prop": "**/*.{js,jsx,ts,tsx}",
};

function formatExamples(
	examples: Array<{ label: string; code: string; language: string }>,
): string {
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

function renderRuleDoc(name: string, meta: RuleDoc): string {
	const glob = applicability[name];
	const lines = glob ? [`- files: ${glob}`] : ["- Manual usage only"];

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
		formatExamples(meta.bad),
		"",
		"## Good",
		"",
		formatExamples(meta.good),
		...(options ? ["", options] : []),
		"",
	].join("\n");
}

function renderIndex(rulesByName: Record<string, RuleDoc>): string {
	const sortedEntries = Object.entries(rulesByName).sort(([nameA], [nameB]) =>
		nameA.localeCompare(nameB),
	);
	const lines = sortedEntries.map(([name, entry]) => {
		const glob = applicability[name];
		const applies = glob ? `  - files: ${glob}` : "  - Manual usage only";

		return `- [raula/${name}](./references/${name}.md) — ${entry.summary}\n${applies}`;
	});

	return [
		generatedNotice,
		"",
		"# oxlint-plugin-raula Reference",
		"",
		"Experimental. Read this file before editing JSX className/style usage or *.module.css imports.",
		"",
		"## Rules",
		"",
		...lines,
		"",
	].join("\n");
}

async function main() {
	await fs.mkdir(referencesDir, { recursive: true });

	const ruleNames = Object.keys(ruleDocs).sort();
	for (const ruleName of ruleNames) {
		const meta: RuleDoc = ruleDocs[ruleName as keyof typeof ruleDocs];
		await fs.writeFile(
			path.join(referencesDir, `${ruleName}.md`),
			renderRuleDoc(ruleName, meta),
			"utf8",
		);
	}

	await fs.writeFile(
		path.join(packageRoot, "REFERENCE.md"),
		renderIndex(ruleDocs),
		"utf8",
	);
}

await main();

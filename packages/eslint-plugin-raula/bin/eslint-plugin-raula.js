#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const START = "<!-- eslint-plugin-raula-instruct-start -->";
const END = "<!-- eslint-plugin-raula-instruct-end -->";
const AGENTS_FILE = "AGENTS.md";
const REFERENCE_PATH = "./node_modules/eslint-plugin-raula/REFERENCE.md";

const BLOCK = `${START}\n<!-- Managed by \`eslint-plugin-raula instruct\` -->\nBefore editing files that touch styling, JSX className usage, global CSS selectors, or Next.js layout files, read:\n\`${REFERENCE_PATH}\`\nThis block is supplemental and should complement, not override, local project instructions.\n${END}`;

function escapeForRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function updateAgentsFile(cwd) {
	const target = path.join(cwd, AGENTS_FILE);
	const existing = await fs.readFile(target, "utf8").catch(() => "");
	const blockRegex = new RegExp(
		`${escapeForRegExp(START)}[\\s\\S]*?${escapeForRegExp(END)}\\s*`,
		"g",
	);

	const next = blockRegex.test(existing)
		? existing.replace(blockRegex, BLOCK)
		: `${existing.trimEnd()}\n\n${BLOCK}\n`;

	await fs.writeFile(target, next, "utf8");
}

function showUsage() {
	console.log("Usage: eslint-plugin-raula instruct");
	console.log(
		"This command updates AGENTS.md in the current working directory with a managed Raula reference block.",
	);
}

async function main() {
	const command = process.argv[2];
	if (command !== "instruct") {
		showUsage();
		process.exitCode = 1;
		return;
	}

	await updateAgentsFile(process.cwd());
	console.log("Updated AGENTS.md with eslint-plugin-raula reference block.");
}

await main();

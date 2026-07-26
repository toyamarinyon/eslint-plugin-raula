import type { Node } from "postcss";
import stylelint, { type Rule } from "stylelint";

import type { RuleDoc } from "./docs";

const {
	createPlugin,
	utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = "raula/exhaustive-tailwind-theme-tokens";

const messages = ruleMessages(ruleName, {
	exhaustiveTailwindThemeTokens: (propertyName: string) =>
		`The token '${propertyName}' must be declared inside an @theme block. Do not define design tokens outside Tailwind's theme source of truth.`,
	nonTailwindThemeNamespace: (propertyName: string) =>
		`The token '${propertyName}' must use a supported Tailwind theme namespace inside @theme.`,
});

const meta = {
	url: "https://github.com/toyamarinyon/eslint-plugin-raula/tree/main/packages/stylelint-plugin-raula",
};

export const docs = {
	title: "Tailwind theme token governance",
	category: "CSS",
	summary:
		"Require CSS custom properties to be declared inside `@theme` blocks and only under supported namespaces.",
	why: "This keeps global design tokens centralized and aligned with Tailwind's theme contract.",
	bad: [
		{
			label: "Token outside @theme",
			code: ":root {\n\t--foreground: 123;\n}",
			language: "css",
		},
		{
			label: "Unsupported namespace",
			code: "@theme {\n\t--random-token: #000;\n}",
			language: "css",
		},
	],
	good: [
		{
			label: "Supported namespaces in @theme",
			code: "@theme {\n\t--color-background: #fff;\n\t--spacing-sm: 0.5rem;\n}",
			language: "css",
		},
	],
	options: {
		description:
			"Add allowlisted custom properties that may remain outside `@theme`.",
		schema: '{\n\tallowCustomProperties: ["--background", "--foreground"]\n}',
	},
} satisfies RuleDoc;

const tailwindThemeTokenNamespaces = {
	exact: new Set([
		"--blur",
		"--drop-shadow",
		"--radius",
		"--shadow",
		"--spacing",
	]),
	prefixes: [
		"--animate-",
		"--aspect-",
		"--blur-",
		"--breakpoint-",
		"--color-",
		"--container-",
		"--default-",
		"--drop-shadow-",
		"--ease-",
		"--font-",
		"--inset-shadow-",
		"--leading-",
		"--perspective-",
		"--radius-",
		"--shadow-",
		"--text-",
		"--text-shadow-",
		"--tracking-",
	],
};

function matchesTailwindThemeTokenNamespace(propertyName: string): boolean {
	return (
		tailwindThemeTokenNamespaces.exact.has(propertyName) ||
		tailwindThemeTokenNamespaces.prefixes.some((prefix) =>
			propertyName.startsWith(prefix),
		)
	);
}

function isInsideThemeAtRule(node: Node): boolean {
	let current: Node | undefined = node.parent as Node | undefined;

	while (current) {
		if (
			current.type === "atrule" &&
			"name" in current &&
			current.name === "theme"
		) {
			return true;
		}

		current = current.parent as Node | undefined;
	}

	return false;
}

type SecondaryOptions = {
	allowCustomProperties?: string[];
};

const isString = (value: unknown): value is string => typeof value === "string";

const rule: Rule<boolean, SecondaryOptions> = (primary, secondaryOptions) => {
	return (root, result) => {
		const validOptions = validateOptions(
			result,
			ruleName,
			{
				actual: primary,
				possible: [true],
			},
			{
				actual: secondaryOptions,
				possible: {
					allowCustomProperties: [isString],
				},
				optional: true,
			},
		);

		if (!validOptions) {
			return;
		}

		const allowCustomProperties = new Set(
			secondaryOptions?.allowCustomProperties ?? [],
		);

		root.walkDecls(/^--/, (decl) => {
			const insideTheme = isInsideThemeAtRule(decl);

			if (insideTheme) {
				if (matchesTailwindThemeTokenNamespace(decl.prop)) {
					return;
				}

				report({
					ruleName,
					result,
					node: decl,
					message: messages.nonTailwindThemeNamespace,
					messageArgs: [decl.prop],
					word: decl.prop,
				});

				return;
			}

			if (allowCustomProperties.has(decl.prop)) {
				return;
			}

			report({
				ruleName,
				result,
				node: decl,
				message: messages.exhaustiveTailwindThemeTokens,
				messageArgs: [decl.prop],
				word: decl.prop,
			});
		});
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

export default createPlugin(ruleName, rule);

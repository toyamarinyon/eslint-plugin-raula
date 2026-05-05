import { defineRule } from "../utils/define-rule";
import type { RuleDoc } from "./docs";

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

function getThemeBlockRanges(sourceText) {
	const ranges = [];
	let searchIndex = 0;

	while (true) {
		const themeIndex = sourceText.indexOf("@theme", searchIndex);

		if (themeIndex === -1) {
			return ranges;
		}

		const blockStart = sourceText.indexOf("{", themeIndex);

		if (blockStart === -1) {
			return ranges;
		}

		let depth = 1;
		let cursor = blockStart + 1;

		while (cursor < sourceText.length && depth > 0) {
			const char = sourceText[cursor];

			if (char === "{") {
				depth += 1;
			} else if (char === "}") {
				depth -= 1;
			}

			cursor += 1;
		}

		ranges.push([themeIndex, cursor]);
		searchIndex = cursor;
	}
}

function isInsideRanges(index, ranges) {
	return ranges.some(([start, end]) => index >= start && index < end);
}

function matchesTailwindThemeTokenNamespace(propertyName) {
	return (
		tailwindThemeTokenNamespaces.exact.has(propertyName) ||
		tailwindThemeTokenNamespaces.prefixes.some((prefix) =>
			propertyName.startsWith(prefix),
		)
	);
}

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
			code: ":root {\n\t@theme {\n\t\t--random-token: #000;\n\t}\n}",
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

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Require design tokens to be declared inside @theme blocks so Tailwind remains the source of truth.",
		},
		schema: [
			{
				type: "object",
				properties: {
					allowCustomProperties: {
						type: "array",
						items: {
							type: "string",
						},
						uniqueItems: true,
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			exhaustiveTailwindThemeTokens:
				"The token '{{propertyName}}' must be declared inside an @theme block. Do not define design tokens outside Tailwind's theme source of truth.",
			nonTailwindThemeNamespace:
				"The token '{{propertyName}}' must use a supported Tailwind theme namespace inside @theme.",
		},
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const sourceText = sourceCode.getText();
		const allowCustomProperties = new Set(
			context.options[0]?.allowCustomProperties ?? [],
		);

		return {
			StyleSheet() {
				const themeBlockRanges = getThemeBlockRanges(sourceText);
				const propertyPattern = /--[a-z0-9-_]+\s*:/g;

				for (const match of sourceText.matchAll(propertyPattern)) {
					if (match.index == null) {
						continue;
					}

					const propertyName = match[0].slice(0, -1).trim();
					const isInsideTheme = isInsideRanges(match.index, themeBlockRanges);

					if (isInsideTheme) {
						if (matchesTailwindThemeTokenNamespace(propertyName)) {
							continue;
						}

						const start = sourceCode.getLocFromIndex(match.index);
						const end = sourceCode.getLocFromIndex(
							match.index + propertyName.length,
						);

						context.report({
							loc: { start, end },
							messageId: "nonTailwindThemeNamespace",
							data: {
								propertyName,
							},
						});
						continue;
					}

					if (allowCustomProperties.has(propertyName)) {
						continue;
					}

					const start = sourceCode.getLocFromIndex(match.index);
					const end = sourceCode.getLocFromIndex(
						match.index + propertyName.length,
					);

					context.report({
						loc: { start, end },
						messageId: "exhaustiveTailwindThemeTokens",
						data: {
							propertyName,
						},
					});
				}
			},
		};
	},
});

import { defineRule } from "../utils/define-rule";
import type { RuleDoc } from "./docs";

export const docs = {
	title: "Controlled global class selectors",
	category: "CSS",
	summary: "Disallow new global class selectors unless explicitly allowlisted.",
	why: "Most styling should be explicit in component context; globals should remain intentional and minimal.",
	bad: [
		{
			label: "Unlisted global class",
			code: ".prose h1 {\n\tfont-size: 2rem;\n}",
			language: "css",
		},
	],
	good: [
		{
			label: "Allowed selector",
			code: ".prose {\n\t--tw-prose-body: var(--color-text);\n}",
			language: "css",
		},
	],
	options: {
		description: "Allowlist explicit selectors that are safe in globals.",
		schema: '{\n\tallowedClassSelectors: ["prose"]\n}',
	},
} satisfies RuleDoc;

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow adding new class selectors to app/globals.css without updating standards.",
		},
		schema: [
			{
				type: "object",
				properties: {
					allowedClassSelectors: {
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
			disallowedGlobalClassSelector:
				"Class selector '.{{className}}' is not in the globals.css allowlist. Prefer Tailwind utilities or explicitly update this standards rule.",
		},
	},
	create(context) {
		const allowedClassSelectors = new Set(
			context.options[0]?.allowedClassSelectors ?? [],
		);

		return {
			ClassSelector(node) {
				if (allowedClassSelectors.has(node.name)) {
					return;
				}

				context.report({
					node,
					messageId: "disallowedGlobalClassSelector",
					data: {
						className: node.name,
					},
				});
			},
		};
	},
});

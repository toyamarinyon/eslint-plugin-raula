import selectorParser from "postcss-selector-parser";
import stylelint, { type Rule } from "stylelint";

import type { RuleDoc } from "./docs";

const {
	createPlugin,
	utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = "raula/no-disallowed-global-class-selectors";

const messages = ruleMessages(ruleName, {
	rejected: (className: string) =>
		`Class selector '.${className}' is not in the globals.css allowlist. Prefer Tailwind utilities or explicitly update this standards rule.`,
});

const meta = {
	url: "https://github.com/toyamarinyon/eslint-plugin-raula/tree/main/packages/stylelint-plugin-raula",
};

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

type SecondaryOptions = {
	allowedClassSelectors?: string[];
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
					allowedClassSelectors: [isString],
				},
				optional: true,
			},
		);

		if (!validOptions) {
			return;
		}

		const allowedClassSelectors = new Set(
			secondaryOptions?.allowedClassSelectors ?? [],
		);

		root.walkRules((ruleNode) => {
			if (!ruleNode.selector) {
				return;
			}

			const parsedSelector = selectorParser().astSync(ruleNode.selector);

			parsedSelector.walkClasses((classNode) => {
				if (allowedClassSelectors.has(classNode.value)) {
					return;
				}

				report({
					ruleName,
					result,
					node: ruleNode,
					message: messages.rejected,
					messageArgs: [classNode.value],
					index: classNode.sourceIndex,
					endIndex: classNode.sourceIndex + classNode.value.length + 1,
				});
			});
		});
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

export default createPlugin(ruleName, rule);

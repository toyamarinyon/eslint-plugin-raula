import selectorParser from "postcss-selector-parser";
import stylelint, { type Rule } from "stylelint";

import type { RuleDoc } from "./docs";

const {
	createPlugin,
	utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = "raula/no-document-element-styles-in-css";

const messages = ruleMessages(ruleName, {
	rejected: (selectorName: string) =>
		`Avoid styling '${selectorName}' in CSS. Prefer moving these styles to the element's className or a more specific owner.`,
});

const meta = {
	url: "https://github.com/toyamarinyon/eslint-plugin-raula/tree/main/packages/stylelint-plugin-raula",
};

export const docs = {
	title: "No direct html/body selector styles",
	category: "CSS",
	summary:
		"Disallow styling `html` and `body` directly in CSS and prefer safer ownership.",
	why: "Direct document element styles increase coupling and obscure where global style ownership comes from.",
	bad: [
		{
			label: "Document element styling",
			code: "html {\n\tfont-size: 18px;\n}",
			language: "css",
		},
	],
	good: [
		{
			label: "Move ownership to wrapper",
			code: '<html suppressHydrationWarning><body className="antialiased bg-white text-black" />',
			language: "tsx",
		},
	],
} satisfies RuleDoc;

const documentElementNames = new Set(["html", "body"]);

const rule: Rule = (primary) => {
	return (root, result) => {
		const validOptions = validateOptions(result, ruleName, {
			actual: primary,
			possible: [true],
		});

		if (!validOptions) {
			return;
		}

		root.walkRules((ruleNode) => {
			if (!ruleNode.selector) {
				return;
			}

			const parsedSelector = selectorParser().astSync(ruleNode.selector);

			parsedSelector.walkTags((tagNode) => {
				const name = tagNode.value.toLowerCase();

				if (!documentElementNames.has(name)) {
					return;
				}

				report({
					ruleName,
					result,
					node: ruleNode,
					message: messages.rejected,
					messageArgs: [tagNode.value],
					index: tagNode.sourceIndex,
					endIndex: tagNode.sourceIndex + tagNode.value.length,
				});
			});
		});
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

export default createPlugin(ruleName, rule);

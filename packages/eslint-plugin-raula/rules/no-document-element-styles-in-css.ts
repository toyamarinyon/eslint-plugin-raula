import { defineRule } from "../utils/define-rule";
import type { RuleDoc } from "./docs";

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

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow styling document elements such as html and body directly in CSS.",
		},
		schema: [],
		messages: {
			noDocumentElementStylesInCss:
				"Avoid styling '{{selectorName}}' in CSS. Prefer moving these styles to the element's className or a more specific owner.",
		},
	},
	create(context) {
		return {
			TypeSelector(node) {
				if (node.name !== "html" && node.name !== "body") {
					return;
				}

				context.report({
					node,
					messageId: "noDocumentElementStylesInCss",
					data: {
						selectorName: node.name,
					},
				});
			},
		};
	},
});

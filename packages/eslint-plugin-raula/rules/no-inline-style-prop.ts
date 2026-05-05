import { defineRule } from "../utils/define-rule";
import type { RuleDoc } from "./docs";

export const docs = {
	title: "No inline style prop",
	category: "React",
	summary:
		"Disallow inline style props in JSX so styling remains centralized and consistent.",
	why: "Inline styles bypass design-system conventions and make static enforcement harder.",
	bad: [
		{
			label: "Direct inline style object",
			code: "<div style={{ background: '#fff' }} />",
			language: "tsx",
		},
	],
	good: [
		{
			label: "Use className instead",
			code: '<div className="bg-white" />',
			language: "tsx",
		},
	],
} satisfies RuleDoc;

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description: "Disallow inline style props in JSX.",
		},
		schema: [],
		messages: {
			noInlineStyleProp:
				"Avoid inline style props. Use Tailwind utilities or shared CSS instead.",
		},
	},
	create(context) {
		return {
			JSXAttribute(node) {
				if (node.name?.type !== "JSXIdentifier" || node.name.name !== "style") {
					return;
				}

				context.report({
					node,
					messageId: "noInlineStyleProp",
				});
			},
		};
	},
});

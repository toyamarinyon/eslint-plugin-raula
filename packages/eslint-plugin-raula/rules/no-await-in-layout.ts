import { defineRule } from "../utils/define-rule";
import type { RuleDoc } from "./docs";

export const docs = {
	title: "No await in layout",
	category: "Next.js",
	summary: "Disallow `await` in `app/**/layout.*` files.",
	why: "Layout await points can block shell rendering and reduce startup performance.",
	bad: [
		{
			label: "Async behavior in layout",
			code: "export default async function Layout() {\n\tconst user = await getUser();\n}",
			language: "tsx",
		},
	],
	good: [
		{
			label: "Move async to child segments",
			code: "export default function Layout({ children }) {\n\treturn <>{children}</>;\n}",
			language: "tsx",
		},
	],
} satisfies RuleDoc;

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow awaiting in layout files to avoid blocking the app shell.",
		},
		schema: [],
		messages: {
			noAwaitInLayout:
				"Avoid awaiting in layout files unless intentionally disabled with a justification. Async work in layouts can block rendering of the full app shell.",
		},
	},
	create(context) {
		return {
			AwaitExpression(node) {
				context.report({
					node,
					messageId: "noAwaitInLayout",
				});
			},
		};
	},
});

import { defineRule } from "../utils/define-rule";
import type { RuleDoc } from "./docs";

export const docs = {
	title: "No CSS modules",
	category: "CSS",
	summary: "Disallow stylesheet filenames ending in `*.module.css`.",
	why: "This package keeps styling within the approved patterns, so file-level CSS modules are blocked to avoid fragmented conventions.",
	bad: [
		{
			label: "Module stylesheet",
			code: "/* styles.module.css */\n.button {\n\tbackground: #fff;\n}",
			language: "css",
		},
	],
	good: [
		{
			label: "Allowed Tailwind path",
			code: '<button className="bg-white text-black" />',
			language: "tsx",
		},
	],
} satisfies RuleDoc;

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description: "Disallow files whose filename ends with `*.module.css`.",
		},
		schema: [],
		messages: {
			noCssModules:
				"Avoid using `*.module.css` files. Move styles to allowed project conventions or shared CSS files.",
		},
	},
	create(context) {
		const filename = context.getFilename();
		const isModuleCssFile = filename.endsWith(".module.css");

		if (!isModuleCssFile) {
			return {};
		}

		return {
			StyleSheet(node) {
				context.report({
					node,
					messageId: "noCssModules",
				});
			},
		};
	},
});

/** @type {import("./docs.mjs").RuleDoc} */
export const docs = {
	title: "No CSS modules",
	category: "CSS",
	summary: "Disallow importing `*.module.css` files.",
	why: "This package keeps styling within the approved patterns, so file-level CSS modules are blocked to avoid fragmented conventions. Unlike the eslint-plugin-raula version of this rule, which lints the *.module.css file itself by filename, this rule checks the import site in JS/TSX instead, since oxlint has no mechanism to lint CSS files directly. An unused, unimported .module.css file is no longer caught, but a real import always is.",
	bad: [
		{
			label: "Importing a module stylesheet",
			code: 'import styles from "./page.module.css";',
			language: "tsx",
		},
	],
	good: [
		{
			label: "Allowed Tailwind path",
			code: '<button className="bg-white text-black" />',
			language: "tsx",
		},
	],
};

const noCssModules = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow importing `*.module.css` files.",
		},
	},
	create(context) {
		return {
			ImportDeclaration(node) {
				const source = node.source;
				if (source?.type !== "Literal" && source?.type !== "StringLiteral") {
					return;
				}

				const value = source.value;
				if (typeof value !== "string" || !value.endsWith(".module.css")) {
					return;
				}

				context.report({
					node,
					message:
						"Avoid importing `*.module.css` files. Move styles to allowed project conventions or shared CSS files.",
				});
			},
		};
	},
};

export default noCssModules;

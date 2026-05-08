import cssPlugin from "@eslint/css";
import type { Linter } from "eslint";

import { plugin } from "./plugin";

const tailwind: Linter.Config[] = [
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		plugins: {
			raula: plugin,
		},
		rules: {
			"raula/exhaustive-tailwind-classes": "error",
			"raula/no-inline-style-prop": "error",
		},
	},
	{
		files: ["app/globals.css"],
		language: "css/css",
		plugins: {
			css: cssPlugin as never,
			raula: plugin,
		},
		rules: {
			"raula/exhaustive-tailwind-theme-tokens": "error",
			"raula/no-disallowed-global-class-selectors": "error",
			"raula/no-document-element-styles-in-css": "error",
		},
	},
	{
		files: ["**/*.module.css"],
		language: "css/css",
		plugins: {
			css: cssPlugin as never,
			raula: plugin,
		},
		rules: {
			"raula/no-css-modules": "error",
		},
	},
];

export default tailwind;

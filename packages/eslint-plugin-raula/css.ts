import cssPlugin from "@eslint/css";
import type { Linter } from "eslint";

import { plugin } from "./plugin";

const css: Linter.Config[] = [
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
];

export default css;

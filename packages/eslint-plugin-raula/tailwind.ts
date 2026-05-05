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
];

export default tailwind;

import type { Linter } from "eslint";

import { plugin } from "./plugin";

const nextLayout: Linter.Config[] = [
	{
		files: ["app/**/layout.{js,jsx,ts,tsx}"],
		plugins: {
			raula: plugin,
		},
		rules: {
			"raula/no-await-in-layout": "error",
		},
	},
];

export default nextLayout;

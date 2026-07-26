import type { Config } from "stylelint";

const css: Config = {
	plugins: ["stylelint-plugin-raula"],
	// stylelint's CLI resolves some options against the base config without
	// a file path (so `overrides` never apply) before it starts linting any
	// file. If `rules` is completely absent from the base config at that
	// point, stylelint throws `ConfigurationError: No rules found within
	// configuration.` even though every file that matches an override does
	// get its rules. An empty object here keeps that pre-flight check happy
	// without turning on any rule outside the `app/globals.css` override.
	rules: {},
	overrides: [
		{
			files: ["app/globals.css"],
			rules: {
				"raula/exhaustive-tailwind-theme-tokens": true,
				"raula/no-disallowed-global-class-selectors": true,
				"raula/no-document-element-styles-in-css": true,
			},
		},
	],
};

export default css;

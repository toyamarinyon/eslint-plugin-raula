import cssPlugin from "@eslint/css";
import { RuleTester } from "eslint";

import exhaustiveTailwindClasses from "./exhaustive-tailwind-classes";
import exhaustiveTailwindThemeTokens from "./exhaustive-tailwind-theme-tokens";
import noAwaitInLayout from "./no-await-in-layout";
import noCssModules from "./no-css-modules";
import noDisallowedGlobalClassSelectors from "./no-disallowed-global-class-selectors";
import noDocumentElementStylesInCss from "./no-document-element-styles-in-css";
import noInlineStyleProp from "./no-inline-style-prop";

const tsxTester = new RuleTester({
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: "module",
		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
		},
	},
});

const cssTester = new RuleTester({
	language: "css/css",
	plugins: {
		css: cssPlugin,
	},
});

tsxTester.run("exhaustive-tailwind-classes", exhaustiveTailwindClasses, {
	valid: [
		'const node = <div className="m-0 md:m-0 text-sm" />;',
		"const node = <div className={dynamicClassName} />;",
	],
	invalid: [
		{
			code: 'const node = <div className="text-[16px]" />;',
			errors: [{ messageId: "noArbitraryClass" }],
		},
	],
});

tsxTester.run("no-await-in-layout", noAwaitInLayout, {
	valid: [
		"export default function Layout({ children }) { return <>{children}</>; }",
	],
	invalid: [
		{
			code: "export default async function Layout() { const user = await getUser(); return user.name; }",
			errors: [{ messageId: "noAwaitInLayout" }],
		},
	],
});

tsxTester.run("no-inline-style-prop", noInlineStyleProp, {
	valid: ['const node = <div className="bg-white" />;'],
	invalid: [
		{
			code: 'const node = <div style={{ color: "red" }} />;',
			errors: [{ messageId: "noInlineStyleProp" }],
		},
	],
});

cssTester.run(
	"exhaustive-tailwind-theme-tokens",
	exhaustiveTailwindThemeTokens,
	{
		valid: [
			"@theme { --color-background: #fff; --spacing: 0.25rem; }",
			{
				code: ":root { --app-shell-height: 100vh; }",
				options: [{ allowCustomProperties: ["--app-shell-height"] }],
			},
		],
		invalid: [
			{
				code: ":root { --color-background: #fff; }",
				errors: [{ messageId: "exhaustiveTailwindThemeTokens" }],
			},
			{
				code: "@theme { --app-shell-height: 100vh; }",
				errors: [{ messageId: "nonTailwindThemeNamespace" }],
			},
		],
	},
);

cssTester.run(
	"no-disallowed-global-class-selectors",
	noDisallowedGlobalClassSelectors,
	{
		valid: [
			{
				code: ".prose { color: var(--color-text); }",
				options: [{ allowedClassSelectors: ["prose"] }],
			},
		],
		invalid: [
			{
				code: ".button { color: red; }",
				errors: [{ messageId: "disallowedGlobalClassSelector" }],
			},
		],
	},
);

cssTester.run(
	"no-document-element-styles-in-css",
	noDocumentElementStylesInCss,
	{
		valid: [".app { color: var(--color-text); }"],
		invalid: [
			{
				code: "html { color: red; } body { margin: 0; }",
				errors: [
					{ messageId: "noDocumentElementStylesInCss" },
					{ messageId: "noDocumentElementStylesInCss" },
				],
			},
		],
	},
);

cssTester.run("no-css-modules", noCssModules, {
	valid: [
		{
			code: ".button { color: red; }",
			filename: "button.css",
		},
	],
	invalid: [
		{
			code: ".button { color: red; }",
			filename: "button.module.css",
			errors: [{ messageId: "noCssModules" }],
		},
	],
});

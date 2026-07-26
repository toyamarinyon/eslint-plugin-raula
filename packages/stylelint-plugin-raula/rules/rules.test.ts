import stylelint from "stylelint";
import { describe, expect, test } from "vitest";

import exhaustiveTailwindThemeTokens from "./exhaustive-tailwind-theme-tokens";
import noDisallowedGlobalClassSelectors from "./no-disallowed-global-class-selectors";
import noDocumentElementStylesInCss from "./no-document-element-styles-in-css";

async function lintWith(
	plugin: stylelint.Plugin,
	ruleName: string,
	code: string,
	ruleSettings: unknown = true,
) {
	const result = await stylelint.lint({
		code,
		config: {
			plugins: [plugin],
			rules: {
				[ruleName]: ruleSettings,
			},
		},
	});

	return result.results[0].warnings;
}

describe("exhaustive-tailwind-theme-tokens", () => {
	const ruleName = "raula/exhaustive-tailwind-theme-tokens";

	test("valid: tokens under supported @theme namespaces", async () => {
		const warnings = await lintWith(
			exhaustiveTailwindThemeTokens,
			ruleName,
			"@theme { --color-background: #fff; --spacing: 0.25rem; }",
		);

		expect(warnings).toHaveLength(0);
	});

	test("valid: allowlisted custom property outside @theme", async () => {
		const warnings = await lintWith(
			exhaustiveTailwindThemeTokens,
			ruleName,
			":root { --app-shell-height: 100vh; }",
			[true, { allowCustomProperties: ["--app-shell-height"] }],
		);

		expect(warnings).toHaveLength(0);
	});

	test("invalid: token declared outside @theme", async () => {
		const warnings = await lintWith(
			exhaustiveTailwindThemeTokens,
			ruleName,
			":root { --color-background: #fff; }",
		);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]?.text).toContain("--color-background");
	});

	test("invalid: unsupported namespace inside @theme", async () => {
		const warnings = await lintWith(
			exhaustiveTailwindThemeTokens,
			ruleName,
			"@theme { --app-shell-height: 100vh; }",
		);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]?.text).toContain("--app-shell-height");
	});
});

describe("no-disallowed-global-class-selectors", () => {
	const ruleName = "raula/no-disallowed-global-class-selectors";

	test("valid: allowlisted class selector", async () => {
		const warnings = await lintWith(
			noDisallowedGlobalClassSelectors,
			ruleName,
			".prose { color: var(--color-text); }",
			[true, { allowedClassSelectors: ["prose"] }],
		);

		expect(warnings).toHaveLength(0);
	});

	test("invalid: class selector not in allowlist", async () => {
		const warnings = await lintWith(
			noDisallowedGlobalClassSelectors,
			ruleName,
			".button { color: red; }",
		);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]?.text).toContain(".button");
	});

	test("invalid: only unlisted class flagged among descendant selectors", async () => {
		const warnings = await lintWith(
			noDisallowedGlobalClassSelectors,
			ruleName,
			".prose h1 { font-size: 2rem; }",
			[true, { allowedClassSelectors: ["prose"] }],
		);

		expect(warnings).toHaveLength(0);
	});
});

describe("no-document-element-styles-in-css", () => {
	const ruleName = "raula/no-document-element-styles-in-css";

	test("valid: non-document element selector", async () => {
		const warnings = await lintWith(
			noDocumentElementStylesInCss,
			ruleName,
			".app { color: var(--color-text); }",
		);

		expect(warnings).toHaveLength(0);
	});

	test("invalid: html and body selectors both flagged", async () => {
		const warnings = await lintWith(
			noDocumentElementStylesInCss,
			ruleName,
			"html { color: red; } body { margin: 0; }",
		);

		expect(warnings).toHaveLength(2);
	});

	test("invalid: body flagged even in a compound/descendant selector", async () => {
		const warnings = await lintWith(
			noDocumentElementStylesInCss,
			ruleName,
			"body .foo { color: red; }",
		);

		expect(warnings).toHaveLength(1);
	});

	test("valid: class selector merely containing 'body' as a substring", async () => {
		const warnings = await lintWith(
			noDocumentElementStylesInCss,
			ruleName,
			".body-text { color: red; }",
		);

		expect(warnings).toHaveLength(0);
	});
});

# eslint-plugin-raula

Opinionated ESLint rules and flat-config presets for Tailwind and Next.js app standards.

## Install

Install ESLint and the plugin with your package manager:

```bash
npm install -D eslint eslint-plugin-raula
pnpm add -D eslint eslint-plugin-raula
yarn add -D eslint eslint-plugin-raula
bun add -d eslint eslint-plugin-raula
```

`eslint-plugin-raula` includes Tailwind CSS for its Tailwind-aware rules, so you do not need to install Tailwind just for this plugin. Your app should still have its usual Tailwind setup when you enable the Tailwind preset.

## Setup

`eslint-plugin-raula` is designed for ESLint flat config. After installing the package, run the installer from your project root:

```bash
npx eslint-plugin-raula install
```

The installer looks for a single ESLint flat config file, shows the diff, asks for confirmation, and adds the Tailwind and Next.js layout presets. It can also update `AGENTS.md` with the managed Raula reference block. If multiple ESLint config files are found, the installer stops and asks you to update the intended file manually.

### Basic flat config

```js
import { defineConfig } from "eslint/config";
import raulaNextLayout from "eslint-plugin-raula/next-layout";
import raulaTailwind from "eslint-plugin-raula/tailwind";

export default defineConfig([
	...raulaTailwind,
	...raulaNextLayout,
]);
```

Add a lint script if your project does not have one:

```json
{
	"scripts": {
		"lint": "eslint ."
	}
}
```

Then run ESLint:

```bash
npm run lint
```

### Next.js

For a Next.js App Router project, install ESLint and the plugin:

```bash
npm install -D eslint eslint-plugin-raula
```

Then update `eslint.config.mjs`:

```diff
 import { defineConfig, globalIgnores } from "eslint/config";
 import nextVitals from "eslint-config-next/core-web-vitals";
 import nextTs from "eslint-config-next/typescript";
+import raulaNextLayout from "eslint-plugin-raula/next-layout";
+import raulaTailwind from "eslint-plugin-raula/tailwind";

 const eslintConfig = defineConfig([
 	...nextVitals,
 	...nextTs,
+	...raulaTailwind,
+	...raulaNextLayout,
 	// Override default ignores of eslint-config-next.
 	globalIgnores([
 		// Default ignores of eslint-config-next:
 	]),
 ]);
```

The Tailwind preset checks JSX/TSX class names, `app/globals.css`, and `**/*.module.css`. The Next.js layout preset checks `app/**/layout.{js,jsx,ts,tsx}` and prevents `await` from blocking layout rendering.

Run the linter from your app root:

```bash
npm run lint
```

## Usage

You can also import the plugin directly and enable individual rules:

```js
import { defineConfig } from "eslint/config";
import raula from "eslint-plugin-raula";

export default defineConfig([
	{
		plugins: {
			raula,
		},
		rules: {
			"raula/no-inline-style-prop": "error",
			"raula/no-await-in-layout": "error",
		},
	},
]);
```

## Presets

### `eslint-plugin-raula/tailwind`

Applies to `**/*.{js,jsx,ts,tsx}` and enables:

- `raula/exhaustive-tailwind-classes`
- `raula/no-inline-style-prop`

It also applies to `app/globals.css` and enables:

- `raula/exhaustive-tailwind-theme-tokens`
- `raula/no-disallowed-global-class-selectors`
- `raula/no-document-element-styles-in-css`

It also applies to `**/*.module.css` and enables:

- `raula/no-css-modules`

This preset configures ESLint's CSS language support for `app/globals.css` and `**/*.module.css`.

### `eslint-plugin-raula/next-layout`

Applies to `app/**/layout.{js,jsx,ts,tsx}` and enables:

- `raula/no-await-in-layout`

## Rules

### `raula/exhaustive-tailwind-classes`

Requires `className` values to use canonical Tailwind utilities and forbids arbitrary bracket syntax such as `w-[13px]`.

Options:

```js
{
	rootFontSize: 16;
}
```

### `raula/exhaustive-tailwind-theme-tokens`

Requires CSS custom properties to be declared inside `@theme` blocks and use supported Tailwind theme namespaces.

Options:

```js
{
	allowCustomProperties: ["--background", "--foreground"];
}
```

### `raula/no-await-in-layout`

Disallows `await` in `app/**/layout.*` files to avoid blocking the app shell.

### `raula/no-inline-style-prop`

Disallows inline `style` props in JSX.

### `raula/no-disallowed-global-class-selectors`

Disallows class selectors in `app/globals.css` unless they are explicitly allowlisted.

Options:

```js
{
	allowedClassSelectors: ["prose"];
}
```

### `raula/no-document-element-styles-in-css`

Disallows styling `html` and `body` directly in CSS.

### `raula/no-css-modules`

Disallows using stylesheet files that end in `.module.css`.

## Reference

Rule docs are generated from rule metadata and published as:

- `./REFERENCE.md`
- `./references/<rule-name>.md`

Read the package references before editing styling, `className` usage, global CSS, or layout-related code.

## CLI

Use the package CLI to update the current repository after installing the package:

```bash
npx eslint-plugin-raula install
```

The command:

- Finds one ESLint flat config file in the current directory.
- Asks before updating the ESLint config unless `--eslint` or `--no-eslint` is passed.
- Adds both `eslint-plugin-raula/tailwind` and `eslint-plugin-raula/next-layout`.
- Asks before updating `AGENTS.md` unless `--agents-md` or `--no-agents-md` is passed.

For non-interactive usage:

```bash
npx eslint-plugin-raula install --eslint --agents-md
```

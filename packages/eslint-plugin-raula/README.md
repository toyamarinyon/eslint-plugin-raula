# eslint-plugin-raula

Opinionated ESLint rules and flat-config presets for Tailwind and Next.js app standards.

## Install

```bash
npm install -D eslint eslint-plugin-raula
```

If you use the Tailwind-related rules, install Tailwind CSS as well:

```bash
npm install -D tailwindcss
```

## Usage

Import the presets you want in your ESLint flat config.

```js
import { defineConfig } from "eslint/config";
import raulaCss from "eslint-plugin-raula/css";
import raulaNextLayout from "eslint-plugin-raula/next-layout";
import raulaTailwind from "eslint-plugin-raula/tailwind";

export default defineConfig([
	...raulaTailwind,
	...raulaNextLayout,
	...raulaCss,
]);
```

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

### `eslint-plugin-raula/next-layout`

Applies to `app/**/layout.{js,jsx,ts,tsx}` and enables:

- `raula/no-await-in-layout`

### `eslint-plugin-raula/css`

Applies to `app/globals.css` and enables:

- `raula/exhaustive-tailwind-theme-tokens`
- `raula/no-disallowed-global-class-selectors`
- `raula/no-document-element-styles-in-css`

This preset also configures ESLint's CSS language support for `app/globals.css`.

## Rules

### `raula/exhaustive-tailwind-classes`

Requires `className` values to stay within canonical Tailwind utilities and forbids arbitrary bracket syntax such as `w-[13px]`.

Options:

```js
{
	rootFontSize: 16;
}
```

### `raula/exhaustive-tailwind-theme-tokens`

Requires CSS custom properties to be declared inside `@theme` blocks and to use supported Tailwind theme namespaces.

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

## Reference

Rule docs are generated from rule metadata and published as:

- `./REFERENCE.md`
- `./references/<rule-name>.md`

Use the package references before editing styling, className usage, global CSS, or layout-related code.

## CLI

You can use the package CLI to inject the managed AGENTS reference block into the current repository:

```bash
npx eslint-plugin-raula instruct
```

The command updates `AGENTS.md` in the current working directory with an idempotent block pointing to:

```
./node_modules/eslint-plugin-raula/REFERENCE.md
```

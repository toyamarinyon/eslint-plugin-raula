# stylelint-plugin-raula

Opinionated stylelint rules and a config preset for `app/globals.css` standards: Tailwind v4 theme token governance and control over global CSS surface area.

This package covers the three raula standards rules that check CSS files themselves. Rules that check Tailwind class usage in JS/TSX are covered by [`eslint-plugin-raula`](../eslint-plugin-raula) instead.

## Install

```bash
npm install -D stylelint stylelint-plugin-raula
pnpm add -D stylelint stylelint-plugin-raula
yarn add -D stylelint stylelint-plugin-raula
bun add -d stylelint stylelint-plugin-raula
```

## Setup

After installing the package, run the installer from your project root:

```bash
npx stylelint-plugin-raula install
```

The installer looks for a single stylelint config file, adds `"stylelint-plugin-raula/css"` to its `extends`, and can update `AGENTS.md` with the managed Raula reference block. If multiple stylelint config files are found, the installer stops and asks you to update the intended file manually.

For non-interactive usage:

```bash
npx stylelint-plugin-raula install --stylelint --agents-md
```

### Basic config

Or extend the `css` preset from your stylelint config by hand. It applies the three rules to `app/globals.css`:

```js
// stylelint.config.mjs
export default {
	extends: ["stylelint-plugin-raula/css"],
};
```

Add a lint script if your project does not have one:

```json
{
	"scripts": {
		"lint:css": "stylelint 'app/**/*.css'"
	}
}
```

### Manual rule configuration

```js
// stylelint.config.mjs
export default {
	plugins: ["stylelint-plugin-raula"],
	rules: {
		"raula/exhaustive-tailwind-theme-tokens": true,
		"raula/no-disallowed-global-class-selectors": [
			true,
			{ allowedClassSelectors: ["prose"] },
		],
		"raula/no-document-element-styles-in-css": true,
	},
};
```

## Rules

### `raula/exhaustive-tailwind-theme-tokens`

Requires CSS custom properties to be declared inside `@theme` blocks and use supported Tailwind theme namespaces.

Options:

```js
{
	allowCustomProperties: ["--background", "--foreground"];
}
```

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

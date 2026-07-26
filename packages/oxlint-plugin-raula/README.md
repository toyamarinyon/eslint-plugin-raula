# oxlint-plugin-raula

Opinionated oxlint rules and a shareable config preset for Next.js app standards. This is a port of eslint-plugin-raula's JS/TSX rules to oxlint's JS Plugin API. The JS Plugin API itself is still alpha as of writing — Vercel's AI SDK already runs a custom oxlint JS Plugin in production, so this is past the "wait and see" stage, but expect rough edges.

This package covers two raula rules that check JS/TSX source. Rules that check Tailwind class usage more thoroughly (`exhaustive-tailwind-classes`) and CSS files themselves (`exhaustive-tailwind-theme-tokens`, `no-disallowed-global-class-selectors`, `no-document-element-styles-in-css`) are not covered here — see [`eslint-plugin-raula`](../eslint-plugin-raula) and [`stylelint-plugin-raula`](../stylelint-plugin-raula).

`no-await-in-layout` (present in eslint-plugin-raula) is deliberately **not** ported here. Next.js's own [Cache Components](https://nextjs.org/docs/messages/blocking-prerender-dynamic) feature (`cacheComponents: true` in `next.config.ts`) already catches this — and more broadly: it flags any uncached/dynamic data access (`fetch()`, `cookies()`, `headers()`, `params`, `searchParams`, `connection()`) blocking prerendering anywhere in the render tree, not just in layouts, as a build error with three labeled fixes (stream/cache/block). Since raula and Cache Components are both opt-in, prefer enabling Cache Components over maintaining a narrower custom lint rule for the same problem.

## Setup

Install the package:

```bash
npm install -D oxlint oxlint-plugin-raula
pnpm add -D oxlint oxlint-plugin-raula
yarn add -D oxlint oxlint-plugin-raula
bun add -d oxlint oxlint-plugin-raula
```

Extend the shareable preset in `.oxlintrc.json`:

```json
{
	"extends": ["./node_modules/oxlint-plugin-raula/.oxlintrc.json"]
}
```

Or register the plugin and pick individual rules yourself:

```json
{
	"jsPlugins": ["./node_modules/oxlint-plugin-raula/index.mjs"],
	"rules": {
		"raula/no-inline-style-prop": "error",
		"raula/no-css-modules": "error"
	}
}
```

There is no CLI installer yet (unlike the eslint/stylelint packages) — you need to add the `extends` entry to your `.oxlintrc.json` by hand.

## Rules

### `raula/no-inline-style-prop`

Disallows inline `style` props in JSX.

### `raula/no-css-modules`

Disallows importing `*.module.css` files.

**Design note:** the eslint-plugin-raula version of this rule lints the `*.module.css` file itself by filename, via ESLint's CSS language plugin. oxlint cannot lint CSS files at all, so this version instead flags the *import site* in JS/TSX (`import styles from "./page.module.css"`). Trade-off: an unused, unimported `.module.css` file is no longer caught, but a real import always is.

## Testing

There is no ESLint-RuleTester-equivalent for oxlint rules. Tests run the real `oxlint` CLI against fixture files under `fixtures/` and assert on the JSON diagnostics output — see `tests/output.test.ts`.

```bash
bun test tests
```

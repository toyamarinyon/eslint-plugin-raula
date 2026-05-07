<!-- This file is generated from rule docs. Do not edit directly. -->

# eslint-plugin-raula Reference

Read this file before editing styling, JSX className usage, global CSS, or Next.js layout files.

## Rules

- [raula/exhaustive-tailwind-classes](./references/exhaustive-tailwind-classes.md) — Require className tokens to use canonical Tailwind utilities and avoid arbitrary bracket usage.
  - eslint-plugin-raula/tailwind (files: **/*.{js,jsx,ts,tsx})
- [raula/exhaustive-tailwind-theme-tokens](./references/exhaustive-tailwind-theme-tokens.md) — Require CSS custom properties to be declared inside `@theme` blocks and only under supported namespaces.
  - eslint-plugin-raula/tailwind (files: app/globals.css)
- [raula/no-await-in-layout](./references/no-await-in-layout.md) — Disallow `await` in `app/**/layout.*` files.
  - eslint-plugin-raula/next-layout (files: app/**/layout.{js,jsx,ts,tsx})
- [raula/no-disallowed-global-class-selectors](./references/no-disallowed-global-class-selectors.md) — Disallow new global class selectors unless explicitly allowlisted.
  - eslint-plugin-raula/tailwind (files: app/globals.css)
- [raula/no-document-element-styles-in-css](./references/no-document-element-styles-in-css.md) — Disallow styling `html` and `body` directly in CSS and prefer safer ownership.
  - eslint-plugin-raula/tailwind (files: app/globals.css)
- [raula/no-inline-style-prop](./references/no-inline-style-prop.md) — Disallow inline style props in JSX so styling remains centralized and consistent.
  - eslint-plugin-raula/tailwind (files: **/*.{js,jsx,ts,tsx})

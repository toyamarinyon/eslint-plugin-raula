<!-- This file is generated from rule docs. Do not edit directly. -->

# raula/no-await-in-layout

- Title: No await in layout
- Category: Next.js

## Applicability

- eslint-plugin-raula/next-layout (app/**/layout.{js,jsx,ts,tsx})

## Summary

Disallow `await` in `app/**/layout.*` files.

## Why

Layout await points can block shell rendering and reduce startup performance.

## Bad

- Async behavior in layout

```tsx
export default async function Layout() {
	const user = await getUser();
}
```

## Good

- Move async to child segments

```tsx
export default function Layout({ children }) {
	return <>{children}</>;
}
```

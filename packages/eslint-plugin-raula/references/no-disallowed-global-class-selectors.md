<!-- This file is generated from rule docs. Do not edit directly. -->

# raula/no-disallowed-global-class-selectors

- Title: Controlled global class selectors
- Category: CSS

## Applicability

- eslint-plugin-raula/tailwind (app/globals.css)

## Summary

Disallow new global class selectors unless explicitly allowlisted.

## Why

Most styling should be explicit in component context; globals should remain intentional and minimal.

## Bad

- Unlisted global class

```css
.prose h1 {
	font-size: 2rem;
}
```

## Good

- Allowed selector

```css
.prose {
	--tw-prose-body: var(--color-text);
}
```

## Options

- Allowlist explicit selectors that are safe in globals.

```ts
{
	allowedClassSelectors: ["prose"]
}
```

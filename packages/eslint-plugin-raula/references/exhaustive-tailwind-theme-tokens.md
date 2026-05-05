<!-- This file is generated from rule docs. Do not edit directly. -->

# raula/exhaustive-tailwind-theme-tokens

- Title: Tailwind theme token governance
- Category: CSS

## Applicability

- eslint-plugin-raula/css (app/globals.css)

## Summary

Require CSS custom properties to be declared inside `@theme` blocks and only under supported namespaces.

## Why

This keeps global design tokens centralized and aligned with Tailwind's theme contract.

## Bad

- Token outside @theme

```css
:root {
	--foreground: 123;
}
```

- Unsupported namespace

```css
:root {
	@theme {
		--random-token: #000;
	}
}
```

## Good

- Supported namespaces in @theme

```css
@theme {
	--color-background: #fff;
	--spacing-sm: 0.5rem;
}
```

## Options

- Add allowlisted custom properties that may remain outside `@theme`.

```ts
{
	allowCustomProperties: ["--background", "--foreground"]
}
```

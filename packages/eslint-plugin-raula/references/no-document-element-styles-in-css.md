<!-- This file is generated from rule docs. Do not edit directly. -->

# raula/no-document-element-styles-in-css

- Title: No direct html/body selector styles
- Category: CSS

## Applicability

- eslint-plugin-raula/css (app/globals.css)

## Summary

Disallow styling `html` and `body` directly in CSS and prefer safer ownership.

## Why

Direct document element styles increase coupling and obscure where global style ownership comes from.

## Bad

- Document element styling

```css
html {
	font-size: 18px;
}
```

## Good

- Move ownership to wrapper

```tsx
<html suppressHydrationWarning><body className="antialiased bg-white text-black" />
```

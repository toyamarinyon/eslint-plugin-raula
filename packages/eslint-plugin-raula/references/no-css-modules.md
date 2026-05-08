<!-- This file is generated from rule docs. Do not edit directly. -->

# raula/no-css-modules

- Title: No CSS modules
- Category: CSS

## Applicability

- eslint-plugin-raula/tailwind (**/*.module.css)

## Summary

Disallow stylesheet filenames ending in `*.module.css`.

## Why

This package keeps styling within the approved patterns, so file-level CSS modules are blocked to avoid fragmented conventions.

## Bad

- Module stylesheet

```css
/* styles.module.css */
.button {
	background: #fff;
}
```

## Good

- Allowed Tailwind path

```tsx
<button className="bg-white text-black" />
```

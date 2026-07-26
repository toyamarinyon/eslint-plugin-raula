<!-- This file is generated from rule docs. Do not edit directly. -->

# raula/no-css-modules

- Title: No CSS modules
- Category: CSS

## Applicability

- files: **/*.{js,jsx,ts,tsx}

## Summary

Disallow importing `*.module.css` files.

## Why

This package keeps styling within the approved patterns, so file-level CSS modules are blocked to avoid fragmented conventions. Unlike the eslint-plugin-raula version of this rule, which lints the *.module.css file itself by filename, this rule checks the import site in JS/TSX instead, since oxlint has no mechanism to lint CSS files directly. An unused, unimported .module.css file is no longer caught, but a real import always is.

## Bad

- Importing a module stylesheet

```tsx
import styles from "./page.module.css";
```

## Good

- Allowed Tailwind path

```tsx
<button className="bg-white text-black" />
```

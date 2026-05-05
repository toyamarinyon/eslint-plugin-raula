<!-- This file is generated from rule docs. Do not edit directly. -->

# raula/no-inline-style-prop

- Title: No inline style prop
- Category: React

## Applicability

- eslint-plugin-raula/tailwind (**/*.{js,jsx,ts,tsx})

## Summary

Disallow inline style props in JSX so styling remains centralized and consistent.

## Why

Inline styles bypass design-system conventions and make static enforcement harder.

## Bad

- Direct inline style object

```tsx
<div style={{ background: '#fff' }} />
```

## Good

- Use className instead

```tsx
<div className="bg-white" />
```

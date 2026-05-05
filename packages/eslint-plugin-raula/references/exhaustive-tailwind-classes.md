<!-- This file is generated from rule docs. Do not edit directly. -->

# raula/exhaustive-tailwind-classes

- Title: Canonical Tailwind classes
- Category: Tailwind

## Applicability

- eslint-plugin-raula/tailwind (**/*.{js,jsx,ts,tsx})

## Summary

Require className tokens to use canonical Tailwind utilities and avoid arbitrary bracket usage.

## Why

Keeping utility usage canonical prevents style drift and makes class names easier to reason about across contributors.

## Bad

- Non-canonical or arbitrary class

```tsx
<div className="m-0 md:m0 text-[16px]" />
```

## Good

- Canonical utility

```tsx
<div className="m-0 md:m-0" />
```

- Configure rule options in config

```ts
{
	rules: {
		"raula/exhaustive-tailwind-classes": [
			"error",
			{ rootFontSize: 16 },
		],
	},
}
```

## Options

- Configure root pixel value for canonical `rem` conversion.

```ts
{
	rootFontSize: 16
}
```

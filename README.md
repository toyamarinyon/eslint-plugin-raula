# raula

Opinionated Tailwind and Next.js app standards, enforced across whichever
toolchain a project actually uses.

This repository (formerly `eslint-plugin-raula`) is a monorepo bundling:

- **[`eslint-plugin-raula`](./packages/eslint-plugin-raula)** — the original
  ESLint plugin and flat-config presets. Still the recommended, most mature
  option; see its own README for install/setup.
- **[`stylelint-plugin-raula`](./packages/stylelint-plugin-raula)** — the
  three CSS-file rules (`app/globals.css` theme tokens, global class
  selectors, document-element styling), ported to stylelint since neither
  ESLint's CSS language plugin nor oxlint can lint CSS files as cleanly.
- **[`oxlint-plugin-raula`](./packages/oxlint-plugin-raula)** — an
  experimental port of the JS/TSX rules to oxlint's JS Plugin API
  (`no-inline-style-prop`, `no-css-modules`). `no-await-in-layout` is
  deliberately not ported — see its README.
- **[`create-next-app-with-raula`](./skills/create-next-app-with-raula)** — an
  agent skill that scaffolds a new Next.js app and wires up a raula
  lint/format toolchain (`eslint-plugin-raula` + Biome, or
  `oxlint-plugin-raula` + `stylelint-plugin-raula` + oxfmt) and Cache
  Components when supported, via a deterministic script, not
  agent-improvised commands.

## Which package do I want?

- Setting up lint/format for a Next.js app? Start with
  `eslint-plugin-raula` (JS/TSX) + `stylelint-plugin-raula` (CSS). This is
  the stable, recommended combination today.
- Bootstrapping a brand-new app? Use the `create-next-app-with-raula` skill —
  it wires up either toolchain for you.
- Already on oxlint and want to try the JS/TSX rules there? `oxlint-plugin-raula`
  is still experimental (oxlint's JS Plugin API itself is alpha) — read its
  README for the rule ported (`no-css-modules`'s semantics changed: it now
  flags the *import site* of a `*.module.css` file rather than the file
  itself, since oxlint can't lint CSS files at all) and the one deliberately
  dropped in favor of Next.js's own Cache Components feature.

## Repository Structure

```text
.
├── packages
│   ├── eslint-plugin-raula
│   ├── stylelint-plugin-raula
│   └── oxlint-plugin-raula
├── apps
│   └── raula-rules-fixture       # end-to-end fixture: oxlint + stylelint + oxfmt
└── skills
    └── create-next-app-with-raula
```

## Development

pnpm workspaces + Turborepo. From the repo root:

```bash
pnpm install
pnpm run build   # builds every package/skill with a build script
pnpm run lint    # turbo lint (excludes apps/*)
pnpm run format  # biome check --write .
pnpm test        # packages, apps, and skills
```

Before changing rule behavior in any package, rebuild it so `REFERENCE.md`/
`references/*.md` (or, for the skill, `dist/scaffold.mjs`) stay current:

```bash
pnpm run build --filter eslint-plugin-raula
pnpm run build --filter stylelint-plugin-raula
pnpm run build --filter oxlint-plugin-raula
pnpm run build --filter create-next-app-with-raula
```

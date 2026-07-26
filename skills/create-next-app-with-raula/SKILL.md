---
name: create-next-app-with-raula
description: "Scaffold a new Next.js application with create-next-app in a user-specified directory or, when no target path is given, the current directory; then install and initialize eslint-plugin-raula, set up Biome as a formatter, enable Cache Components when supported, run lint and format, and commit the initialized app. Supports selecting pnpm, npm, yarn, or bun and a Next.js release tag or exact version. Use when the user asks to start, create, bootstrap, or initialize a Next.js app with raula/eslint-plugin-raula."
---

# Create Next App With Raula

## Supported inputs

Support exactly these user-configurable inputs:

| Input | Accepted values | Default |
|---|---|---|
| Target directory | A directory path | `.` |
| Package manager | `pnpm`, `npm`, `yarn`, or `bun` | `pnpm` |
| Next.js version | An npm dist-tag such as `latest`, `preview`, or `canary`, or an exact version such as `16.3.0-preview.6` | `latest` |

When asked what this skill supports or what can be configured, answer from this table. Treat all other setup choices as fixed by this skill; do not offer them as configurable inputs.

## Workflow

The actual setup is a deterministic script (`dist/scaffold.mjs`, the built artifact in this skill's directory — source is `scaffold.ts`, see Development below) — not a sequence of commands for you to improvise. Your job is the judgment calls around it:

1. Determine the three supported inputs before running the script:
   - If the user names a package manager (pnpm, npm, yarn, bun), use it. Otherwise default to pnpm.
   - If the user gives a path, use it as the target directory. If not, use `.` (the current working directory).
   - If the user gives a Next.js dist-tag or exact version, use it. Otherwise default to `latest`.
   - Do not ask for a project name. The target directory is the project directory.
2. Before scaffolding into an existing directory, inspect it. If it contains files unrelated to this setup, stop and ask the user whether to continue, choose another directory, or clean it up. The script does not make this judgment call for you — it will happily scaffold into (and its `create-next-app` step may fail loudly inside) a directory that isn't empty.
3. Run the script from this skill's own directory:

   ```bash
   node dist/scaffold.mjs --dir <target-directory-or-.> --pm <pnpm|npm|yarn|bun> --next-version <tag-or-version>
   ```

4. After it finishes, independently verify the result yourself — don't just trust the script's own output:
   - Read `git show --stat HEAD` (the script already prints this, but re-check it) and skim the diff for anything unexpected.
   - Confirm `package.json` has both a `lint` script (ESLint) and a `format` script (Biome).
   - If the resolved Next.js version is `16.3.0` or later, confirm `next.config.ts` has `cacheComponents: true`.
5. Report the result to the user in plain prose: what was created, which package manager and Next.js version were used, and anything the script skipped (e.g. Cache Components on an older Next.js version) or warned about.

If the script fails partway through, read its output to find the failed step, fix the concrete problem in the generated app (partial installs, a network hiccup, an incompatible flag), then re-run the script — it is safe to re-run: package installs and the `eslint-plugin-raula`/config edits are idempotent, and steps that already ran will just report "already up to date" or overwrite deterministically. Don't recreate the project from scratch unless the user asks for a clean retry.

### What the script does, and why it's not just the plain create-next-app flags

The script scaffolds with `create-next-app@<version>` using fixed flags (TypeScript, empty template, App Router, ESLint, Tailwind CSS, React Compiler, `--skip-install`) — do not change these unless the user explicitly asks to modify the skill itself. It deliberately does **not** pass `--biome`: create-next-app treats "linter" as a single choice between ESLint and Biome, so passing both flags together silently drops Biome (no `biome.json`, no dependency, no format script — this was confirmed by testing the actual `create-next-app` CLI). Biome is set up separately, as a **formatter only** (its own linter is disabled in the generated `biome.json`), so ESLint(+raula) keeps owning linting and Biome owns formatting, with no overlap.

It then, in order: installs dependencies (approving `sharp`/`unrs-resolver` build scripts first if the package manager is pnpm), adds `eslint-plugin-raula` as an exact dev dependency and runs its own installer (`eslint-plugin-raula install --eslint --agents-md`), checks the *resolved* Next.js version in `package.json` (not the dist-tag you asked for) and adds `cacheComponents: true` to `next.config.ts` if it's `16.3.0` or later, adds `@biomejs/biome` as an exact dev dependency and writes `biome.json` (schema version matched to whatever actually got installed) plus a `format` script, runs `lint` then `format`, and commits everything as `initialized raula`.

`eslint-plugin-raula` still ships its own `no-await-in-layout` rule; this skill doesn't touch that. Enabling Cache Components is additive — it catches a broader class of blocking-render issues at build time (any uncached data access, not just `await` in a layout), not a replacement for the lint rule.

## Notes

This skill used to describe each command for the agent to run one step at a time. That approach depended on whatever model was interpreting the prose getting every package-manager-specific command and every config-file edit right, every time — which is exactly the kind of thing that should be deterministic instead. The script now owns that; keep it that way. If a step in the workflow needs to change (a new create-next-app flag, a different Biome default), edit `scaffold.ts`, not this file's prose.

## Development

The script is written in TypeScript (`scaffold.ts`) with unit tests (`scaffold.test.ts`) covering the pure logic — argument parsing, the `next.config.ts`/`biome.json` edits, and Next.js version comparison. The full end-to-end flow (actually invoking `create-next-app`, package installs) is exercised manually rather than in CI, since it's slow and network-dependent; see the repository's commit history for the manual verification notes.

From the monorepo root:

```bash
pnpm install
pnpm --filter create-next-app-with-raula run typecheck   # tsc --noEmit
pnpm --filter create-next-app-with-raula run test         # unit tests
pnpm --filter create-next-app-with-raula run build        # tsup -> dist/scaffold.mjs
```

**Always run `pnpm run build` and commit the resulting `dist/scaffold.mjs` after editing `scaffold.ts`.** The skill's `dist/` output is what actually ships and runs — agents invoke the built artifact, not the TypeScript source — so an unbuilt change to `scaffold.ts` has no effect until you rebuild.

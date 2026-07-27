---
name: create-next-app-with-raula
description: "Scaffold a new Next.js application with create-next-app in a user-specified directory or, when no target path is given, the current directory; then wire up a raula lint/format toolchain (oxlint-plugin-raula + stylelint-plugin-raula + oxfmt by default, or eslint-plugin-raula + Biome), enable Cache Components when supported, run lint and format, and commit the initialized app. Supports selecting pnpm, npm, yarn, or bun, a Next.js release tag or exact version, and the toolchain. Use when the user asks to start, create, bootstrap, or initialize a Next.js app with raula/eslint-plugin-raula."
---

# Create Next App With Raula

## Supported inputs

Support exactly these user-configurable inputs:

| Input | Accepted values | Default |
|---|---|---|
| Target directory | A directory path | `.` |
| Package manager | `pnpm`, `npm`, `yarn`, or `bun` | `pnpm` |
| Next.js version | An npm dist-tag such as `latest`, `preview`, or `canary`, or an exact version such as `16.3.0-preview.6` | `latest` |
| Lint/format toolchain | `oxlint` (oxlint-plugin-raula + stylelint-plugin-raula + oxfmt) or `eslint` (eslint-plugin-raula + Biome) | `oxlint` |

When asked what this skill supports or what can be configured, answer from this table. Treat all other setup choices as fixed by this skill; do not offer them as configurable inputs.

## Workflow

The actual setup is a deterministic script (`dist/scaffold.mjs`, the built artifact in this skill's directory — source is `scaffold.ts`, see Development below) — not a sequence of commands for you to improvise. Your job is the judgment calls around it:

1. Determine the four supported inputs before running the script:
   - If the user names a package manager (pnpm, npm, yarn, bun), use it. Otherwise default to pnpm.
   - If the user gives a path, use it as the target directory. If not, use `.` (the current working directory).
   - If the user gives a Next.js dist-tag or exact version, use it. Otherwise default to `latest`.
   - If the user asks for eslint, Biome, or explicitly says they don't want oxlint/stylelint/oxfmt, use `eslint`. Otherwise default to `oxlint` — this skill is opinionated and oxlint is the preferred toolchain.
   - Do not ask for a project name. The target directory is the project directory.
2. Before scaffolding into an existing directory, inspect it. If it contains files unrelated to this setup, stop and ask the user whether to continue, choose another directory, or clean it up. The script does not make this judgment call for you — it will happily scaffold into (and its `create-next-app` step may fail loudly inside) a directory that isn't empty.
3. Run the script from this skill's own directory:

   ```bash
   node dist/scaffold.mjs --dir <target-directory-or-.> --pm <pnpm|npm|yarn|bun> --next-version <tag-or-version> --toolchain <eslint|oxlint>
   ```

4. After it finishes, independently verify the result yourself — don't just trust the script's own output:
   - Read `git show --stat HEAD` (the script already prints this, but re-check it) and skim the diff for anything unexpected.
   - For the `eslint` toolchain: confirm `package.json` has a `lint` script (ESLint) and a `format` script (Biome).
   - For the `oxlint` toolchain: confirm `eslint.config.mjs` is gone, and `package.json` has `lint` (oxlint), `lint:css` (stylelint), and `format` (oxfmt) scripts.
   - If the resolved Next.js version is `16.3.0` or later, confirm `next.config.ts` has `cacheComponents: true`.
5. Report the result to the user in plain prose: what was created, which package manager, Next.js version, and toolchain were used, and anything the script skipped (e.g. Cache Components on an older Next.js version) or warned about.

If the script fails partway through, read its output to find the failed step, fix the concrete problem in the generated app (partial installs, a network hiccup, an incompatible flag), then re-run the script — it is safe to re-run: package installs and the `eslint-plugin-raula`/`stylelint-plugin-raula`/config edits are idempotent, and steps that already ran will just report "already up to date" or overwrite deterministically. Don't recreate the project from scratch unless the user asks for a clean retry.

### What the script does, and why it's not just the plain create-next-app flags

The script scaffolds with `create-next-app@<version>` using fixed flags (TypeScript, empty template, App Router, ESLint, Tailwind CSS, React Compiler, `--skip-install`) — do not change these unless the user explicitly asks to modify the skill itself. ESLint is always part of the initial scaffold because create-next-app has no non-interactive "no linter" flag (omitting both `--eslint` and `--biome` still installs ESLint from saved/default preferences — confirmed by testing the actual CLI). What happens next depends on the toolchain:

**`eslint`.** The script deliberately does **not** pass `--biome`: create-next-app treats "linter" as a single choice between ESLint and Biome, so passing both flags together silently drops Biome (no `biome.json`, no dependency, no format script). Biome is set up separately, as a **formatter only** (its own linter is disabled in the generated `biome.json`), so ESLint(+raula) keeps owning linting and Biome owns formatting, with no overlap. The script installs dependencies (approving `sharp`/`unrs-resolver` build scripts first if the package manager is pnpm), adds `eslint-plugin-raula` as an exact dev dependency and runs its own installer (`eslint-plugin-raula install --eslint --agents-md`), adds `@biomejs/biome` as an exact dev dependency and writes `biome.json` (schema version matched to whatever actually got installed) plus a `format` script.

**`oxlint` (default).** The script removes the ESLint that create-next-app just installed (`eslint`, `eslint-config-next`, and `eslint.config.mjs`), then adds `oxlint`, `oxlint-plugin-raula`, `stylelint`, `stylelint-plugin-raula`, and `oxfmt` as exact dev dependencies. It writes `.oxlintrc.json` extending `oxlint-plugin-raula`'s shareable preset, writes a minimal `stylelint.config.mjs` and runs `stylelint-plugin-raula install --stylelint --agents-md` to wire up the CSS preset and AGENTS.md (`oxlint-plugin-raula` has no installer yet, so its config is hand-written), writes `.oxfmtrc.jsonc` (tabs, standard import sorting), and sets `lint` to `oxlint`, `lint:css` to `stylelint 'app/**/*.css'`, and `format` to `oxfmt`. `no-await-in-layout` isn't ported to `oxlint-plugin-raula` — see its README — so Cache Components (below) is this toolchain's only guard against that class of bug.

Regardless of toolchain, the script also checks the *resolved* Next.js version in `package.json` (not the dist-tag you asked for) and adds `cacheComponents: true` to `next.config.ts` if it's `16.3.0` or later, runs `lint` (and, for `oxlint`, `lint:css`) then `format`, and commits everything as `initialized raula`.

`eslint-plugin-raula` still ships its own `no-await-in-layout` rule; this skill doesn't touch that. Enabling Cache Components is additive — it catches a broader class of blocking-render issues at build time (any uncached data access, not just `await` in a layout), not a replacement for the lint rule.

### A note on freshly published raula packages

If `eslint-plugin-raula`, `oxlint-plugin-raula`, or `stylelint-plugin-raula` was published very recently, pnpm's supply-chain `minimumReleaseAge` policy can reject it — even after `addExactDev` succeeds, a later plain `pnpm <bin>` or `pnpm <script>` re-checks the lockfile and fails with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`. The script already works around this for pnpm by passing `--config.minimumReleaseAge=0` on the commands that need it; this is scoped to those individual invocations, not written into the scaffolded app's own config. If you see this error from a manual command you ran outside the script, add the same flag or wait out the cutoff.

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

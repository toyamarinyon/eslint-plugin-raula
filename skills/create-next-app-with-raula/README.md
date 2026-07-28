# create-next-app-with-raula

An agent skill for bootstrapping a new Next.js app with
[`eslint-plugin-raula`](https://www.npmjs.com/package/eslint-plugin-raula).

It is intentionally small: one repeatable setup flow for starting a Next.js app
in a target directory, wiring up a raula lint/format toolchain, running the
feedback loops, and committing the result.

## Why This Exists

Starting a new app tends to involve the same pile of decisions and follow-up
commands every time:

- which `create-next-app` flags to use
- how to handle a user-specified target directory
- which lint/format toolchain to wire up (`eslint-plugin-raula` + Biome, or
  `oxlint-plugin-raula` + `stylelint-plugin-raula` + oxfmt)
- which checks to run before the first commit

This skill captures that flow so an agent can run it consistently without
re-deriving the setup each time.

## Skill

- **[create-next-app-with-raula](./SKILL.md)** -
  Scaffold a Next.js app in a user-specified directory, or the current directory
  when no target path is given, using `create-next-app`; then wire up a raula
  lint/format toolchain, run lint and format, and commit the initialized app.

## Quickstart

This skill lives in the [raula](https://github.com/toyamarinyon/raula) monorepo, which bundles more than one skill. Install just this one with your preferred skill manager:

```bash
npx skills@latest add toyamarinyon/raula --skill create-next-app-with-raula
```

Or:

```bash
apm install toyamarinyon/raula --skill create-next-app-with-raula
```

You can also link this directory into your agent's skills directory manually.

## Usage

Ask your agent to create a Next.js app with raula:

```text
create a new Next.js app with raula in this directory
```

```text
use this skill to create a Next.js app at ~/Documents/sample-app
```

The skill does not ask for a project name. If you provide a path, that directory
is the project directory. If you do not provide a path, the current working
directory is the project directory.

### Supported inputs

The skill supports exactly three user-configurable inputs:

| Input | Accepted values | Default |
|---|---|---|
| Target directory | A directory path | `.` |
| Package manager | `pnpm`, `npm`, `yarn`, or `bun` | `pnpm` |
| Lint/format toolchain | `oxlint` (oxlint-plugin-raula + stylelint-plugin-raula + oxfmt) or `eslint` (eslint-plugin-raula + Biome) | `oxlint` |

The Next.js version is not configurable — the script always scaffolds with
`create-next-app@preview`. See "Why `preview`" in [SKILL.md](./SKILL.md) for
the reasoning.

For example:

```text
create a Next.js app with raula in ./my-app using bun
```

```text
create a Next.js app with raula in ./my-app using the oxlint toolchain
```

All other scaffold choices are fixed by the skill.

## Workflow

The agent's job is to pick the target directory, package manager, and
toolchain, decide whether an existing target directory is safe to scaffold
into, then run a deterministic script — the built `dist/scaffold.mjs`, next
to the skill — and independently verify the result before reporting back.
The script, not agent-improvised shell commands, owns every
package-manager-specific command and every config-file edit, so re-runs are
consistent regardless of which model invokes the skill.

```bash
node dist/scaffold.mjs --dir <target-directory-or-.> --pm <pnpm|npm|yarn|bun> --toolchain <eslint|oxlint>
```

It scaffolds with `create-next-app@preview` using fixed flags — TypeScript,
the empty template, App Router, Tailwind CSS, React Compiler, and
`--skip-install` — plus `--eslint` or `--no-eslint` depending on the
toolchain.

For the **`eslint`** toolchain, the script scaffolds with `--eslint` and
deliberately omits `--biome`: `create-next-app` treats "linter" as a single
choice between ESLint and Biome, so passing both flags together silently
drops Biome (no `biome.json`, no dependency, no format script). Biome is set
up separately as a **formatter only** — its own linter is disabled in the
generated `biome.json` — so ESLint(+raula) keeps owning linting with no
overlap. It installs dependencies (approving `sharp` and `unrs-resolver`
build scripts first if the package manager is pnpm), adds
`eslint-plugin-raula` as an exact dev dependency and runs its own installer
(`eslint-plugin-raula install --eslint --agents-md`), and adds
`@biomejs/biome` as an exact dev dependency and writes `biome.json` plus a
`format` script.

For the **`oxlint`** toolchain (default), the script scaffolds with
`--no-eslint` — confirmed by testing the CLI that this skips ESLint
entirely (no `eslint.config.mjs`, no `eslint`/`eslint-config-next` deps, no
`lint` script) — then adds `oxlint`, `oxlint-plugin-raula`, `stylelint`,
`stylelint-plugin-raula`, and `oxfmt` as exact dev dependencies, writes
`.oxlintrc.json` extending `oxlint-plugin-raula`'s shareable preset, writes a
minimal `stylelint.config.mjs` and runs `stylelint-plugin-raula install
--stylelint --agents-md` to wire up the CSS preset and AGENTS.md, writes
`.oxfmtrc.jsonc` (tabs, standard import sorting), and points the `lint`,
`lint:css`, and `format` scripts at `oxlint`, `stylelint`, and `oxfmt`.
`no-await-in-layout` isn't ported to `oxlint-plugin-raula`, so Cache
Components (below) is this toolchain's only guard against that class of bug.

Regardless of toolchain, the script checks the *resolved* Next.js version and
adds `cacheComponents: true` to `next.config.ts` when it's `16.3.0` or later
— with the `preview` pin this should always be true — (this is additive to
`eslint-plugin-raula`'s own `no-await-in-layout` rule, not a replacement —
Cache Components catches a broader class of blocking-render issues at build
time), runs `lint` (and, for `oxlint`, `lint:css`) then `format`, and commits
everything as `initialized raula`.

## Development

The script is written in TypeScript (`scaffold.ts`) with unit tests
(`scaffold.test.ts`) covering argument parsing, the `next.config.ts`/
`biome.json` edits, and Next.js version comparison. The full end-to-end flow
(actually invoking `create-next-app`, package installs across all four
package managers) is verified manually rather than in CI, since it's slow
and network-dependent.

From the monorepo root:

```bash
pnpm install
pnpm --filter create-next-app-with-raula run typecheck
pnpm --filter create-next-app-with-raula run test
pnpm --filter create-next-app-with-raula run build   # -> dist/scaffold.mjs
```

`dist/scaffold.mjs` is what the skill actually runs and is committed to the
repository — always rebuild and commit it after editing `scaffold.ts`.

#!/usr/bin/env node
// Deterministic setup script for the create-next-app-with-raula skill.
//
// The agent's job is to determine the three supported inputs (target
// directory, package manager, Next.js version), inspect an existing target
// directory and decide whether it's safe to scaffold into, invoke this
// script, then independently review the result (git log/diff, running the
// app) before reporting to the user. Everything else — the exact commands,
// their order, and the config file edits — is fixed here so re-runs are
// consistent regardless of which agent or model invokes the skill.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

type Command = [string, string[]];

type PmCommands = {
	scaffold: (pkg: string, target: string) => Command;
	install: () => Command;
	addExactDev: (pkgs: string[]) => Command;
	removeDev: (pkgs: string[]) => Command;
	runBin: (pkg: string, args: string[]) => Command;
	runScript: (script: string) => Command;
};

export const PM_COMMANDS: Record<PackageManager, PmCommands> = {
	pnpm: {
		scaffold: (pkg, target) => ["pnpm", ["create", pkg, target, "--use-pnpm"]],
		install: () => ["pnpm", ["install"]],
		addExactDev: (pkgs) => [
			"pnpm",
			["add", "-DE", ...pkgs, "--config.minimumReleaseAge=0"],
		],
		removeDev: (pkgs) => ["pnpm", ["remove", ...pkgs]],
		// `--config.minimumReleaseAge=0` must precede the bin name here — pnpm
		// only parses its own global flags before an unrecognized subcommand
		// (which is how `pnpm <bin>` resolves to running that bin). Needed
		// because `pnpm <bin> ...` runs pnpm's supply-chain deps-status check
		// against the lockfile, which would otherwise reject the
		// just-published raula packages `addExactDev` already added.
		runBin: (pkg, args) => [
			"pnpm",
			["--config.minimumReleaseAge=0", pkg, ...args],
		],
		// Same reasoning as runBin above: `pnpm <script>` re-runs the
		// supply-chain deps-status check too.
		runScript: (script) => ["pnpm", ["--config.minimumReleaseAge=0", script]],
	},
	npm: {
		scaffold: (pkg, target) => ["npx", [pkg, target, "--use-npm"]],
		install: () => ["npm", ["install"]],
		addExactDev: (pkgs) => ["npm", ["install", "-D", "-E", ...pkgs]],
		removeDev: (pkgs) => ["npm", ["uninstall", ...pkgs]],
		runBin: (pkg, args) => ["npx", [pkg, ...args]],
		runScript: (script) => ["npm", ["run", script]],
	},
	yarn: {
		scaffold: (pkg, target) => ["yarn", ["create", pkg, target, "--use-yarn"]],
		install: () => ["yarn", ["install"]],
		addExactDev: (pkgs) => ["yarn", ["add", "-D", "-E", ...pkgs]],
		removeDev: (pkgs) => ["yarn", ["remove", ...pkgs]],
		runBin: (pkg, args) => ["yarn", [pkg, ...args]],
		runScript: (script) => ["yarn", [script]],
	},
	bun: {
		scaffold: (pkg, target) => ["bunx", [pkg, target, "--use-bun"]],
		install: () => ["bun", ["install"]],
		addExactDev: (pkgs) => ["bun", ["add", "-d", "--exact", ...pkgs]],
		removeDev: (pkgs) => ["bun", ["remove", ...pkgs]],
		runBin: (pkg, args) => ["bunx", [pkg, ...args]],
		runScript: (script) => ["bun", ["run", script]],
	},
};

// `--biome` is deliberately absent: create-next-app treats "linter" as a
// single choice between ESLint and Biome — passing both flags together
// silently drops Biome entirely (no biome.json, no @biomejs/biome
// dependency, no format script). Biome is set up explicitly below instead,
// as a formatter only (ESLint keeps owning lint).
export const SCAFFOLD_FLAGS = [
	"--ts",
	"--empty",
	"--app",
	"--eslint",
	"--tailwind",
	"--react-compiler",
	"--skip-install",
];

export type BiomeConfig = {
	$schema: string;
	vcs: { enabled: boolean; clientKind: string; useIgnoreFile: boolean };
	files: { ignoreUnknown: boolean; includes: string[] };
	formatter: { enabled: boolean; indentStyle: string; indentWidth: number };
	css: { parser: { tailwindDirectives: boolean } };
	linter: { enabled: boolean };
	assist: { actions: { source: { organizeImports: string } } };
};

export function buildBiomeConfig(schemaVersion: string): BiomeConfig {
	return {
		$schema: `https://biomejs.dev/schemas/${schemaVersion}/schema.json`,
		vcs: {
			enabled: true,
			clientKind: "git",
			useIgnoreFile: true,
		},
		files: {
			ignoreUnknown: true,
			includes: ["**", "!node_modules", "!.next", "!dist", "!build"],
		},
		formatter: {
			enabled: true,
			indentStyle: "tab",
			indentWidth: 2,
		},
		css: {
			parser: {
				tailwindDirectives: true,
			},
		},
		linter: {
			enabled: false,
		},
		assist: {
			actions: {
				source: {
					organizeImports: "on",
				},
			},
		},
	};
}

export const MIN_CACHE_COMPONENTS_VERSION: [number, number, number] = [
	16, 3, 0,
];

export type Toolchain = "eslint" | "oxlint";

export const TOOLCHAINS: Toolchain[] = ["eslint", "oxlint"];

export type ScaffoldArgs = {
	dir: string;
	pm: PackageManager;
	nextVersion: string;
	toolchain: Toolchain;
};

export function parseArgs(argv: string[]): ScaffoldArgs {
	const args: ScaffoldArgs = {
		dir: ".",
		pm: "pnpm",
		nextVersion: "latest",
		toolchain: "eslint",
	};
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === "--dir") {
			args.dir = argv[++i] ?? "";
		} else if (arg === "--pm") {
			args.pm = (argv[++i] ?? "") as PackageManager;
		} else if (arg === "--next-version") {
			args.nextVersion = argv[++i] ?? "";
		} else if (arg === "--toolchain") {
			args.toolchain = (argv[++i] ?? "") as Toolchain;
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (!(args.pm in PM_COMMANDS)) {
		throw new Error(
			`Unsupported package manager "${args.pm}". Use one of: ${Object.keys(PM_COMMANDS).join(", ")}`,
		);
	}
	if (!TOOLCHAINS.includes(args.toolchain)) {
		throw new Error(
			`Unsupported toolchain "${args.toolchain}". Use one of: ${TOOLCHAINS.join(", ")}`,
		);
	}
	return args;
}

function run(
	label: string,
	[cmd, cmdArgs]: Command,
	cwd: string,
	{ allowFailure = false }: { allowFailure?: boolean } = {},
): void {
	console.log(`\n$ ${cmd} ${cmdArgs.join(" ")}`);
	try {
		execFileSync(cmd, cmdArgs, { cwd, stdio: "inherit" });
	} catch (error) {
		if (allowFailure) {
			console.warn(`\n${label} exited non-zero, continuing anyway.`);
			return;
		}
		console.error(`\nFailed at step: ${label}`);
		throw error;
	}
}

export function findMatchingBrace(source: string, openIndex: number): number {
	let depth = 0;
	let quote: string | undefined;
	let escaped = false;
	for (let i = openIndex; i < source.length; i += 1) {
		const ch = source[i];
		if (quote) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === quote) quote = undefined;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			quote = ch;
			continue;
		}
		if (ch === "{") depth += 1;
		else if (ch === "}") {
			depth -= 1;
			if (depth === 0) return i;
		}
	}
	return -1;
}

export type CacheComponentsInsertResult =
	| { status: "inserted"; updated: string }
	| { status: "already-present" }
	| { status: "skipped"; reason: string };

export function insertCacheComponents(
	source: string,
): CacheComponentsInsertResult {
	if (source.includes("cacheComponents")) {
		return { status: "already-present" };
	}

	const match = /NextConfig\s*=\s*\{/.exec(source);
	if (!match) {
		return {
			status: "skipped",
			reason:
				"Could not find `const nextConfig: NextConfig = {` in next.config.ts.",
		};
	}

	const openIndex = source.indexOf("{", match.index);
	const closeIndex = findMatchingBrace(source, openIndex);
	if (closeIndex === -1) {
		return {
			status: "skipped",
			reason: "Could not parse next.config.ts's config object.",
		};
	}

	const lineStart = source.lastIndexOf("\n", openIndex) + 1;
	const indentMatch = /^[\t ]*/.exec(source.slice(lineStart));
	const lineIndent = indentMatch ? indentMatch[0] : "";
	const bodyIndentMatch = /\n([\t ]+)\S/.exec(
		source.slice(openIndex, closeIndex),
	);
	const propertyIndent = bodyIndentMatch
		? bodyIndentMatch[1]
		: `${lineIndent}\t`;

	const updated = `${source.slice(0, openIndex + 1)}\n${propertyIndent}cacheComponents: true,${source.slice(openIndex + 1)}`;
	return { status: "inserted", updated };
}

export function parseVersionTriple(
	version: string,
): [number, number, number] | null {
	const versionMatch = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
	if (!versionMatch) return null;
	const [, major, minor, patch] = versionMatch;
	return [Number(major), Number(minor), Number(patch)];
}

export function meetsMinimumVersion(
	version: [number, number, number],
	minimum: [number, number, number],
): boolean {
	for (let i = 0; i < 3; i += 1) {
		if (version[i]! > minimum[i]!) return true;
		if (version[i]! < minimum[i]!) return false;
	}
	return true;
}

function addCacheComponentsToNextConfig(appDir: string): void {
	const configPath = path.join(appDir, "next.config.ts");
	if (!fs.existsSync(configPath)) {
		console.log("next.config.ts not found, skipping Cache Components step.");
		return;
	}

	const source = fs.readFileSync(configPath, "utf8");
	const result = insertCacheComponents(source);
	if (result.status === "already-present") {
		console.log("next.config.ts already has cacheComponents, skipping.");
		return;
	}
	if (result.status === "skipped") {
		console.warn(
			`${result.reason} Skipping the Cache Components edit — add \`cacheComponents: true\` manually if this Next.js version supports it.`,
		);
		return;
	}

	fs.writeFileSync(configPath, result.updated, "utf8");
	console.log("Added `cacheComponents: true` to next.config.ts.");
}

function resolvedNextVersionSupportsCacheComponents(appDir: string): boolean {
	const packageJsonPath = path.join(appDir, "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const resolved = packageJson.dependencies?.next;
	if (typeof resolved !== "string") {
		console.warn(
			"Could not read the resolved `next` version from package.json. Skipping the Cache Components check.",
		);
		return false;
	}

	const triple = parseVersionTriple(resolved);
	if (!triple) {
		console.warn(
			`Could not parse resolved Next.js version "${resolved}". Skipping the Cache Components check.`,
		);
		return false;
	}

	return meetsMinimumVersion(triple, MIN_CACHE_COMPONENTS_VERSION);
}

function writeBiomeConfig(appDir: string): void {
	const packageJsonPath = path.join(appDir, "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const resolved: string | undefined =
		packageJson.devDependencies?.["@biomejs/biome"];
	const versionMatch = resolved ? /^(\d+\.\d+\.\d+)/.exec(resolved) : null;
	const schemaVersion = versionMatch ? versionMatch[1]! : "latest";
	if (!versionMatch) {
		console.warn(
			`Could not read the resolved @biomejs/biome version from package.json (got "${resolved}"). Falling back to the "latest" schema URL.`,
		);
	}

	const configPath = path.join(appDir, "biome.json");
	fs.writeFileSync(
		configPath,
		`${JSON.stringify(buildBiomeConfig(schemaVersion), null, "\t")}\n`,
		"utf8",
	);
	console.log(`Wrote biome.json (schema ${schemaVersion}, formatter only).`);

	packageJson.scripts ??= {};
	packageJson.scripts.format = "biome format --write";
	fs.writeFileSync(
		packageJsonPath,
		`${JSON.stringify(packageJson, null, "\t")}\n`,
		"utf8",
	);
	console.log('Added the "format" script to package.json.');
}

function updatePackageJsonScripts(
	appDir: string,
	scripts: Record<string, string>,
): void {
	const packageJsonPath = path.join(appDir, "package.json");
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	packageJson.scripts ??= {};
	Object.assign(packageJson.scripts, scripts);
	fs.writeFileSync(
		packageJsonPath,
		`${JSON.stringify(packageJson, null, "\t")}\n`,
		"utf8",
	);
}

function removeEslintConfig(appDir: string): void {
	const configPath = path.join(appDir, "eslint.config.mjs");
	if (fs.existsSync(configPath)) {
		fs.rmSync(configPath);
		console.log("Removed eslint.config.mjs.");
	}
}

// create-next-app has no way to scaffold without ESLint (there's no
// non-interactive "no linter" flag — omitting both --eslint and --biome
// still installs ESLint from saved/default preferences). So the oxlint
// toolchain scaffolds with ESLint like the default path, then strips it.
export const OXLINT_CONFIG = {
	extends: ["./node_modules/oxlint-plugin-raula/.oxlintrc.json"],
};

function writeOxlintConfig(appDir: string): void {
	fs.writeFileSync(
		path.join(appDir, ".oxlintrc.json"),
		`${JSON.stringify(OXLINT_CONFIG, null, "\t")}\n`,
		"utf8",
	);
	console.log("Wrote .oxlintrc.json extending oxlint-plugin-raula's preset.");
}

// stylelint-plugin-raula's own installer requires a stylelint config file to
// already exist (it edits `extends`, it doesn't create the file), so write a
// minimal one first and let the installer wire up the raula preset + AGENTS.md.
function writeInitialStylelintConfig(appDir: string): void {
	fs.writeFileSync(
		path.join(appDir, "stylelint.config.mjs"),
		"export default {};\n",
		"utf8",
	);
}

export const OXFMT_CONFIG = {
	useTabs: true,
	sortImports: true,
};

function writeOxfmtConfig(appDir: string): void {
	fs.writeFileSync(
		path.join(appDir, ".oxfmtrc.jsonc"),
		`${JSON.stringify(OXFMT_CONFIG, null, "\t")}\n`,
		"utf8",
	);
	console.log("Wrote .oxfmtrc.jsonc (tabs, standard import sorting).");
}

function setUpEslintToolchain(pm: PmCommands, appDir: string): void {
	run(
		"add eslint-plugin-raula",
		pm.addExactDev(["eslint-plugin-raula@latest"]),
		appDir,
	);
	run(
		"eslint-plugin-raula install",
		pm.runBin("eslint-plugin-raula", ["install", "--eslint", "--agents-md"]),
		appDir,
	);
	run("add @biomejs/biome", pm.addExactDev(["@biomejs/biome@latest"]), appDir);
	writeBiomeConfig(appDir);
}

function setUpOxlintToolchain(pm: PmCommands, appDir: string): void {
	run("remove eslint", pm.removeDev(["eslint", "eslint-config-next"]), appDir);
	removeEslintConfig(appDir);

	run(
		"add oxlint toolchain",
		pm.addExactDev([
			"oxlint@latest",
			"oxlint-plugin-raula@latest",
			"stylelint@latest",
			"stylelint-plugin-raula@latest",
			"oxfmt@latest",
		]),
		appDir,
	);

	writeOxlintConfig(appDir);
	writeInitialStylelintConfig(appDir);
	run(
		"stylelint-plugin-raula install",
		pm.runBin("stylelint-plugin-raula", [
			"install",
			"--stylelint",
			"--agents-md",
		]),
		appDir,
	);
	writeOxfmtConfig(appDir);

	updatePackageJsonScripts(appDir, {
		lint: "oxlint",
		"lint:css": "stylelint 'app/**/*.css'",
		format: "oxfmt",
	});
}

function main(): void {
	const args = parseArgs(process.argv.slice(2));
	const pm = PM_COMMANDS[args.pm];
	const createNextAppPackage = `create-next-app@${args.nextVersion}`;
	const cwd = process.cwd();
	const resolvedTarget = path.resolve(cwd, args.dir);

	const [scaffoldCmd, scaffoldArgs] = pm.scaffold(
		createNextAppPackage,
		args.dir,
	);
	run("scaffold", [scaffoldCmd, [...scaffoldArgs, ...SCAFFOLD_FLAGS]], cwd);

	const appDir = resolvedTarget;

	if (args.pm === "pnpm") {
		// A fresh install always reports ignored build scripts for `sharp` and
		// `unrs-resolver` and exits non-zero — and `pnpm approve-builds` has
		// nothing to approve until a lockfile exists flagging them as pending.
		// So: install once (expecting that failure), approve the builds, then
		// install again so the build scripts actually run.
		run("install (pre-approval)", pm.install(), appDir, {
			allowFailure: true,
		});
		run(
			"approve builds",
			["pnpm", ["approve-builds", "sharp", "unrs-resolver"]],
			appDir,
		);
	}
	run("install", pm.install(), appDir);

	if (resolvedNextVersionSupportsCacheComponents(appDir)) {
		addCacheComponentsToNextConfig(appDir);
	} else {
		console.log(
			"Resolved Next.js version is older than 16.3.0 — Cache Components isn't available yet, skipping.",
		);
	}

	if (args.toolchain === "eslint") {
		setUpEslintToolchain(pm, appDir);
	} else {
		setUpOxlintToolchain(pm, appDir);
	}

	run("lint", pm.runScript("lint"), appDir);
	if (args.toolchain === "oxlint") {
		run("lint:css", pm.runScript("lint:css"), appDir);
	}
	run("format", pm.runScript("format"), appDir);

	execFileSync("git", ["add", "."], { cwd: appDir, stdio: "inherit" });
	execFileSync("git", ["commit", "-m", "initialized raula"], {
		cwd: appDir,
		stdio: "inherit",
	});

	console.log("\nDone. Review the result:");
	execFileSync("git", ["show", "--stat", "HEAD"], {
		cwd: appDir,
		stdio: "inherit",
	});
}

const isMain =
	process.argv[1] &&
	path.resolve(process.argv[1]) ===
		path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
	main();
}

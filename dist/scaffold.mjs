#!/usr/bin/env node

// skills/create-next-app-with-raula/scaffold.ts
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
var PM_COMMANDS = {
  pnpm: {
    scaffold: (pkg, target) => ["pnpm", ["create", pkg, target, "--use-pnpm"]],
    install: () => ["pnpm", ["install"]],
    addExactDev: (pkg) => [
      "pnpm",
      ["add", "-DE", pkg, "--config.minimumReleaseAge=0"]
    ],
    runBin: (pkg, args) => ["pnpm", [pkg, ...args]],
    runScript: (script) => ["pnpm", [script]]
  },
  npm: {
    scaffold: (pkg, target) => ["npx", [pkg, target, "--use-npm"]],
    install: () => ["npm", ["install"]],
    addExactDev: (pkg) => ["npm", ["install", "-D", "-E", pkg]],
    runBin: (pkg, args) => ["npx", [pkg, ...args]],
    runScript: (script) => ["npm", ["run", script]]
  },
  yarn: {
    scaffold: (pkg, target) => ["yarn", ["create", pkg, target, "--use-yarn"]],
    install: () => ["yarn", ["install"]],
    addExactDev: (pkg) => ["yarn", ["add", "-D", "-E", pkg]],
    runBin: (pkg, args) => ["yarn", [pkg, ...args]],
    runScript: (script) => ["yarn", [script]]
  },
  bun: {
    scaffold: (pkg, target) => ["bunx", [pkg, target, "--use-bun"]],
    install: () => ["bun", ["install"]],
    addExactDev: (pkg) => ["bun", ["add", "-d", "--exact", pkg]],
    runBin: (pkg, args) => ["bunx", [pkg, ...args]],
    runScript: (script) => ["bun", ["run", script]]
  }
};
var SCAFFOLD_FLAGS = [
  "--ts",
  "--empty",
  "--app",
  "--eslint",
  "--tailwind",
  "--react-compiler",
  "--skip-install"
];
function buildBiomeConfig(schemaVersion) {
  return {
    $schema: `https://biomejs.dev/schemas/${schemaVersion}/schema.json`,
    vcs: {
      enabled: true,
      clientKind: "git",
      useIgnoreFile: true
    },
    files: {
      ignoreUnknown: true,
      includes: ["**", "!node_modules", "!.next", "!dist", "!build"]
    },
    formatter: {
      enabled: true,
      indentStyle: "tab",
      indentWidth: 2
    },
    css: {
      parser: {
        tailwindDirectives: true
      }
    },
    linter: {
      enabled: false
    },
    assist: {
      actions: {
        source: {
          organizeImports: "on"
        }
      }
    }
  };
}
var MIN_CACHE_COMPONENTS_VERSION = [
  16,
  3,
  0
];
function parseArgs(argv) {
  const args = { dir: ".", pm: "pnpm", nextVersion: "latest" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dir") {
      args.dir = argv[++i] ?? "";
    } else if (arg === "--pm") {
      args.pm = argv[++i] ?? "";
    } else if (arg === "--next-version") {
      args.nextVersion = argv[++i] ?? "";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!(args.pm in PM_COMMANDS)) {
    throw new Error(
      `Unsupported package manager "${args.pm}". Use one of: ${Object.keys(PM_COMMANDS).join(", ")}`
    );
  }
  return args;
}
function run(label, [cmd, cmdArgs], cwd, { allowFailure = false } = {}) {
  console.log(`
$ ${cmd} ${cmdArgs.join(" ")}`);
  try {
    execFileSync(cmd, cmdArgs, { cwd, stdio: "inherit" });
  } catch (error) {
    if (allowFailure) {
      console.warn(`
${label} exited non-zero, continuing anyway.`);
      return;
    }
    console.error(`
Failed at step: ${label}`);
    throw error;
  }
}
function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote;
  let escaped = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = void 0;
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
function insertCacheComponents(source) {
  if (source.includes("cacheComponents")) {
    return { status: "already-present" };
  }
  const match = /NextConfig\s*=\s*\{/.exec(source);
  if (!match) {
    return {
      status: "skipped",
      reason: "Could not find `const nextConfig: NextConfig = {` in next.config.ts."
    };
  }
  const openIndex = source.indexOf("{", match.index);
  const closeIndex = findMatchingBrace(source, openIndex);
  if (closeIndex === -1) {
    return {
      status: "skipped",
      reason: "Could not parse next.config.ts's config object."
    };
  }
  const lineStart = source.lastIndexOf("\n", openIndex) + 1;
  const indentMatch = /^[\t ]*/.exec(source.slice(lineStart));
  const lineIndent = indentMatch ? indentMatch[0] : "";
  const bodyIndentMatch = /\n([\t ]+)\S/.exec(
    source.slice(openIndex, closeIndex)
  );
  const propertyIndent = bodyIndentMatch ? bodyIndentMatch[1] : `${lineIndent}	`;
  const updated = `${source.slice(0, openIndex + 1)}
${propertyIndent}cacheComponents: true,${source.slice(openIndex + 1)}`;
  return { status: "inserted", updated };
}
function parseVersionTriple(version) {
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!versionMatch) return null;
  const [, major, minor, patch] = versionMatch;
  return [Number(major), Number(minor), Number(patch)];
}
function meetsMinimumVersion(version, minimum) {
  for (let i = 0; i < 3; i += 1) {
    if (version[i] > minimum[i]) return true;
    if (version[i] < minimum[i]) return false;
  }
  return true;
}
function addCacheComponentsToNextConfig(appDir) {
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
      `${result.reason} Skipping the Cache Components edit \u2014 add \`cacheComponents: true\` manually if this Next.js version supports it.`
    );
    return;
  }
  fs.writeFileSync(configPath, result.updated, "utf8");
  console.log("Added `cacheComponents: true` to next.config.ts.");
}
function resolvedNextVersionSupportsCacheComponents(appDir) {
  const packageJsonPath = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const resolved = packageJson.dependencies?.next;
  if (typeof resolved !== "string") {
    console.warn(
      "Could not read the resolved `next` version from package.json. Skipping the Cache Components check."
    );
    return false;
  }
  const triple = parseVersionTriple(resolved);
  if (!triple) {
    console.warn(
      `Could not parse resolved Next.js version "${resolved}". Skipping the Cache Components check.`
    );
    return false;
  }
  return meetsMinimumVersion(triple, MIN_CACHE_COMPONENTS_VERSION);
}
function writeBiomeConfig(appDir) {
  const packageJsonPath = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const resolved = packageJson.devDependencies?.["@biomejs/biome"];
  const versionMatch = resolved ? /^(\d+\.\d+\.\d+)/.exec(resolved) : null;
  const schemaVersion = versionMatch ? versionMatch[1] : "latest";
  if (!versionMatch) {
    console.warn(
      `Could not read the resolved @biomejs/biome version from package.json (got "${resolved}"). Falling back to the "latest" schema URL.`
    );
  }
  const configPath = path.join(appDir, "biome.json");
  fs.writeFileSync(
    configPath,
    `${JSON.stringify(buildBiomeConfig(schemaVersion), null, "	")}
`,
    "utf8"
  );
  console.log(`Wrote biome.json (schema ${schemaVersion}, formatter only).`);
  packageJson.scripts ??= {};
  packageJson.scripts.format = "biome format --write";
  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, "	")}
`,
    "utf8"
  );
  console.log('Added the "format" script to package.json.');
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const pm = PM_COMMANDS[args.pm];
  const createNextAppPackage = `create-next-app@${args.nextVersion}`;
  const cwd = process.cwd();
  const resolvedTarget = path.resolve(cwd, args.dir);
  const [scaffoldCmd, scaffoldArgs] = pm.scaffold(
    createNextAppPackage,
    args.dir
  );
  run("scaffold", [scaffoldCmd, [...scaffoldArgs, ...SCAFFOLD_FLAGS]], cwd);
  const appDir = resolvedTarget;
  if (args.pm === "pnpm") {
    run("install (pre-approval)", pm.install(), appDir, {
      allowFailure: true
    });
    run(
      "approve builds",
      ["pnpm", ["approve-builds", "sharp", "unrs-resolver"]],
      appDir
    );
  }
  run("install", pm.install(), appDir);
  run(
    "add eslint-plugin-raula",
    pm.addExactDev("eslint-plugin-raula@latest"),
    appDir
  );
  run(
    "eslint-plugin-raula install",
    pm.runBin("eslint-plugin-raula", ["install", "--eslint", "--agents-md"]),
    appDir
  );
  if (resolvedNextVersionSupportsCacheComponents(appDir)) {
    addCacheComponentsToNextConfig(appDir);
  } else {
    console.log(
      "Resolved Next.js version is older than 16.3.0 \u2014 Cache Components isn't available yet, skipping."
    );
  }
  run("add @biomejs/biome", pm.addExactDev("@biomejs/biome@latest"), appDir);
  writeBiomeConfig(appDir);
  run("lint", pm.runScript("lint"), appDir);
  run("format", pm.runScript("format"), appDir);
  execFileSync("git", ["add", "."], { cwd: appDir, stdio: "inherit" });
  execFileSync("git", ["commit", "-m", "initialized raula"], {
    cwd: appDir,
    stdio: "inherit"
  });
  console.log("\nDone. Review the result:");
  execFileSync("git", ["show", "--stat", "HEAD"], {
    cwd: appDir,
    stdio: "inherit"
  });
}
var isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  main();
}
export {
  MIN_CACHE_COMPONENTS_VERSION,
  PM_COMMANDS,
  SCAFFOLD_FLAGS,
  buildBiomeConfig,
  findMatchingBrace,
  insertCacheComponents,
  meetsMinimumVersion,
  parseArgs,
  parseVersionTriple
};

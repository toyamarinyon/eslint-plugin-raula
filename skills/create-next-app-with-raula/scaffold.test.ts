import { describe, expect, test } from "vitest";
import {
	buildBiomeConfig,
	findMatchingBrace,
	insertCacheComponents,
	MIN_CACHE_COMPONENTS_VERSION,
	meetsMinimumVersion,
	OXFMT_CONFIG,
	OXLINT_CONFIG,
	PM_COMMANDS,
	parseArgs,
	parseVersionTriple,
	scaffoldFlagsFor,
} from "./scaffold";

describe("parseArgs", () => {
	test("applies defaults when no flags are given", () => {
		expect(parseArgs([])).toEqual({
			dir: ".",
			pm: "pnpm",
			nextVersion: "latest",
			toolchain: "oxlint",
		});
	});

	test("parses all four flags", () => {
		expect(
			parseArgs([
				"--dir",
				"./my-app",
				"--pm",
				"npm",
				"--next-version",
				"preview",
				"--toolchain",
				"eslint",
			]),
		).toEqual({
			dir: "./my-app",
			pm: "npm",
			nextVersion: "preview",
			toolchain: "eslint",
		});
	});

	test("rejects an unsupported package manager", () => {
		expect(() => parseArgs(["--pm", "yolo"])).toThrow(
			'Unsupported package manager "yolo"',
		);
	});

	test("rejects an unsupported toolchain", () => {
		expect(() => parseArgs(["--toolchain", "biome"])).toThrow(
			'Unsupported toolchain "biome"',
		);
	});

	test("rejects an unknown argument", () => {
		expect(() => parseArgs(["--wat"])).toThrow("Unknown argument: --wat");
	});
});

describe("PM_COMMANDS", () => {
	test("every package manager defines all five command builders", () => {
		for (const [pm, commands] of Object.entries(PM_COMMANDS)) {
			expect(typeof commands.scaffold).toBe("function");
			expect(typeof commands.install).toBe("function");
			expect(typeof commands.addExactDev).toBe("function");
			expect(typeof commands.runBin).toBe("function");
			expect(typeof commands.runScript).toBe("function");
			expect(commands.install()[0]).toBe(pm === "npm" ? "npm" : pm);
		}
	});

	test("pnpm scaffold command matches the documented shape", () => {
		expect(
			PM_COMMANDS.pnpm.scaffold("create-next-app@latest", "my-app"),
		).toEqual([
			"pnpm",
			["create", "create-next-app@latest", "my-app", "--use-pnpm"],
		]);
	});

	test("npm scaffold command uses npx, not npm", () => {
		expect(
			PM_COMMANDS.npm.scaffold("create-next-app@latest", "my-app"),
		).toEqual(["npx", ["create-next-app@latest", "my-app", "--use-npm"]]);
	});

	test("bun scaffold command uses bunx", () => {
		expect(
			PM_COMMANDS.bun.scaffold("create-next-app@latest", "my-app"),
		).toEqual(["bunx", ["create-next-app@latest", "my-app", "--use-bun"]]);
	});

	test("addExactDev adds every package in one command", () => {
		expect(
			PM_COMMANDS.pnpm.addExactDev(["oxlint@latest", "oxfmt@latest"]),
		).toEqual([
			"pnpm",
			[
				"add",
				"-DE",
				"oxlint@latest",
				"oxfmt@latest",
				"--config.minimumReleaseAge=0",
			],
		]);
	});
});

describe("scaffoldFlagsFor", () => {
	test("passes --eslint for the eslint toolchain", () => {
		expect(scaffoldFlagsFor("eslint")).toContain("--eslint");
		expect(scaffoldFlagsFor("eslint")).not.toContain("--no-eslint");
	});

	test("passes --no-eslint for the oxlint toolchain", () => {
		expect(scaffoldFlagsFor("oxlint")).toContain("--no-eslint");
		expect(scaffoldFlagsFor("oxlint")).not.toContain("--eslint");
	});
});

describe("OXLINT_CONFIG", () => {
	test("extends oxlint-plugin-raula's shareable preset", () => {
		expect(OXLINT_CONFIG).toEqual({
			extends: ["./node_modules/oxlint-plugin-raula/.oxlintrc.json"],
		});
	});
});

describe("OXFMT_CONFIG", () => {
	test("uses tabs and enables standard import sorting", () => {
		expect(OXFMT_CONFIG).toEqual({ useTabs: true, sortImports: true });
	});
});

describe("findMatchingBrace", () => {
	test("finds the matching close brace", () => {
		const source = "const x = { a: 1, b: { c: 2 } };";
		const openIndex = source.indexOf("{");
		expect(findMatchingBrace(source, openIndex)).toBe(source.lastIndexOf("}"));
	});

	test("ignores braces inside strings", () => {
		const source = 'const x = { a: "{ not a brace }" };';
		const openIndex = source.indexOf("{");
		expect(findMatchingBrace(source, openIndex)).toBe(source.lastIndexOf("}"));
	});

	test("returns -1 when unterminated", () => {
		expect(findMatchingBrace("const x = { a: 1", 10)).toBe(-1);
	});
});

describe("parseVersionTriple", () => {
	test("parses a plain version", () => {
		expect(parseVersionTriple("16.2.11")).toEqual([16, 2, 11]);
	});

	test("parses a version with a prerelease suffix", () => {
		expect(parseVersionTriple("16.3.0-preview.9")).toEqual([16, 3, 0]);
	});

	test("returns null for garbage input", () => {
		expect(parseVersionTriple("latest")).toBeNull();
	});
});

describe("meetsMinimumVersion", () => {
	test("a prerelease of the minimum version counts as meeting it", () => {
		const triple = parseVersionTriple("16.3.0-preview.9");
		expect(triple).not.toBeNull();
		expect(meetsMinimumVersion(triple!, MIN_CACHE_COMPONENTS_VERSION)).toBe(
			true,
		);
	});

	test("an older minor version does not meet it", () => {
		const triple = parseVersionTriple("16.2.11");
		expect(triple).not.toBeNull();
		expect(meetsMinimumVersion(triple!, MIN_CACHE_COMPONENTS_VERSION)).toBe(
			false,
		);
	});

	test("a later major version meets it", () => {
		expect(meetsMinimumVersion([17, 0, 0], MIN_CACHE_COMPONENTS_VERSION)).toBe(
			true,
		);
	});

	test("the exact minimum version meets it", () => {
		expect(meetsMinimumVersion([16, 3, 0], MIN_CACHE_COMPONENTS_VERSION)).toBe(
			true,
		);
	});
});

describe("insertCacheComponents", () => {
	test("inserts cacheComponents into a fresh next.config.ts", () => {
		const source = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
\t/* config options here */
\treactCompiler: true,
};

export default nextConfig;
`;
		const result = insertCacheComponents(source);
		expect(result.status).toBe("inserted");
		if (result.status === "inserted") {
			expect(result.updated).toContain("cacheComponents: true,");
			expect(result.updated).toContain("reactCompiler: true,");
			expect(result.updated).toMatch(/cacheComponents: true,\n\t\/\* config/);
		}
	});

	test("is idempotent when cacheComponents is already present", () => {
		const source = `const nextConfig: NextConfig = {
\tcacheComponents: true,
};
`;
		expect(insertCacheComponents(source)).toEqual({
			status: "already-present",
		});
	});

	test("skips when the config object cannot be found", () => {
		const result = insertCacheComponents("export default function () {}");
		expect(result.status).toBe("skipped");
	});
});

describe("buildBiomeConfig", () => {
	test("disables the linter and sets tab indentation", () => {
		const config = buildBiomeConfig("2.5.5");
		expect(config.$schema).toBe(
			"https://biomejs.dev/schemas/2.5.5/schema.json",
		);
		expect(config.formatter.indentStyle).toBe("tab");
		expect(config.linter.enabled).toBe(false);
	});
});

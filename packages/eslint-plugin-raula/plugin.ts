import type { ESLint, Rule } from "eslint";

import { rules as ruleMap } from "./rules";

const rules: Record<string, Rule.RuleModule> = ruleMap;

const plugin: ESLint.Plugin = {
	meta: {
		name: "eslint-plugin-raula",
	},
	rules,
};

export { plugin, rules };

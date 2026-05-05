type RuleCategory = "Tailwind" | "CSS" | "Next.js" | "React";

type CodeLanguage = "css" | "tsx" | "ts" | "js";

type RuleExample = {
	label: string;
	code: string;
	language: CodeLanguage;
};

type RuleDoc = {
	title: string;
	category: RuleCategory;
	summary: string;
	why: string;
	bad: RuleExample[];
	good: RuleExample[];
	options?: {
		description: string;
		schema: string;
	};
};

export type { RuleCategory, RuleDoc, RuleExample };

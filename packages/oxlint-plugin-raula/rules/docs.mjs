/**
 * @typedef {"css" | "tsx" | "ts" | "js"} CodeLanguage
 * @typedef {{ label: string, code: string, language: CodeLanguage }} RuleExample
 * @typedef {{
 *   title: string,
 *   category: "Next.js" | "React" | "CSS",
 *   summary: string,
 *   why: string,
 *   bad: RuleExample[],
 *   good: RuleExample[],
 *   options?: { description: string, schema: string },
 * }} RuleDoc
 */

export {};

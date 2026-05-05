import type { Rule } from "eslint";

import type { RuleDoc } from "./docs";
import exhaustiveTailwindClasses, {
	docs as exhaustiveTailwindClassesDocs,
} from "./exhaustive-tailwind-classes";
import exhaustiveTailwindThemeTokens, {
	docs as exhaustiveTailwindThemeTokensDocs,
} from "./exhaustive-tailwind-theme-tokens";
import noAwaitInLayout, {
	docs as noAwaitInLayoutDocs,
} from "./no-await-in-layout";
import noDisallowedGlobalClassSelectors, {
	docs as noDisallowedGlobalClassSelectorsDocs,
} from "./no-disallowed-global-class-selectors";
import noDocumentElementStylesInCss, {
	docs as noDocumentElementStylesInCssDocs,
} from "./no-document-element-styles-in-css";
import noInlineStyleProp, {
	docs as noInlineStylePropDocs,
} from "./no-inline-style-prop";

const rules = {
	"exhaustive-tailwind-classes": exhaustiveTailwindClasses,
	"exhaustive-tailwind-theme-tokens": exhaustiveTailwindThemeTokens,
	"no-disallowed-global-class-selectors": noDisallowedGlobalClassSelectors,
	"no-document-element-styles-in-css": noDocumentElementStylesInCss,
	"no-await-in-layout": noAwaitInLayout,
	"no-inline-style-prop": noInlineStyleProp,
} as const satisfies Record<string, Rule.RuleModule>;

const ruleDocs = {
	"exhaustive-tailwind-classes": exhaustiveTailwindClassesDocs,
	"exhaustive-tailwind-theme-tokens": exhaustiveTailwindThemeTokensDocs,
	"no-disallowed-global-class-selectors": noDisallowedGlobalClassSelectorsDocs,
	"no-document-element-styles-in-css": noDocumentElementStylesInCssDocs,
	"no-await-in-layout": noAwaitInLayoutDocs,
	"no-inline-style-prop": noInlineStylePropDocs,
} as const satisfies Record<keyof typeof rules, RuleDoc>;

type MissingRuleDocs = Exclude<keyof typeof rules, keyof typeof ruleDocs>;
type DocsWithoutRules = Exclude<keyof typeof ruleDocs, keyof typeof rules>;

const assertNoMissingRuleDocs: MissingRuleDocs extends never ? true : never =
	true;
const assertNoDocsWithoutRules: DocsWithoutRules extends never ? true : never =
	true;
void assertNoMissingRuleDocs;
void assertNoDocsWithoutRules;

export { ruleDocs, rules };

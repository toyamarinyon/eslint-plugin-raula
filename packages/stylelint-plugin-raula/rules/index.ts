import type { RuleDoc } from "./docs";
import exhaustiveTailwindThemeTokens, {
	docs as exhaustiveTailwindThemeTokensDocs,
} from "./exhaustive-tailwind-theme-tokens";
import noDisallowedGlobalClassSelectors, {
	docs as noDisallowedGlobalClassSelectorsDocs,
} from "./no-disallowed-global-class-selectors";
import noDocumentElementStylesInCss, {
	docs as noDocumentElementStylesInCssDocs,
} from "./no-document-element-styles-in-css";

const plugins = [
	exhaustiveTailwindThemeTokens,
	noDisallowedGlobalClassSelectors,
	noDocumentElementStylesInCss,
];

const ruleNames = {
	"exhaustive-tailwind-theme-tokens": true,
	"no-disallowed-global-class-selectors": true,
	"no-document-element-styles-in-css": true,
} as const;

const ruleDocs = {
	"exhaustive-tailwind-theme-tokens": exhaustiveTailwindThemeTokensDocs,
	"no-disallowed-global-class-selectors": noDisallowedGlobalClassSelectorsDocs,
	"no-document-element-styles-in-css": noDocumentElementStylesInCssDocs,
} as const satisfies Record<keyof typeof ruleNames, RuleDoc>;

type MissingRuleDocs = Exclude<keyof typeof ruleNames, keyof typeof ruleDocs>;
type DocsWithoutRules = Exclude<keyof typeof ruleDocs, keyof typeof ruleNames>;

const assertNoMissingRuleDocs: MissingRuleDocs extends never ? true : never =
	true;
const assertNoDocsWithoutRules: DocsWithoutRules extends never ? true : never =
	true;
void assertNoMissingRuleDocs;
void assertNoDocsWithoutRules;

export {
	exhaustiveTailwindThemeTokens,
	noDisallowedGlobalClassSelectors,
	noDocumentElementStylesInCss,
	plugins,
	ruleDocs,
};

import noCssModules, { docs as noCssModulesDocs } from "./no-css-modules.mjs";
import noInlineStyleProp, {
	docs as noInlineStylePropDocs,
} from "./no-inline-style-prop.mjs";

export const rules = {
	"no-css-modules": noCssModules,
	"no-inline-style-prop": noInlineStyleProp,
};

export const ruleDocs = {
	"no-css-modules": noCssModulesDocs,
	"no-inline-style-prop": noInlineStylePropDocs,
};

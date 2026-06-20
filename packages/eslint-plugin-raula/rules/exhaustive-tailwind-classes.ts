import { defineRule } from "../utils/define-rule";
import { getStaticClassTokens } from "../utils/get-static-class-tokens";
import { designSystem } from "../utils/tailwind-design-system";
import type { RuleDoc } from "./docs";

export const docs = {
	title: "Canonical Tailwind classes",
	category: "Tailwind",
	summary:
		"Require className tokens to use canonical Tailwind utilities and avoid arbitrary bracket usage.",
	why: "Keeping utility usage canonical prevents style drift and makes class names easier to reason about across contributors.",
	bad: [
		{
			label: "Non-canonical or arbitrary class",
			code: '<div className="m-0 md:m0 text-[16px]" />',
			language: "tsx",
		},
	],
	good: [
		{
			label: "Canonical utility",
			code: '<div className="m-0 md:m-0" />',
			language: "tsx",
		},
		{
			label: "Configure rule options in config",
			code: '{\n\trules: {\n\t\t"raula/exhaustive-tailwind-classes": [\n\t\t\t"error",\n\t\t\t{ rootFontSize: 16 },\n\t\t],\n\t},\n}',
			language: "ts",
		},
		{
			label:
				"Use [Base UI ScrollArea gradient scroll fades](https://base-ui.com/react/components/scroll-area#gradient-scroll-fade) with canonical mask utilities",
			code: '<div className="mask-linear-[to_bottom,transparent_0,black_min(40px,var(--scroll-area-overflow-y-start)),black_calc(100%_-_min(40px,var(--scroll-area-overflow-y-end,40px))),transparent_100%] mask-no-repeat" />',
			language: "tsx",
		},
	],
	options: {
		description: "Configure root pixel value for canonical `rem` conversion.",
		schema: "{\n\trootFontSize: 16\n}",
	},
} satisfies RuleDoc;

const allowedArbitraryValueUtilities = ["mask-linear"];

export default defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Require Tailwind className usage to stay within canonical utilities and configured theme tokens.",
		},
		schema: [
			{
				type: "object",
				properties: {
					rootFontSize: {
						type: "number",
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			useCanonicalClass:
				"The class '{{className}}' can be written as '{{canonicalClassName}}'. Use the canonical Tailwind class.",
			noArbitraryClass:
				"The class '{{className}}' is outside the Tailwind class policy. Add a theme token or use a canonical utility.",
		},
	},
	create(context) {
		const rootFontSize = context.options[0]?.rootFontSize ?? 16;

		return {
			JSXAttribute(node) {
				if (
					node.name?.type !== "JSXIdentifier" ||
					node.name.name !== "className"
				) {
					return;
				}

				for (const className of getStaticClassTokens(node)) {
					const canonicalClassName = designSystem?.canonicalizeCandidates?.(
						[className],
						{
							rem: rootFontSize,
						},
					)[0];

					if (canonicalClassName && canonicalClassName !== className) {
						context.report({
							node,
							messageId: "useCanonicalClass",
							data: {
								className,
								canonicalClassName,
							},
						});
						continue;
					}

					if (!className.includes("[") && !className.includes("]")) {
						continue;
					}

					const isAllowedArbitraryValueClass =
						allowedArbitraryValueUtilities.some((utility) =>
							className.startsWith(`${utility}-[`),
						);
					if (isAllowedArbitraryValueClass) {
						continue;
					}

					context.report({
						node,
						messageId: "noArbitraryClass",
						data: {
							className,
						},
					});
				}
			},
		};
	},
});

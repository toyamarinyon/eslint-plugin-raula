import type { Rule } from "eslint";

type ClassTokenSet = Set<string>;

type StringLiteralNode = {
	type: "Literal";
	value: string | null;
};

type TemplateLiteralNode = {
	type: "TemplateLiteral";
	quasis: Array<{ value: { cooked: string | null; raw: string } }>;
};

type ClassNameExpression =
	| StringLiteralNode
	| TemplateLiteralNode
	| { type: string };

type ClassNameNode = Rule.Node & {
	value?:
		| StringLiteralNode
		| {
				type: "JSXExpressionContainer";
				expression?: ClassNameExpression;
		  }
		| { type: string };
};

function addTokensFromString(value: string, tokens: ClassTokenSet) {
	for (const token of value.split(/\s+/)) {
		if (token) {
			tokens.add(token);
		}
	}
}

function getStaticClassTokens(node: ClassNameNode): ClassTokenSet {
	const tokens = new Set<string>();

	if (!node.value) {
		return tokens;
	}

	if (node.value.type === "Literal" && typeof node.value.value === "string") {
		addTokensFromString(node.value.value, tokens);
		return tokens;
	}

	if (node.value.type !== "JSXExpressionContainer" || !node.value.expression) {
		return tokens;
	}

	const expression = node.value.expression;

	if (expression.type === "Literal" && typeof expression.value === "string") {
		addTokensFromString(expression.value, tokens);
		return tokens;
	}

	if (expression.type !== "TemplateLiteral") {
		return tokens;
	}

	for (const quasi of expression.quasis) {
		addTokensFromString(quasi.value.cooked ?? quasi.value.raw, tokens);
	}

	return tokens;
}

export { getStaticClassTokens };

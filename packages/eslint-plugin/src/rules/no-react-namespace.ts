import type { Rule } from "eslint";

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow React namespace access (e.g. React.ReactElement)",
      recommended: true,
    },
    messages: {
      noReactNamespace:
        "Use named imports instead of React namespace (e.g. 'ReactElement' instead of 'React.ReactElement').",
    },
    schema: [],
  },
  create(context) {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      TSQualifiedName(node: any) {
        if (node.left?.name === "React") {
          context.report({ node, messageId: "noReactNamespace" });
        }
      },
    };
  },
};

export default rule;

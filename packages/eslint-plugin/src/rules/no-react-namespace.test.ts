import { RuleTester } from "eslint";
import rule from "./no-react-namespace";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
  },
});

ruleTester.run("no-react-namespace", rule, {
  valid: [
    { code: "const x: ReactElement = null;" },
    { code: 'import { FC } from "react";' },
    { code: "const fn: FC<{ id: string }> = () => null;" },
  ],
  invalid: [
    {
      code: "const x: React.ReactElement = null;",
      errors: [{ messageId: "noReactNamespace" }],
    },
    {
      code: "const fn: React.FC<{ id: string }> = () => null;",
      errors: [{ messageId: "noReactNamespace" }],
    },
    {
      code: "type Props = React.HTMLAttributes<HTMLDivElement>;",
      errors: [{ messageId: "noReactNamespace" }],
    },
  ],
});

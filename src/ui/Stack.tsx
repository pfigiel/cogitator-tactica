import { Stack as MantineStack, StackProps, ElementProps } from "@mantine/core";

type Props = StackProps & ElementProps<"div", keyof StackProps>;

export const Stack = (props: Props) => {
  return <MantineStack {...props} />;
};

import { Stack as MantineStack, StackProps, ElementProps } from "@mantine/core";

export const Stack = (props: StackProps & ElementProps<"div", keyof StackProps>) => {
  return <MantineStack {...props} />;
};

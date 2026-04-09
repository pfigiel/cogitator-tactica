import { Stack as MantineStack, StackProps, ElementProps } from "@mantine/core";

export function Stack(props: StackProps & ElementProps<"div", keyof StackProps>) {
  return <MantineStack {...props} />;
}

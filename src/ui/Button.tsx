import { Button as MantineButton, ButtonProps, ElementProps } from "@mantine/core";

export function Button(props: ButtonProps & ElementProps<"button", keyof ButtonProps>) {
  return <MantineButton {...props} />;
}

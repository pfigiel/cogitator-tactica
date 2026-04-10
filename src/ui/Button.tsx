import { Button as MantineButton, ButtonProps, ElementProps } from "@mantine/core";

export const Button = (props: ButtonProps & ElementProps<"button", keyof ButtonProps>) => {
  return <MantineButton {...props} />;
};

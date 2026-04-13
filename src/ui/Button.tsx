import { Button as MantineButton, ButtonProps, ElementProps } from "@mantine/core";

type Props = ButtonProps & ElementProps<"button", keyof ButtonProps>;

export const Button = (props: Props) => <MantineButton {...props} />;

import { Alert as MantineAlert, AlertProps, ElementProps } from "@mantine/core";

export function Alert(props: AlertProps & ElementProps<"div", keyof AlertProps>) {
  return <MantineAlert {...props} />;
}

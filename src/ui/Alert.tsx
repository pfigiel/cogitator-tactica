import { Alert as MantineAlert, AlertProps, ElementProps } from "@mantine/core";

export const Alert = (props: AlertProps & ElementProps<"div", keyof AlertProps>) => {
  return <MantineAlert {...props} />;
};

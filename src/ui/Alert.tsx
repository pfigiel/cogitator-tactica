import { Alert as MantineAlert, AlertProps, ElementProps } from "@mantine/core";

type Props = AlertProps & ElementProps<"div", keyof AlertProps>;

export const Alert = (props: Props) => {
  return <MantineAlert {...props} />;
};

import { Select as MantineSelect, SelectProps, ElementProps } from "@mantine/core";

export function Select(props: SelectProps & ElementProps<"input", keyof SelectProps>) {
  return <MantineSelect {...props} />;
}

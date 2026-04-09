import { Checkbox as MantineCheckbox, CheckboxProps, ElementProps } from "@mantine/core";

export function Checkbox(props: CheckboxProps & ElementProps<"input", keyof CheckboxProps>) {
  return <MantineCheckbox {...props} />;
}

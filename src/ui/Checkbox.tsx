import { Checkbox as MantineCheckbox, CheckboxProps, ElementProps } from "@mantine/core";

export const Checkbox = (props: CheckboxProps & ElementProps<"input", keyof CheckboxProps>) => {
  return <MantineCheckbox {...props} />;
};

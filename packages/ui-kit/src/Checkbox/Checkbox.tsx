import { Checkbox as MantineCheckbox, CheckboxProps, ElementProps } from "@mantine/core";

type Props = CheckboxProps & ElementProps<"input", keyof CheckboxProps>;

export const Checkbox = (props: Props) => <MantineCheckbox {...props} />;

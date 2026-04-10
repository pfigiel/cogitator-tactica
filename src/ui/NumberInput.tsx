import { NumberInput as MantineNumberInput, NumberInputProps, ElementProps } from "@mantine/core";

export const NumberInput = (props: NumberInputProps & ElementProps<"input", keyof NumberInputProps>) => {
  return <MantineNumberInput {...props} />;
};

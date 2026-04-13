import { NumberInput as MantineNumberInput, NumberInputProps, ElementProps } from "@mantine/core";

type Props = NumberInputProps & ElementProps<"input", keyof NumberInputProps>;

export const NumberInput = (props: Props) => {
  return <MantineNumberInput {...props} />;
};

import { TextInput as MantineTextInput, TextInputProps, ElementProps } from "@mantine/core";

type Props = TextInputProps & ElementProps<"input", keyof TextInputProps>;

export const TextInput = (props: Props) => {
  return <MantineTextInput {...props} />;
};

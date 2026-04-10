import { TextInput as MantineTextInput, TextInputProps, ElementProps } from "@mantine/core";

export const TextInput = (props: TextInputProps & ElementProps<"input", keyof TextInputProps>) => {
  return <MantineTextInput {...props} />;
};

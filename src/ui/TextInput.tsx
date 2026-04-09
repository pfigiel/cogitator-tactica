import { TextInput as MantineTextInput, TextInputProps, ElementProps } from "@mantine/core";

export function TextInput(props: TextInputProps & ElementProps<"input", keyof TextInputProps>) {
  return <MantineTextInput {...props} />;
}

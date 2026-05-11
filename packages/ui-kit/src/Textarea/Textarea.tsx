import {
  Textarea as MantineTextarea,
  TextareaProps,
  ElementProps,
} from "@mantine/core";

type Props = TextareaProps & ElementProps<"textarea", keyof TextareaProps>;

export const Textarea = (props: Props) => <MantineTextarea {...props} />;

import { Paper as MantinePaper, PaperProps, ElementProps } from "@mantine/core";

export const Paper = ({ p = "md", radius = "md", ...props }: PaperProps & ElementProps<"div", keyof PaperProps>) => {
  return <MantinePaper p={p} radius={radius} {...props} />;
};

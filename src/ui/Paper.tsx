import { Paper as MantinePaper, PaperProps } from "@mantine/core";

export function Paper({ p = "md", radius = "md", ...props }: PaperProps) {
  return <MantinePaper p={p} radius={radius} {...props} />;
}

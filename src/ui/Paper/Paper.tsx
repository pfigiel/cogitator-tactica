import { Paper as MantinePaper, PaperProps, ElementProps } from "@mantine/core";
import styles from "./Paper.module.css";

export const Paper = ({
  p = "md",
  radius = "md",
  ...props
}: PaperProps & ElementProps<"div", keyof PaperProps>) => {
  return (
    <MantinePaper className={styles.root} p={p} radius={radius} {...props} />
  );
};

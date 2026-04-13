import { Paper as MantinePaper, PaperProps, ElementProps } from "@mantine/core";
import styles from "./Paper.module.css";

type Props = PaperProps & ElementProps<"div", keyof PaperProps>;

export const Paper = ({
  p = "md",
  radius = "md",
  ...props
}: Props) => (
    <MantinePaper className={styles.root} p={p} radius={radius} {...props} />
  );

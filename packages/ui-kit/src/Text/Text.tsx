import { Text as MantineText } from "@mantine/core";
import clsx from "clsx";
import type { ComponentSize } from "../types";
import styles from "./Text.module.css";

type Props = {
  children: React.ReactNode;
  className?: string;
  size?: ComponentSize;
};

const sizeClass: Record<ComponentSize, string> = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

export const Text = ({ children, className, size }: Props) => (
  <MantineText
    component="span"
    className={clsx(size !== undefined && sizeClass[size], className)}
  >
    {children}
  </MantineText>
);

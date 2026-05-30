import { Title as MantineTitle } from "@mantine/core";
import clsx from "clsx";
import type { ComponentSize } from "../types";
import styles from "./Title.module.css";

type Order = 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  children: React.ReactNode;
  className?: string;
  order: Order;
  size?: ComponentSize;
};

const orderToSize: Record<Order, ComponentSize> = {
  1: "xl",
  2: "lg",
  3: "md",
  4: "sm",
  5: "xs",
  6: "xs",
};

const sizeClass: Record<ComponentSize, string> = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

export const Title = ({ children, className, order, size }: Props) => {
  const resolvedSize = size ?? orderToSize[order];
  return (
    <MantineTitle
      order={order}
      className={clsx(sizeClass[resolvedSize], className)}
    >
      {children}
    </MantineTitle>
  );
};

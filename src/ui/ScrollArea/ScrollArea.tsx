import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ScrollArea as MantineScrollArea,
  ScrollAreaProps,
  ScrollAreaAutosizeProps,
} from "@mantine/core";
import clsx from "clsx";
import { shouldShowGradient } from "./gradientVisibility";
import styles from "./ScrollArea.module.css";

type ScrollAreaClassNames = NonNullable<ScrollAreaProps["classNames"]> & {
  gradient?: string;
};

type AutosizeClassNames = NonNullable<ScrollAreaAutosizeProps["classNames"]> & {
  gradient?: string;
};

type Props = Omit<ScrollAreaProps, "classNames"> & {
  classNames?: ScrollAreaClassNames;
  withFadeGradient?: boolean;
};

type AutosizeProps = Omit<ScrollAreaAutosizeProps, "classNames"> & {
  classNames?: AutosizeClassNames;
  withFadeGradient?: boolean;
};

const useGradient = (enabled: boolean) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  const check = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setShow(shouldShowGradient(el.scrollHeight, el.clientHeight, el.scrollTop));
  }, []);

  useLayoutEffect(() => {
    if (!enabled) return;
    check();
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [enabled, check]);

  return { viewportRef, show, check };
};

export const ScrollArea = ({
  withFadeGradient,
  classNames,
  onScrollPositionChange,
  ...props
}: Props) => {
  const { viewportRef, show, check } = useGradient(!!withFadeGradient);
  const { gradient: gradientClass, ...mantineClassNames } = (classNames ??
    {}) as ScrollAreaClassNames;

  const handleScroll = useCallback(
    (pos: { x: number; y: number }) => {
      check();
      onScrollPositionChange?.(pos);
    },
    [check, onScrollPositionChange],
  );

  if (!withFadeGradient) {
    return (
      <MantineScrollArea
        onScrollPositionChange={onScrollPositionChange}
        classNames={classNames as ScrollAreaProps["classNames"]}
        {...props}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <MantineScrollArea
        viewportRef={viewportRef}
        onScrollPositionChange={handleScroll}
        classNames={mantineClassNames as ScrollAreaProps["classNames"]}
        {...props}
      />
      {show && (
        <div
          aria-hidden="true"
          className={clsx(styles.gradient, gradientClass)}
        />
      )}
    </div>
  );
};

export const ScrollAreaAutosize = ({
  withFadeGradient,
  classNames,
  onScrollPositionChange,
  ...props
}: AutosizeProps) => {
  const { viewportRef, show, check } = useGradient(!!withFadeGradient);
  const { gradient: gradientClass, ...mantineClassNames } = (classNames ??
    {}) as AutosizeClassNames;

  const handleScroll = useCallback(
    (pos: { x: number; y: number }) => {
      check();
      onScrollPositionChange?.(pos);
    },
    [check, onScrollPositionChange],
  );

  if (!withFadeGradient) {
    return (
      <MantineScrollArea.Autosize
        onScrollPositionChange={onScrollPositionChange}
        classNames={classNames as ScrollAreaAutosizeProps["classNames"]}
        {...props}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <MantineScrollArea.Autosize
        viewportRef={viewportRef}
        onScrollPositionChange={handleScroll}
        classNames={mantineClassNames as ScrollAreaAutosizeProps["classNames"]}
        {...props}
      />
      {show && (
        <div
          aria-hidden="true"
          className={clsx(styles.gradient, gradientClass)}
        />
      )}
    </div>
  );
};

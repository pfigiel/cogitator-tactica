"use client";

import {
  MantineProvider,
  type MantineProviderProps,
  type CSSVariablesResolver,
} from "@mantine/core";
import { theme } from "./theme";

const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--font-size-text-xs": "0.75rem",
    "--font-size-text-sm": "0.875rem",
    "--font-size-text-md": "1rem",
    "--font-size-text-lg": "1.125rem",
    "--font-size-text-xl": "1.25rem",
    "--line-height-text-xs": "1.4",
    "--line-height-text-sm": "1.45",
    "--line-height-text-md": "1.5",
    "--line-height-text-lg": "1.55",
    "--line-height-text-xl": "1.5",
    "--letter-spacing-text-xs": "0",
    "--letter-spacing-text-sm": "0",
    "--letter-spacing-text-md": "0",
    "--letter-spacing-text-lg": "0",
    "--letter-spacing-text-xl": "0",
    "--font-size-title-xs": "1rem",
    "--font-size-title-sm": "1.25rem",
    "--font-size-title-md": "1.5rem",
    "--font-size-title-lg": "2rem",
    "--font-size-title-xl": "2.5rem",
    "--line-height-title-xs": "1.3",
    "--line-height-title-sm": "1.3",
    "--line-height-title-md": "1.25",
    "--line-height-title-lg": "1.2",
    "--line-height-title-xl": "1.15",
    "--letter-spacing-title-xs": "-0.01em",
    "--letter-spacing-title-sm": "-0.01em",
    "--letter-spacing-title-md": "-0.02em",
    "--letter-spacing-title-lg": "-0.02em",
    "--letter-spacing-title-xl": "-0.03em",
  },
  light: {},
  dark: {},
});

type Props = Omit<MantineProviderProps, "theme">;

export const UIProvider = (props: Props) => (
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    {...props}
  />
);

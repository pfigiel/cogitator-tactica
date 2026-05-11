"use client";

import { MantineProvider, type MantineProviderProps } from "@mantine/core";
import { theme } from "./theme";

type Props = Omit<MantineProviderProps, "theme">;

export const UIProvider = (props: Props) => (
  <MantineProvider theme={theme} {...props} />
);

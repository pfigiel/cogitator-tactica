import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@/ui/variables.css";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { theme } from "@/ui/theme";
import styles from "./layout.module.css";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cogitator Tactica",
  description: "Warhammer 40,000 statistics battle calculator",
};

type Props = {
  children: ReactNode;
};

const RootLayout = ({ children }: Props) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <ColorSchemeScript defaultColorScheme="dark" />
    </head>
    <body className={styles.body}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <header className={styles.header}>
          <span className={styles.appName}>Cogitator Tactica</span>
          {" · "}
          <span className={styles.appDesc}>
            Statistics Calculator — Warhammer 40,000 10th Edition
          </span>
        </header>
        {children}
      </MantineProvider>
    </body>
  </html>
);

export default RootLayout;

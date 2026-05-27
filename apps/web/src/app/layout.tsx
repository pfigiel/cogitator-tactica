import type { Metadata } from "next";
import "@cogitator-tactica/ui-kit/styles.css";
import { ColorSchemeScript, UIProvider } from "@cogitator-tactica/ui-kit";
import styles from "./layout.module.css";
import { ReactNode } from "react";
import { QueryClientProvider } from "@/features/common/providers/QueryClientProvider";

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
      <QueryClientProvider>
        <UIProvider defaultColorScheme="dark">
          <header className={styles.header}>
            <span className={styles.appName}>Cogitator Tactica</span>
            {" · "}
            <span className={styles.appDesc}>
              Statistics Calculator — Warhammer 40,000 10th Edition
            </span>
          </header>
          {children}
        </UIProvider>
      </QueryClientProvider>
    </body>
  </html>
);

export default RootLayout;

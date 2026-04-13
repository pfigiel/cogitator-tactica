import type { Metadata } from "next";
import "@mantine/core/styles.css";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { theme } from "@/ui/theme";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "WH40K Battle Calculator",
  description: "Warhammer 40,000 statistics battle calculator",
};

type Props = {
  children: React.ReactNode;
};

const RootLayout = ({ children }: Props) => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className={styles.body}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
      </body>
    </html>
  );

export default RootLayout;

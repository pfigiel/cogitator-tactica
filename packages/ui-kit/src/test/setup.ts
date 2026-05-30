import { vi } from "vitest";
import React from "react";

vi.mock("@mantine/core", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    Text: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
      component?: string;
    }) => React.createElement("span", { className }, children),
    Title: ({
      children,
      className,
      order,
    }: {
      children: React.ReactNode;
      className?: string;
      order?: number;
    }) => {
      const tag = `h${order ?? 1}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return React.createElement(tag, { className }, children);
    },
  };
});

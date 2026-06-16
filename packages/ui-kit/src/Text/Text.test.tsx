import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Text } from "./Text";

describe("Text", () => {
  it("should render a span when given children", () => {
    const { container } = render(<Text>Hello</Text>);
    expect(container.querySelector("span")).not.toBeNull();
  });

  it("should render children content", () => {
    const { getByText } = render(<Text>Hello world</Text>);
    expect(getByText("Hello world")).toBeTruthy();
  });

  it("should apply size class when size prop is provided", () => {
    const { container } = render(<Text size="lg">Hello</Text>);
    const span = container.querySelector("span");
    expect(span?.className).toContain("lg");
  });

  it("should not apply size class when size prop is omitted", () => {
    const { container } = render(<Text>Hello</Text>);
    const span = container.querySelector("span");
    expect(span?.className ?? "").not.toMatch(/\b(xs|sm|md|lg|xl)\b/);
  });

  it("should forward className prop", () => {
    const { container } = render(<Text className="custom">Hello</Text>);
    expect(container.querySelector("span")?.className).toContain("custom");
  });
});

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Title } from "./Title";

describe("Title", () => {
  it("should render h1 when order is 1", () => {
    const { container } = render(<Title order={1}>Heading</Title>);
    expect(container.querySelector("h1")).not.toBeNull();
  });

  it("should render h3 when order is 3", () => {
    const { container } = render(<Title order={3}>Heading</Title>);
    expect(container.querySelector("h3")).not.toBeNull();
  });

  it("should apply xl size class when order is 1 and no size prop", () => {
    const { container } = render(<Title order={1}>Heading</Title>);
    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("xl");
  });

  it("should apply lg size class when order is 2 and no size prop", () => {
    const { container } = render(<Title order={2}>Heading</Title>);
    const h2 = container.querySelector("h2");
    expect(h2?.className).toContain("lg");
  });

  it("should apply md size class when order is 3 and no size prop", () => {
    const { container } = render(<Title order={3}>Heading</Title>);
    expect(container.querySelector("h3")?.className).toContain("md");
  });

  it("should apply sm size class when order is 4 and no size prop", () => {
    const { container } = render(<Title order={4}>Heading</Title>);
    expect(container.querySelector("h4")?.className).toContain("sm");
  });

  it("should apply xs size class when order is 5 and no size prop", () => {
    const { container } = render(<Title order={5}>Heading</Title>);
    expect(container.querySelector("h5")?.className).toContain("xs");
  });

  it("should apply xs size class when order is 6 and no size prop", () => {
    const { container } = render(<Title order={6}>Heading</Title>);
    expect(container.querySelector("h6")?.className).toContain("xs");
  });

  it("should override size class with size prop when provided", () => {
    const { container } = render(
      <Title order={1} size="xs">
        Heading
      </Title>,
    );
    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("xs");
    expect(h1?.className).not.toMatch(/\bxl\b/);
  });

  it("should forward className prop", () => {
    const { container } = render(
      <Title order={2} className="custom">
        Heading
      </Title>,
    );
    expect(container.querySelector("h2")?.className).toContain("custom");
  });

  it("should render children content", () => {
    const { getByText } = render(<Title order={1}>Page title</Title>);
    expect(getByText("Page title")).toBeTruthy();
  });
});

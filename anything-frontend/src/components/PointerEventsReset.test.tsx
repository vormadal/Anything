import { render } from "@testing-library/react";
import { PointerEventsReset } from "./PointerEventsReset";

let mockPathname = "/recipes/1";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("PointerEventsReset", () => {
  beforeEach(() => {
    mockPathname = "/recipes/1";
    document.body.style.pointerEvents = "";
  });

  it("renders nothing", () => {
    const { container } = render(<PointerEventsReset />);
    expect(container).toBeEmptyDOMElement();
  });

  it("clears a stuck pointer-events:none on body when the route changes", () => {
    const { rerender } = render(<PointerEventsReset />);

    // Simulate Radix leaving the body frozen, then a navigation occurring.
    document.body.style.pointerEvents = "none";
    mockPathname = "/recipes";
    rerender(<PointerEventsReset />);

    expect(document.body.style.pointerEvents).toBe("");
  });

  it("does not modify body styles that are already clear", () => {
    document.body.style.pointerEvents = "auto";
    mockPathname = "/recipes";

    render(<PointerEventsReset />);

    expect(document.body.style.pointerEvents).toBe("auto");
  });
});

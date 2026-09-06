import { render } from "@testing-library/react";
import { useFlipAnimation } from "./useFlipAnimation";

function TestList({ ids }: { ids: number[] }) {
  const ref = useFlipAnimation<HTMLUListElement>();
  return (
    <ul ref={ref}>
      {ids.map((id) => (
        <li key={id} data-flip-id={String(id)}>
          {id}
        </li>
      ))}
    </ul>
  );
}

describe("useFlipAnimation", () => {
  let originalGetBoundingClientRect: () => DOMRect;

  // jsdom does no real layout, so stand in a rect based on DOM position —
  // each row is a stacked 40px slot, which is all FLIP needs to see a delta.
  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const siblings = Array.from(this.parentElement?.children ?? []);
      const top = siblings.indexOf(this) * 40;
      return { top, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    };
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it("animates only the rows whose position actually changed", () => {
    const { container, rerender } = render(<TestList ids={[1, 2, 3]} />);

    for (const li of Array.from(container.querySelectorAll("li"))) {
      (li as unknown as { animate: jest.Mock }).animate = jest.fn();
    }

    rerender(<TestList ids={[2, 1, 3]} />);

    const byId = (id: number) =>
      container.querySelector(`[data-flip-id="${id}"]`) as unknown as { animate: jest.Mock };

    expect(byId(1).animate).toHaveBeenCalledWith(
      [{ transform: "translateY(-40px)" }, { transform: "translateY(0)" }],
      { duration: 250, easing: "ease" }
    );
    expect(byId(2).animate).toHaveBeenCalledWith(
      [{ transform: "translateY(40px)" }, { transform: "translateY(0)" }],
      { duration: 250, easing: "ease" }
    );
    expect(byId(3).animate).not.toHaveBeenCalled();
  });

  it("does not throw when Element.animate is unavailable (e.g. jsdom)", () => {
    const { rerender } = render(<TestList ids={[1, 2]} />);
    expect(() => rerender(<TestList ids={[2, 1]} />)).not.toThrow();
  });

  it("ignores children without a data-flip-id", () => {
    function ListWithHeader({ ids }: { ids: number[] }) {
      const ref = useFlipAnimation<HTMLUListElement>();
      return (
        <ul ref={ref}>
          <li>Header</li>
          {ids.map((id) => (
            <li key={id} data-flip-id={String(id)}>
              {id}
            </li>
          ))}
        </ul>
      );
    }

    expect(() => render(<ListWithHeader ids={[1, 2]} />)).not.toThrow();
  });
});

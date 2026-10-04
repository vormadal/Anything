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
  // Like a real browser's, the rect includes a `matrix(...)` transform, which
  // the tests set inline to stand in for a slide that is still running.
  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const siblings = Array.from(this.parentElement?.children ?? []);
      const translateY = Number(/^matrix\((.+)\)$/.exec(this.style.transform)?.[1].split(",")[5] ?? 0);
      const top = siblings.indexOf(this) * 40 + translateY;
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

  describe("a commit while a slide is still running", () => {
    function stubAnimate(li: Element) {
      const animation = { playState: "running", cancel: jest.fn() };
      const animate = jest.fn(() => animation);
      (li as unknown as { animate: jest.Mock }).animate = animate;
      return { animate, animation };
    }

    it("leaves the animation alone when the layout did not change", () => {
      const { container, rerender } = render(<TestList ids={[1, 2, 3]} />);
      const stubs = Array.from(container.querySelectorAll("li")).map(stubAnimate);

      rerender(<TestList ids={[2, 1, 3]} />);
      const row1 = container.querySelector('[data-flip-id="1"]') as HTMLElement;
      // Halfway through its slide: rendered 20px above its resting slot.
      row1.style.transform = "matrix(1, 0, 0, 1, 0, -20)";
      stubs.forEach(({ animate }) => animate.mockClear());

      // e.g. the mutation going pending — same order, new commit.
      rerender(<TestList ids={[2, 1, 3]} />);

      stubs.forEach(({ animate }) => expect(animate).not.toHaveBeenCalled());
    });

    it("starts a new slide from where the row currently appears", () => {
      const { container, rerender } = render(<TestList ids={[1, 2, 3]} />);
      const stubs = Array.from(container.querySelectorAll("li")).map(stubAnimate);

      rerender(<TestList ids={[2, 1, 3]} />);
      const row1 = container.querySelector('[data-flip-id="1"]') as HTMLElement;
      row1.style.transform = "matrix(1, 0, 0, 1, 0, -20)";
      stubs[0].animate.mockClear();

      // Row 1 rests at 40 but appears at 20; it now moves to 80.
      rerender(<TestList ids={[2, 3, 1]} />);

      expect(stubs[0].animation.cancel).toHaveBeenCalled();
      expect(stubs[0].animate).toHaveBeenCalledWith(
        [{ transform: "translateY(-60px)" }, { transform: "translateY(0)" }],
        { duration: 250, easing: "ease" }
      );
    });
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

import { render, screen } from "@testing-library/react";
import { OfflineBanner } from "@/components/OfflineBanner";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("OfflineBanner", () => {
  afterEach(() => {
    setOnline(true);
  });

  it("renders nothing while online", () => {
    setOnline(true);
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a message while offline", () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });
});

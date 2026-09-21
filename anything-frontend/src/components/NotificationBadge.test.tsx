import { render, screen } from "@testing-library/react";
import { NotificationBadge, formatUnreadCount } from "@/components/NotificationBadge";

describe("NotificationBadge", () => {
  it("renders nothing when there is nothing unread", () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a negative count", () => {
    const { container } = render(<NotificationBadge count={-1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count", () => {
    render(<NotificationBadge count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("is hidden from assistive tech — the count belongs to the host control's name", () => {
    render(<NotificationBadge count={3} />);
    expect(screen.getByText("3")).toHaveAttribute("aria-hidden", "true");
  });

  it("abbreviates a count that would stretch its host", () => {
    expect(formatUnreadCount(99)).toBe("99");
    expect(formatUnreadCount(100)).toBe("99+");
    expect(formatUnreadCount(250)).toBe("99+");
  });
});

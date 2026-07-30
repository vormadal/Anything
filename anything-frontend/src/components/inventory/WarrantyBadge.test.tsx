import { render, screen } from "@testing-library/react";
import { WarrantyBadge } from "./WarrantyBadge";

describe("WarrantyBadge", () => {
  it("shows an expired label for a past date", () => {
    render(<WarrantyBadge warrantyExpiresOn={new Date("2000-01-01")} />);
    expect(screen.getByText("Warranty expired")).toBeInTheDocument();
  });

  it("shows a countdown for a future date", () => {
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 400);
    render(<WarrantyBadge warrantyExpiresOn={soon} />);
    expect(screen.getByText(/Warranty expires in \d+ year/)).toBeInTheDocument();
  });
});

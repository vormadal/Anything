import { render, screen } from "@testing-library/react";
import { Box } from "lucide-react";
import { InventoryList, InventoryRow } from "./InventoryRow";

describe("InventoryRow", () => {
  it("shows the entity's first photo in the leading slot", () => {
    render(
      <InventoryList>
        <InventoryRow
          href="/inventory/boxes/1"
          title="Box 1"
          thumbnailUrl="https://example.com/thumb.jpg"
          icon={<Box data-testid="fallback-icon" className="h-4 w-4" />}
        />
      </InventoryList>
    );

    // Decorative: the row's own title already names the entity.
    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute(
      "src",
      "https://example.com/thumb.jpg"
    );
    expect(screen.queryByTestId("fallback-icon")).not.toBeInTheDocument();
  });

  it("falls back to the icon when there is no photo", () => {
    render(
      <InventoryList>
        <InventoryRow
          href="/inventory/boxes/1"
          title="Box 1"
          icon={<Box data-testid="fallback-icon" className="h-4 w-4" />}
        />
      </InventoryList>
    );

    expect(screen.getByTestId("fallback-icon")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

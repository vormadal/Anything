import { render, screen } from "@testing-library/react";
import { HouseholdProvider, useHouseholdContext } from "./HouseholdContext";
import { useHouseholds } from "@/hooks/useHouseholds";

jest.mock("@/lib/apiClient", () => ({
  HOUSEHOLD_ID_KEY: "householdId",
}));

jest.mock("@/hooks/useHouseholds", () => ({
  useHouseholds: jest.fn(),
}));

const mockUseHouseholds = useHouseholds as jest.Mock;
const sharedHousehold = { id: 1, name: "Shared", role: "Manager" };

function SelectedId() {
  const { selectedHouseholdId } = useHouseholdContext();
  return <span data-testid="selected">{String(selectedHouseholdId)}</span>;
}

function renderProvider() {
  return render(
    <HouseholdProvider>
      <SelectedId />
    </HouseholdProvider>
  );
}

describe("HouseholdProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseHouseholds.mockReset();
  });

  it("keeps a stored household missing from a list that is still refetching", () => {
    // A household created just before a reload isn't in the restored cache yet.
    localStorage.setItem("householdId", "5");
    mockUseHouseholds.mockReturnValue({
      data: [sharedHousehold],
      isLoading: false,
      isFetching: true,
    });

    renderProvider();

    expect(screen.getByTestId("selected")).toHaveTextContent("5");
    expect(localStorage.getItem("householdId")).toBe("5");
  });

  it("falls back to the first household once the fresh list lacks the stored one", () => {
    localStorage.setItem("householdId", "5");
    mockUseHouseholds.mockReturnValue({
      data: [sharedHousehold],
      isLoading: false,
      isFetching: false,
    });

    renderProvider();

    expect(screen.getByTestId("selected")).toHaveTextContent("1");
    expect(localStorage.getItem("householdId")).toBe("1");
  });
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { CustomFieldsEditor } from "./CustomFieldsEditor";

const mockFieldsPut = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      inventoryItems: {
        byId: () => ({ fields: { put: (...args: unknown[]) => mockFieldsPut(...args) } }),
      },
    },
  },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/inventory/items/100",
  useParams: () => ({ id: "100" }),
}));

describe("CustomFieldsEditor", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows a placeholder when there are no fields yet", () => {
    renderWithClient(<CustomFieldsEditor itemId={100} fields={[]} />);
    expect(screen.getByText("No custom fields yet.")).toBeInTheDocument();
  });

  it("pre-fills existing fields", () => {
    renderWithClient(
      <CustomFieldsEditor
        itemId={100}
        fields={[{ id: 1, label: "Color", value: "Blue", sortOrder: 0 }]}
      />
    );
    expect(screen.getByDisplayValue("Color")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Blue")).toBeInTheDocument();
  });

  it("adds a row, fills it in, and saves the trimmed list", async () => {
    const user = userEvent.setup();
    mockFieldsPut.mockResolvedValue([]);

    renderWithClient(<CustomFieldsEditor itemId={100} fields={[]} />);

    await user.click(screen.getByRole("button", { name: /Add field/ }));
    await user.type(screen.getByLabelText("Field label"), "  Warranty  ");
    await user.type(screen.getByLabelText("Field value"), "  2 years  ");
    await user.click(screen.getByRole("button", { name: /Save fields/ }));

    await waitFor(() =>
      expect(mockFieldsPut).toHaveBeenCalledWith({
        fields: [{ label: "Warranty", value: "2 years" }],
      })
    );
  });

  it("drops a row that's still blank when saving", async () => {
    const user = userEvent.setup();
    mockFieldsPut.mockResolvedValue([]);

    renderWithClient(<CustomFieldsEditor itemId={100} fields={[]} />);

    await user.click(screen.getByRole("button", { name: /Add field/ }));
    await user.click(screen.getByRole("button", { name: /Save fields/ }));

    await waitFor(() => expect(mockFieldsPut).toHaveBeenCalledWith({ fields: [] }));
  });

  it("removes a row", async () => {
    const user = userEvent.setup();

    renderWithClient(
      <CustomFieldsEditor
        itemId={100}
        fields={[{ id: 1, label: "Color", value: "Blue", sortOrder: 0 }]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Remove field" }));

    expect(screen.queryByDisplayValue("Color")).not.toBeInTheDocument();
    expect(screen.getByText("No custom fields yet.")).toBeInTheDocument();
  });

  it("shows an error toast when saving fails", async () => {
    const user = userEvent.setup();
    const { toast } = jest.requireMock("sonner");
    mockFieldsPut.mockRejectedValue(new Error("boom"));

    renderWithClient(
      <CustomFieldsEditor
        itemId={100}
        fields={[{ id: 1, label: "Color", value: "Blue", sortOrder: 0 }]}
      />
    );

    await user.click(screen.getByRole("button", { name: /Save fields/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save custom fields"));
  });
});

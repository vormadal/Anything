import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import NotificationSettingsPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notifications/settings",
}));

const mockPreferencesGet = jest.fn();
const mockPreferencesPut = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notifications: {
        preferences: {
          get: () => mockPreferencesGet(),
          put: (...args: unknown[]) => mockPreferencesPut(...args),
        },
      },
    },
  },
}));

describe("NotificationSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreferencesPut.mockResolvedValue(undefined);
  });

  it("renders a labelled toggle per category", async () => {
    mockPreferencesGet.mockResolvedValue([
      { category: "announcement", inAppEnabled: true },
      { category: "householdmember", inAppEnabled: false },
    ]);

    renderWithClient(<NotificationSettingsPage />);

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Announcements" })).toBeChecked()
    );
    expect(screen.getByRole("switch", { name: "Household members" })).not.toBeChecked();
  });

  it("sends only the toggled category, because the update is partial", async () => {
    const user = userEvent.setup();
    mockPreferencesGet.mockResolvedValue([
      { category: "announcement", inAppEnabled: true },
      { category: "householdmember", inAppEnabled: true },
    ]);

    renderWithClient(<NotificationSettingsPage />);

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Announcements" })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("switch", { name: "Announcements" }));

    await waitFor(() =>
      expect(mockPreferencesPut).toHaveBeenCalledWith({
        preferences: [{ category: "announcement", inAppEnabled: false }],
      })
    );
  });

  it("falls back to the raw key for a category the client doesn't know yet", async () => {
    mockPreferencesGet.mockResolvedValue([{ category: "billdue", inAppEnabled: true }]);

    renderWithClient(<NotificationSettingsPage />);

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "billdue" })).toBeInTheDocument()
    );
  });

  it("shows an error state when the request fails", async () => {
    mockPreferencesGet.mockRejectedValue(new Error("boom"));

    renderWithClient(<NotificationSettingsPage />);

    await waitFor(() =>
      expect(screen.getByText(/Failed to load notification settings/)).toBeInTheDocument()
    );
  });
});

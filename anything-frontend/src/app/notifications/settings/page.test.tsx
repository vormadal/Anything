import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import NotificationSettingsPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notifications/settings",
}));

let mockPushStatus: string = "unsupported";
const mockEnable = jest.fn();
const mockDisable = jest.fn();
jest.mock("@/hooks/usePushSubscription", () => ({
  usePushSubscription: () => ({
    status: mockPushStatus,
    isBusy: false,
    enable: mockEnable,
    disable: mockDisable,
  }),
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
    mockPushStatus = "unsupported";
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

  it("hides the per-category push switch until this device is subscribed", async () => {
    mockPushStatus = "off";
    mockPreferencesGet.mockResolvedValue([
      { category: "announcement", inAppEnabled: true, pushEnabled: true },
    ]);

    renderWithClient(<NotificationSettingsPage />);

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Announcements" })).toBeInTheDocument()
    );
    // A push switch would be a setting for something that cannot happen.
    expect(
      screen.queryByRole("switch", { name: /Also notify this device/ })
    ).not.toBeInTheDocument();
  });

  it("offers the per-category push switch once subscribed", async () => {
    mockPushStatus = "on";
    mockPreferencesGet.mockResolvedValue([
      { category: "announcement", inAppEnabled: true, pushEnabled: false },
    ]);

    renderWithClient(<NotificationSettingsPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Also notify this device about Announcements" })
      ).not.toBeChecked()
    );
  });

  it("sends only the push switch when the push toggle is flipped", async () => {
    const user = userEvent.setup();
    mockPushStatus = "on";
    mockPreferencesGet.mockResolvedValue([
      { category: "announcement", inAppEnabled: true, pushEnabled: true },
    ]);

    renderWithClient(<NotificationSettingsPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Also notify this device about Announcements" })
      ).toBeInTheDocument()
    );
    await user.click(
      screen.getByRole("switch", { name: "Also notify this device about Announcements" })
    );

    // No inAppEnabled in the payload — omitting it is what stops one toggle
    // resetting the other.
    await waitFor(() =>
      expect(mockPreferencesPut).toHaveBeenCalledWith({
        preferences: [{ category: "announcement", pushEnabled: false }],
      })
    );
  });

  it("disables the push switch while the category itself is off", async () => {
    // Push narrows in-app: with no notification there is nothing to push.
    mockPushStatus = "on";
    mockPreferencesGet.mockResolvedValue([
      { category: "announcement", inAppEnabled: false, pushEnabled: true },
    ]);

    renderWithClient(<NotificationSettingsPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Also notify this device about Announcements" })
      ).toBeDisabled()
    );
    expect(
      screen.getByRole("switch", { name: "Also notify this device about Announcements" })
    ).not.toBeChecked();
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

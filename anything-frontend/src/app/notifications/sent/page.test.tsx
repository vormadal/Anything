import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import SentNotificationsPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/notifications/sent",
}));

const mockSentGet = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notifications: {
        sent: { get: (...args: unknown[]) => mockSentGet(...args) },
      },
    },
  },
}));

const binDay = {
  category: "announcement",
  title: "Bin day moved",
  body: "Thursday this week.",
  sentOn: new Date("2026-09-15T09:00:00Z"),
  recipients: 4,
  readCount: 2,
};

const soloSend = {
  category: "announcement",
  title: "Heating is back on",
  body: null,
  sentOn: new Date("2026-09-14T09:00:00Z"),
  recipients: 1,
  readCount: 0,
};

describe("SentNotificationsPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists each send with its reach", async () => {
    mockSentGet.mockResolvedValue([binDay, soloSend]);

    renderWithClient(<SentNotificationsPage />);

    await waitFor(() => expect(screen.getByText("Bin day moved")).toBeInTheDocument());
    expect(screen.getByText("Thursday this week.")).toBeInTheDocument();
    expect(screen.getByText(/4 recipients · 2 read/)).toBeInTheDocument();
  });

  it("does not pluralise a send that reached one person", async () => {
    mockSentGet.mockResolvedValue([soloSend]);

    renderWithClient(<SentNotificationsPage />);

    await waitFor(() =>
      expect(screen.getByText(/1 recipient · 0 read/)).toBeInTheDocument()
    );
  });

  it("shows an empty state when nothing has been sent", async () => {
    mockSentGet.mockResolvedValue([]);

    renderWithClient(<SentNotificationsPage />);

    await waitFor(() =>
      expect(screen.getByText(/haven't sent any announcements yet/i)).toBeInTheDocument()
    );
  });

  // A failed load must never read as "you've never sent anything" — see the
  // loadFailure rule in the components agent.md.
  it("shows the load error instead of the empty state when the request fails", async () => {
    mockSentGet.mockRejectedValue(new Error("boom"));

    renderWithClient(<SentNotificationsPage />);

    await waitFor(() =>
      expect(screen.getByText(/Couldn't load your sent announcements/i)).toBeInTheDocument()
    );
    expect(
      screen.queryByText(/haven't sent any announcements yet/i)
    ).not.toBeInTheDocument();
  });

  it("retries the failed load", async () => {
    const user = userEvent.setup();
    mockSentGet.mockRejectedValueOnce(new Error("boom")).mockResolvedValue([binDay]);

    renderWithClient(<SentNotificationsPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(screen.getByText("Bin day moved")).toBeInTheDocument());
  });
});

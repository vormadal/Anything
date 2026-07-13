import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { ShareRecipeDialog } from "./ShareRecipeDialog";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/recipes/1",
}));

const mockShares: {
  id: number;
  token: string;
  shareUrl: string;
  targetEmail: string | null;
  expiresAt: string | null;
  createdOn: string;
  isExpired: boolean;
  isClaimed: boolean;
}[] = [];

const mockCreateShareMutateAsync = jest.fn();
const mockRevokeShareMutateAsync = jest.fn();

jest.mock("@/hooks/useRecipeShares", () => ({
  useRecipeShares: () => ({ data: mockShares }),
  useCreateRecipeShare: () => ({ mutateAsync: mockCreateShareMutateAsync, isPending: false }),
  useRevokeRecipeShare: () => ({ mutateAsync: mockRevokeShareMutateAsync, isPending: false }),
}));

Object.defineProperty(navigator, "clipboard", {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("ShareRecipeDialog", () => {
  const onOpenChange = jest.fn();

  beforeEach(() => {
    mockShares.length = 0;
  });

  afterEach(() => {
    setOnline(true);
    jest.clearAllMocks();
  });

  it("renders the public and user-share tabs when open", () => {
    renderWithClient(<ShareRecipeDialog recipeId={1} open onOpenChange={onOpenChange} />);
    expect(screen.getByText("Share recipe")).toBeInTheDocument();
    expect(screen.getByText("Public link")).toBeInTheDocument();
    expect(screen.getByText("Share with user")).toBeInTheDocument();
  });

  it("generates a public share link", async () => {
    const user = userEvent.setup();
    mockCreateShareMutateAsync.mockResolvedValueOnce({ shareUrl: "/shared/recipe/abc123" });
    renderWithClient(<ShareRecipeDialog recipeId={1} open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Generate link" }));

    await waitFor(() => {
      expect(mockCreateShareMutateAsync).toHaveBeenCalledWith({
        expiry: "OneWeek",
        targetEmail: null,
      });
    });
    expect(screen.getByLabelText("Generated share link")).toHaveValue(
      "http://localhost/shared/recipe/abc123"
    );
  });

  it("generates a user-targeted share link", async () => {
    const user = userEvent.setup();
    mockCreateShareMutateAsync.mockResolvedValueOnce({ shareUrl: "/shared/recipe/xyz789" });
    renderWithClient(<ShareRecipeDialog recipeId={1} open onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("Share with user"));
    await user.type(screen.getByLabelText("Recipient email address"), "friend@example.com");
    await user.click(screen.getByRole("button", { name: "Generate link" }));

    await waitFor(() => {
      expect(mockCreateShareMutateAsync).toHaveBeenCalledWith({
        expiry: "OneWeek",
        targetEmail: "friend@example.com",
      });
    });
  });

  it("revokes an existing share link", async () => {
    mockShares.push({
      id: 5,
      token: "abc",
      shareUrl: "/shared/recipe/abc",
      targetEmail: null,
      expiresAt: null,
      createdOn: "2024-01-01T00:00:00Z",
      isExpired: false,
      isClaimed: false,
    });
    mockRevokeShareMutateAsync.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderWithClient(<ShareRecipeDialog recipeId={1} open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Revoke share link" }));

    await waitFor(() => {
      expect(mockRevokeShareMutateAsync).toHaveBeenCalledWith(5);
    });
  });

  it("disables generating and revoking share links while offline", async () => {
    mockShares.push({
      id: 5,
      token: "abc",
      shareUrl: "/shared/recipe/abc",
      targetEmail: null,
      expiresAt: null,
      createdOn: "2024-01-01T00:00:00Z",
      isExpired: false,
      isClaimed: false,
    });
    setOnline(false);
    renderWithClient(<ShareRecipeDialog recipeId={1} open onOpenChange={onOpenChange} />);

    expect(screen.getByRole("button", { name: "Generate link" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Revoke share link" })).toBeDisabled();
  });
});

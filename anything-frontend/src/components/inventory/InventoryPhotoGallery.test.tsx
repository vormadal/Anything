import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { InventoryPhotoGallery } from "./InventoryPhotoGallery";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/inventory/items/100",
  useParams: () => ({ id: "100" }),
}));

const PHOTOS = [
  { id: 1, name: "front", contentType: "image/jpeg", kind: "Photo", url: "https://example.com/front.jpg" },
  { id: 2, name: "back", contentType: "image/jpeg", kind: "Photo", url: "https://example.com/back.jpg" },
  { id: 3, name: "manual", contentType: "application/pdf", kind: "Manual", url: "https://example.com/m.pdf" },
];

function baseProps() {
  return {
    attachments: PHOTOS,
    label: "Drill",
    onUpload: jest.fn().mockResolvedValue(undefined),
    isUploading: false,
    onDelete: jest.fn().mockResolvedValue(undefined),
    isDeleting: false,
  };
}

describe("InventoryPhotoGallery", () => {
  it("shows only photos, at full resolution", () => {
    renderWithClient(<InventoryPhotoGallery {...baseProps()} />);

    expect(screen.getByRole("img", { name: "front" })).toHaveAttribute(
      "src",
      "https://example.com/front.jpg"
    );
    expect(screen.getByRole("img", { name: "back" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "manual" })).not.toBeInTheDocument();
  });

  it("shows dots and a counter once there is more than one photo", () => {
    renderWithClient(<InventoryPhotoGallery {...baseProps()} />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show photo 2" })).toBeInTheDocument();
  });

  it("hides the dots and counter for a single photo", () => {
    renderWithClient(
      <InventoryPhotoGallery {...baseProps()} attachments={[PHOTOS[0], PHOTOS[2]]} />
    );

    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show photo 1" })).not.toBeInTheDocument();
  });

  it("opens the fullscreen viewer on the tapped photo", async () => {
    const user = userEvent.setup();
    renderWithClient(<InventoryPhotoGallery {...baseProps()} />);

    await user.click(screen.getByRole("button", { name: "View back full screen" }));

    expect(await screen.findByRole("button", { name: "Delete photo" })).toBeInTheDocument();
    // Opened on the second photo, so only the "previous" arrow is available.
    expect(screen.getByRole("button", { name: "Previous photo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
  });

  it("offers an add-photo entry point when there are no photos yet", () => {
    renderWithClient(<InventoryPhotoGallery {...baseProps()} attachments={[]} />);

    expect(screen.getByRole("button", { name: /Add photo/ })).toBeInTheDocument();
  });

  it("deletes the photo shown in the viewer", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<InventoryPhotoGallery {...props} />);

    await user.click(screen.getByRole("button", { name: "View front full screen" }));
    await user.click(await screen.findByRole("button", { name: "Delete photo" }));

    await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith(1));
  });
});

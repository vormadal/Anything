import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { InventoryPhotoViewer } from "./InventoryPhotoViewer";

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
  { id: 1, src: "https://example.com/a.jpg", alt: "front" },
  { id: 2, src: "https://example.com/b.jpg", alt: "back" },
  { id: 3, src: "https://example.com/c.jpg", alt: "side" },
];

function baseProps() {
  return {
    photos: PHOTOS,
    initialIndex: 0,
    onClose: jest.fn(),
    onDelete: jest.fn().mockResolvedValue(undefined),
    isDeleting: false,
    title: "Drill photos",
  };
}

describe("InventoryPhotoViewer", () => {
  it("opens on the requested photo", () => {
    renderWithClient(<InventoryPhotoViewer {...baseProps()} initialIndex={1} />);

    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("moves between photos with the arrow keys", async () => {
    const user = userEvent.setup();
    renderWithClient(<InventoryPhotoViewer {...baseProps()} />);

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("stops at the ends rather than wrapping", async () => {
    const user = userEvent.setup();
    renderWithClient(<InventoryPhotoViewer {...baseProps()} />);

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous photo" })).not.toBeInTheDocument();
  });

  it("jumps to a photo from its dot", async () => {
    const user = userEvent.setup();
    renderWithClient(<InventoryPhotoViewer {...baseProps()} />);

    await user.click(screen.getByRole("button", { name: "Show photo 3" }));

    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("deletes the photo currently shown", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<InventoryPhotoViewer {...props} initialIndex={2} />);

    await user.click(screen.getByRole("button", { name: "Delete photo" }));

    await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith(3));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("closes itself when the last photo is deleted", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<InventoryPhotoViewer {...props} photos={[PHOTOS[0]]} />);

    await user.click(screen.getByRole("button", { name: "Delete photo" }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });

  it("closes on the close button", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<InventoryPhotoViewer {...props} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(props.onClose).toHaveBeenCalled();
  });
});

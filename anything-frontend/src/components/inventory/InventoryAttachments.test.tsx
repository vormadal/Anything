import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { InventoryAttachments } from "./InventoryAttachments";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/inventory/items/100",
  useParams: () => ({ id: "100" }),
}));

function baseProps() {
  return {
    attachments: [],
    isLoading: false,
    onUpload: jest.fn().mockResolvedValue(undefined),
    isUploading: false,
    onDownload: jest.fn(),
    onDelete: jest.fn().mockResolvedValue(undefined),
    isDeleting: false,
  };
}

describe("InventoryAttachments", () => {
  it("shows empty states for photos and documents", () => {
    renderWithClient(<InventoryAttachments {...baseProps()} />);
    expect(screen.getByText("No photos yet.")).toBeInTheDocument();
    expect(screen.getByText("No documents yet.")).toBeInTheDocument();
  });

  it("splits attachments into a photo strip and a document list", () => {
    const props = baseProps();
    renderWithClient(
      <InventoryAttachments
        {...props}
        attachments={[
          { id: 1, name: "front", contentType: "image/jpeg", kind: "Photo", thumbnailUrl: "https://example.com/thumb.jpg" },
          { id: 2, name: "manual", contentType: "application/pdf", kind: "Manual" },
        ]}
      />
    );

    expect(screen.queryByText("No photos yet.")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "front" })).toBeInTheDocument();
    expect(screen.getByText("manual")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("uploads a chosen photo with kind Photo", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<InventoryAttachments {...props} />);

    const file = new File(["contents"], "photo.jpg", { type: "image/jpeg" });
    const input = screen.getByRole("button", { name: /Add photo/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() =>
      expect(props.onUpload).toHaveBeenCalledWith({ file, kind: "Photo" })
    );
  });

  it("opens a kind dialog before uploading a document", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<InventoryAttachments {...props} />);

    const file = new File(["contents"], "receipt.pdf", { type: "application/pdf" });
    const input = screen.getByRole("button", { name: /Add document/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(screen.getByText("Upload document")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Type"), "Receipt");
    await user.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() =>
      expect(props.onUpload).toHaveBeenCalledWith({ file, kind: "Receipt" })
    );
  });

  it("downloads a document when its name is clicked", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(
      <InventoryAttachments
        {...props}
        attachments={[{ id: 2, name: "manual", contentType: "application/pdf", kind: "Manual" }]}
      />
    );

    await user.click(screen.getByText("manual"));

    expect(props.onDownload).toHaveBeenCalledWith({ attachmentId: 2, name: "manual" });
  });

  it("deletes an attachment", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(
      <InventoryAttachments
        {...props}
        attachments={[{ id: 2, name: "manual", contentType: "application/pdf", kind: "Manual" }]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Remove document" }));

    expect(props.onDelete).toHaveBeenCalledWith(2);
  });
});

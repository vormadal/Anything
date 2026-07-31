import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { InventoryDocuments } from "./InventoryDocuments";

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

describe("InventoryDocuments", () => {
  it("shows an empty state for documents", () => {
    renderWithClient(<InventoryDocuments {...baseProps()} />);
    expect(screen.getByText("No documents yet.")).toBeInTheDocument();
  });

  it("leaves photos to the gallery and lists only documents", () => {
    const props = baseProps();
    renderWithClient(
      <InventoryDocuments
        {...props}
        attachments={[
          { id: 1, name: "front", contentType: "image/jpeg", kind: "Photo", url: "https://example.com/front.jpg" },
          { id: 2, name: "manual", contentType: "application/pdf", kind: "Manual" },
        ]}
      />
    );

    expect(screen.queryByRole("img", { name: "front" })).not.toBeInTheDocument();
    expect(screen.getByText("manual")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("opens a kind dialog before uploading a document", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<InventoryDocuments {...props} />);

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
      <InventoryDocuments
        {...props}
        attachments={[{ id: 2, name: "manual", contentType: "application/pdf", kind: "Manual" }]}
      />
    );

    await user.click(screen.getByText("manual"));

    expect(props.onDownload).toHaveBeenCalledWith({ attachmentId: 2, name: "manual" });
  });

  it("deletes a document", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(
      <InventoryDocuments
        {...props}
        attachments={[{ id: 2, name: "manual", contentType: "application/pdf", kind: "Manual" }]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Remove document" }));

    expect(props.onDelete).toHaveBeenCalledWith(2);
  });
});

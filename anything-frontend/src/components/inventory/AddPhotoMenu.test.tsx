import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { AddPhotoMenu } from "./AddPhotoMenu";

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
    onUpload: jest.fn().mockResolvedValue(undefined),
    isUploading: false,
  };
}

function cameraInput() {
  return screen.getByTestId("add-photo-camera-input") as HTMLInputElement;
}

function libraryInput() {
  return screen.getByTestId("add-photo-library-input") as HTMLInputElement;
}

describe("AddPhotoMenu", () => {
  it("offers the camera and the library as separate pickers", async () => {
    const user = userEvent.setup();
    renderWithClient(<AddPhotoMenu {...baseProps()} />);

    await user.click(screen.getByRole("button", { name: /Add photo/ }));

    expect(await screen.findByText("Take photo")).toBeInTheDocument();
    expect(screen.getByText("Choose from library")).toBeInTheDocument();
  });

  it("forces the rear camera for Take photo and allows several files from the library", () => {
    renderWithClient(<AddPhotoMenu {...baseProps()} />);

    // `capture` cannot be combined with `multiple`, hence the two inputs.
    expect(cameraInput()).toHaveAttribute("capture", "environment");
    expect(cameraInput()).not.toHaveAttribute("multiple");
    expect(cameraInput()).toHaveAttribute("accept", "image/*");

    expect(libraryInput()).toHaveAttribute("multiple");
    expect(libraryInput()).not.toHaveAttribute("capture");
    expect(libraryInput()).toHaveAttribute("accept", "image/*");
  });

  it("uploads a photographed file with kind Photo", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<AddPhotoMenu {...props} />);

    const file = new File(["contents"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(cameraInput(), file);

    await waitFor(() => expect(props.onUpload).toHaveBeenCalledWith({ file, kind: "Photo" }));
  });

  it("uploads every file picked from the library, one at a time", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<AddPhotoMenu {...props} />);

    const first = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const second = new File(["b"], "b.jpg", { type: "image/jpeg" });
    await user.upload(libraryInput(), [first, second]);

    await waitFor(() => expect(props.onUpload).toHaveBeenCalledTimes(2));
    expect(props.onUpload).toHaveBeenNthCalledWith(1, { file: first, kind: "Photo" });
    expect(props.onUpload).toHaveBeenNthCalledWith(2, { file: second, kind: "Photo" });
  });

  it("clears the input so re-picking the same file uploads again", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    renderWithClient(<AddPhotoMenu {...props} />);

    const file = new File(["contents"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(cameraInput(), file);

    await waitFor(() => expect(cameraInput().value).toBe(""));
  });
});

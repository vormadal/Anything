import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useUploadNoteImage } from "@/hooks/useNotes";

const mockImagesPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      notes: {
        images: { post: (...args: unknown[]) => mockImagesPost(...args) },
      },
    },
  },
  createMultipartBody: () => ({ addOrReplacePart: jest.fn() }),
  buildFileUploadBody: async () => ({ addOrReplacePart: jest.fn() }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe("useUploadNoteImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads the file and returns the storage key and url", async () => {
    mockImagesPost.mockResolvedValueOnce({ storageKey: "notes/abc.png", url: "https://images.example/abc.png" });
    const { result } = renderHook(() => useUploadNoteImage(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(new File(["content"], "photo.png", { type: "image/png" }));
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      storageKey: "notes/abc.png",
      url: "https://images.example/abc.png",
    });
    expect(mockImagesPost).toHaveBeenCalled();
  });

  it("rejects a file over the 10 MB limit without calling the API", async () => {
    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], "huge.png", { type: "image/png" });
    const { result } = renderHook(() => useUploadNoteImage(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(bigFile);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("too large");
    expect(mockImagesPost).not.toHaveBeenCalled();
  });

  it("maps a 413 response to a friendly message", async () => {
    mockImagesPost.mockRejectedValueOnce({ responseStatusCode: 413, message: "Payload Too Large" });
    const { result } = renderHook(() => useUploadNoteImage(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(new File(["content"], "photo.png", { type: "image/png" }));
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("File is too large. Please use a file under 10 MB.");
  });

  it("surfaces an error when the server returns no image data", async () => {
    mockImagesPost.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useUploadNoteImage(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(new File(["content"], "photo.png", { type: "image/png" }));
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

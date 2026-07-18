import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useExportSuggestionsBundle,
  useImportSuggestionsBundle,
} from "@/hooks/useSuggestionsBundle";

const mockRecExportGet = jest.fn();
const mockRecImportPost = jest.fn();
const mockCatExportGet = jest.fn();
const mockCatImportPost = jest.fn();

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    api: {
      shoppingListRecommendations: {
        exportEscaped: { get: (...args: unknown[]) => mockRecExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockRecImportPost(...args) },
      },
      suggestionCategories: {
        exportEscaped: { get: (...args: unknown[]) => mockCatExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockCatImportPost(...args) },
      },
    },
  },
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
  Wrapper.displayName = "TestQueryClientWrapper";
  return Wrapper;
}

describe("useSuggestionsBundle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") {
        el.click = jest.fn();
      }
      return el;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("useExportSuggestionsBundle", () => {
    it("fetches both halves and triggers a single download", async () => {
      mockRecExportGet.mockResolvedValueOnce({ recommendations: [{ name: "Milk" }] });
      mockCatExportGet.mockResolvedValueOnce({ categories: [{ name: "Dairy" }] });

      const { result } = renderHook(() => useExportSuggestionsBundle(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ uncategorizedOnly: false });
      });

      expect(mockRecExportGet).toHaveBeenCalledWith({ queryParameters: { uncategorizedOnly: false } });
      expect(mockCatExportGet).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it("forwards the uncategorizedOnly flag to the recommendations export", async () => {
      mockRecExportGet.mockResolvedValueOnce({ recommendations: [] });
      mockCatExportGet.mockResolvedValueOnce({ categories: [] });

      const { result } = renderHook(() => useExportSuggestionsBundle(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ uncategorizedOnly: true });
      });

      expect(mockRecExportGet).toHaveBeenCalledWith({ queryParameters: { uncategorizedOnly: true } });
    });
  });

  describe("useImportSuggestionsBundle", () => {
    it("imports categories before recommendations", async () => {
      const callOrder: string[] = [];
      mockCatImportPost.mockImplementationOnce(async () => {
        callOrder.push("categories");
      });
      mockRecImportPost.mockImplementationOnce(async () => {
        callOrder.push("recommendations");
      });

      const { result } = renderHook(() => useImportSuggestionsBundle(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          categories: [{ name: "Dairy" }],
          recommendations: [{ name: "Milk" }],
        });
      });

      expect(callOrder).toEqual(["categories", "recommendations"]);
      expect(mockCatImportPost).toHaveBeenCalledWith({ categories: [{ name: "Dairy" }] });
      expect(mockRecImportPost).toHaveBeenCalledWith({ recommendations: [{ name: "Milk" }] });
    });

    it("skips empty halves", async () => {
      mockRecImportPost.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useImportSuggestionsBundle(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ recommendations: [{ name: "Bread" }] });
      });

      expect(mockRecImportPost).toHaveBeenCalledWith({ recommendations: [{ name: "Bread" }] });
      expect(mockCatImportPost).not.toHaveBeenCalled();
    });

    it("does nothing for an empty bundle", async () => {
      const { result } = renderHook(() => useImportSuggestionsBundle(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(mockRecImportPost).not.toHaveBeenCalled();
      expect(mockCatImportPost).not.toHaveBeenCalled();
    });
  });
});

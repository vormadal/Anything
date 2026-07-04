import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useSuggestionCategories,
  useCreateSuggestionCategory,
  useUpdateSuggestionCategory,
  useDeleteSuggestionCategory,
  useReorderSuggestionCategories,
  useExportSuggestionCategories,
  useImportSuggestionCategories,
} from '@/hooks/useSuggestionCategories'

const mockGetFn = jest.fn()
const mockPostFn = jest.fn()
const mockPutFn = jest.fn()
const mockDeleteFn = jest.fn()
const mockReorderPutFn = jest.fn()
const mockExportGet = jest.fn()
const mockImportPost = jest.fn()
const mockItemById: jest.Mock = jest.fn(() => ({ put: mockPutFn, delete: mockDeleteFn }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      suggestionCategories: {
        get: (...args: unknown[]) => mockGetFn(...args),
        post: (...args: unknown[]) => mockPostFn(...args),
        byId: (...args: unknown[]) => mockItemById(...args),
        reorder: { put: (...args: unknown[]) => mockReorderPutFn(...args) },
        exportEscaped: { get: (...args: unknown[]) => mockExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockImportPost(...args) },
      },
    },
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'TestQueryClientWrapper'
  return Wrapper
}

describe('useSuggestionCategories hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useSuggestionCategories', () => {
    it('fetches categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Dairy', sortOrder: 0 },
        { id: 2, name: 'Produce', sortOrder: 1 },
      ]
      mockGetFn.mockResolvedValueOnce(mockCategories)

      const { result } = renderHook(() => useSuggestionCategories(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockCategories)
    })
  })

  describe('useCreateSuggestionCategory', () => {
    it('calls post with category name', async () => {
      const newCategory = { id: 1, name: 'Frozen', sortOrder: 0 }
      mockPostFn.mockResolvedValueOnce(newCategory)

      const { result } = renderHook(() => useCreateSuggestionCategory(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync('Frozen')
      })

      expect(mockPostFn).toHaveBeenCalledWith({ name: 'Frozen' })
    })
  })

  describe('useUpdateSuggestionCategory', () => {
    it('calls put with id and name', async () => {
      mockPutFn.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateSuggestionCategory(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ id: 1, name: 'Beverages' })
      })

      expect(mockItemById).toHaveBeenCalledWith(1)
      expect(mockPutFn).toHaveBeenCalledWith({ name: 'Beverages' })
    })
  })

  describe('useDeleteSuggestionCategory', () => {
    it('calls delete with id', async () => {
      mockDeleteFn.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteSuggestionCategory(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(1)
      })

      expect(mockItemById).toHaveBeenCalledWith(1)
      expect(mockDeleteFn).toHaveBeenCalled()
    })
  })

  describe('useReorderSuggestionCategories', () => {
    it('calls reorder with ids', async () => {
      mockReorderPutFn.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useReorderSuggestionCategories(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync([3, 1, 2])
      })

      expect(mockReorderPutFn).toHaveBeenCalledWith({ ids: [3, 1, 2] })
    })
  })

  describe('useExportSuggestionCategories', () => {
    it('fetches export data through the generated client', async () => {
      mockExportGet.mockResolvedValueOnce({ categories: [] })
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()

      const { result } = renderHook(() => useExportSuggestionCategories(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(mockExportGet).toHaveBeenCalled()
    })
  })

  describe('useImportSuggestionCategories', () => {
    it('posts the import payload through the generated client', async () => {
      mockImportPost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useImportSuggestionCategories(), {
        wrapper: createWrapper(),
      })

      const payload = { categories: [{ name: 'Frozen' }] }
      await act(async () => {
        await result.current.mutateAsync(payload)
      })

      expect(mockImportPost).toHaveBeenCalledWith(payload)
    })
  })
})

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useRecommendations,
  useAllRecommendations,
  useRecommendationSearch,
  useDeleteRecommendation,
  useDeleteRecommendationsForList,
  useUpdateRecommendation,
  useExportRecommendations,
  useImportRecommendations,
  useFindDuplicateRecommendations,
  useMergeRecommendations,
} from '@/hooks/useRecommendations'

const mockGet = jest.fn()
const mockAllGet = jest.fn()
const mockSearchGet = jest.fn()
const mockDeleteFn = jest.fn()
const mockPutFn = jest.fn()
const mockItemById: jest.Mock = jest.fn(() => ({ delete: mockDeleteFn, put: mockPutFn }))
const mockByListDelete = jest.fn()
const mockByShoppingListId: jest.Mock = jest.fn(() => ({ delete: mockByListDelete }))
const mockExportGet = jest.fn()
const mockImportPost = jest.fn()
const mockDuplicatesGet = jest.fn()
const mockMergePost = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      shoppingListRecommendations: {
        get: (...args: unknown[]) => mockGet(...args),
        all: { get: (...args: unknown[]) => mockAllGet(...args) },
        search: { get: (...args: unknown[]) => mockSearchGet(...args) },
        byId: (...args: unknown[]) => mockItemById(...args),
        byList: { byShoppingListId: (...args: unknown[]) => mockByShoppingListId(...args) },
        exportEscaped: { get: (...args: unknown[]) => mockExportGet(...args) },
        importEscaped: { post: (...args: unknown[]) => mockImportPost(...args) },
        duplicates: { get: (...args: unknown[]) => mockDuplicatesGet(...args) },
        merge: { post: (...args: unknown[]) => mockMergePost(...args) },
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

describe('useRecommendations hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useRecommendations', () => {
    it('fetches recommendations', async () => {
      const mockRecommendations = [
        { id: 1, name: 'Milk' },
        { id: 2, name: 'Bread' },
      ]
      mockGet.mockResolvedValueOnce(mockRecommendations)

      const { result } = renderHook(() => useRecommendations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockRecommendations)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('handles fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useRecommendations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useAllRecommendations', () => {
    it('fetches all recommendations ordered alphabetically', async () => {
      const mockAll = [
        { id: 2, name: 'Bread' },
        { id: 3, name: 'Cheese' },
        { id: 1, name: 'Milk' },
      ]
      mockAllGet.mockResolvedValueOnce(mockAll)

      const { result } = renderHook(() => useAllRecommendations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockAll)
      expect(mockAllGet).toHaveBeenCalledTimes(1)
    })

    it('handles fetch error', async () => {
      mockAllGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAllRecommendations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })

    it('passes list and visibility filters as query parameters', async () => {
      mockAllGet.mockResolvedValueOnce([])

      const { result } = renderHook(
        () => useAllRecommendations({ shoppingListId: 7, uncategorized: true, includeInSuggestions: false }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockAllGet).toHaveBeenCalledWith({
        queryParameters: { shoppingListId: 7, uncategorized: true, includeInSuggestions: false },
      })
    })

    it('passes sharedOnly when the shared filter is selected', async () => {
      mockAllGet.mockResolvedValueOnce([])

      const { result } = renderHook(() => useAllRecommendations({ sharedOnly: true }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockAllGet).toHaveBeenCalledWith({ queryParameters: { sharedOnly: true } })
    })
  })

  describe('useRecommendationSearch', () => {
    it('scopes the search to a list when shoppingListId is given', async () => {
      mockSearchGet.mockResolvedValueOnce([])

      const { result } = renderHook(() => useRecommendationSearch('mil', 7), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockSearchGet).toHaveBeenCalledWith({
        queryParameters: { query: 'mil', shoppingListId: 7 },
      })
    })
  })

  describe('useDeleteRecommendationsForList', () => {
    it('calls delete on the by-list endpoint with the list id', async () => {
      mockByListDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteRecommendationsForList(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(7)
      })

      expect(mockByShoppingListId).toHaveBeenCalledWith(7)
      expect(mockByListDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('useDeleteRecommendation', () => {
    it('calls delete endpoint with correct id', async () => {
      mockDeleteFn.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteRecommendation(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(2)
      })

      expect(mockItemById).toHaveBeenCalledWith(2)
      expect(mockDeleteFn).toHaveBeenCalledTimes(1)
    })

    it('handles delete error', async () => {
      mockDeleteFn.mockRejectedValueOnce(new Error('Not Found'))

      const { result } = renderHook(() => useDeleteRecommendation(), {
        wrapper: createWrapper(),
      })

      await expect(
        act(async () => {
          await result.current.mutateAsync(99)
        })
      ).rejects.toThrow('Not Found')
    })
  })

  describe('useUpdateRecommendation', () => {
    it('calls put endpoint with correct id and payload', async () => {
      mockPutFn.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateRecommendation(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ id: 1, name: 'Milk', preferredUnit: 'L' })
      })

      expect(mockItemById).toHaveBeenCalledWith(1)
      expect(mockPutFn).toHaveBeenCalledWith({ name: 'Milk', preferredUnit: 'L', categoryId: null, includeInSuggestions: true, shoppingListId: null })
    })

    it('forwards includeInSuggestions when hiding a recommendation from suggestions', async () => {
      mockPutFn.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateRecommendation(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ id: 4, name: 'Boneless chicken breasts', categoryId: 2, includeInSuggestions: false })
      })

      expect(mockPutFn).toHaveBeenCalledWith({ name: 'Boneless chicken breasts', preferredUnit: null, categoryId: 2, includeInSuggestions: false, shoppingListId: null })
    })

    it('forwards shoppingListId when scoping a recommendation to a list', async () => {
      mockPutFn.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateRecommendation(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ id: 5, name: 'Milk', shoppingListId: 7 })
      })

      expect(mockPutFn).toHaveBeenCalledWith({ name: 'Milk', preferredUnit: null, categoryId: null, includeInSuggestions: true, shoppingListId: 7 })
    })

    it('handles update error', async () => {
      mockPutFn.mockRejectedValueOnce(new Error('Forbidden'))

      const { result } = renderHook(() => useUpdateRecommendation(), {
        wrapper: createWrapper(),
      })

      await expect(
        act(async () => {
          await result.current.mutateAsync({ id: 1, name: 'Milk' })
        })
      ).rejects.toThrow('Forbidden')
    })
  })

  describe('useExportRecommendations', () => {
    it('fetches export data with the uncategorizedOnly filter', async () => {
      mockExportGet.mockResolvedValueOnce({ recommendations: [] })
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()

      const { result } = renderHook(() => useExportRecommendations(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ uncategorizedOnly: true })
      })

      expect(mockExportGet).toHaveBeenCalledWith({
        queryParameters: { uncategorizedOnly: true },
      })
    })
  })

  describe('useFindDuplicateRecommendations', () => {
    it('fetches duplicate groups', async () => {
      const groups = [
        { members: [{ id: 1, name: 'Tomato' }, { id: 2, name: 'Tomatoe' }] },
      ]
      mockDuplicatesGet.mockResolvedValueOnce(groups)

      const { result } = renderHook(() => useFindDuplicateRecommendations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(groups)
      expect(mockDuplicatesGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('useMergeRecommendations', () => {
    it('posts the merge payload', async () => {
      mockMergePost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useMergeRecommendations(), {
        wrapper: createWrapper(),
      })

      const payload = { targetId: 1, sourceIds: [2, 3], name: 'Tomato', categoryId: null }
      await act(async () => {
        await result.current.mutateAsync(payload)
      })

      expect(mockMergePost).toHaveBeenCalledWith(payload)
    })

    it('handles merge error', async () => {
      mockMergePost.mockRejectedValueOnce(new Error('Conflict'))

      const { result } = renderHook(() => useMergeRecommendations(), {
        wrapper: createWrapper(),
      })

      await expect(
        act(async () => {
          await result.current.mutateAsync({ targetId: 1, sourceIds: [2] })
        })
      ).rejects.toThrow('Conflict')
    })
  })

  describe('useImportRecommendations', () => {
    it('posts the import payload', async () => {
      mockImportPost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useImportRecommendations(), {
        wrapper: createWrapper(),
      })

      const payload = { recommendations: [{ name: 'Milk', preferredUnit: 'L' }] }
      await act(async () => {
        await result.current.mutateAsync(payload)
      })

      expect(mockImportPost).toHaveBeenCalledWith(payload)
    })
  })
})

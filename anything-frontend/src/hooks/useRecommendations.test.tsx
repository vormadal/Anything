import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useApprovedRecommendations,
  useAllRecommendations,
  usePendingRecommendations,
  useApproveRecommendation,
  useDeleteRecommendation,
  useUpdateRecommendation,
} from '@/hooks/useRecommendations'

const mockApprovedGet = jest.fn()
const mockPendingGet = jest.fn()
const mockAllGet = jest.fn()
const mockApprovePost = jest.fn()
const mockDeleteFn = jest.fn()
const mockPutFn = jest.fn()
const mockApprove = { post: mockApprovePost }
const mockItemById = jest.fn(() => ({ approve: mockApprove, delete: mockDeleteFn, put: mockPutFn }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      shoppingListRecommendations: {
        get: (...args: unknown[]) => mockApprovedGet(...args),
        all: { get: (...args: unknown[]) => mockAllGet(...args) },
        pending: { get: (...args: unknown[]) => mockPendingGet(...args) },
        byId: (...args: unknown[]) => mockItemById(...args),
      },
    },
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

  describe('useApprovedRecommendations', () => {
    it('fetches approved recommendations', async () => {
      const mockRecommendations = [
        { id: 1, name: 'Milk', isApproved: true },
        { id: 2, name: 'Bread', isApproved: true },
      ]
      mockApprovedGet.mockResolvedValueOnce(mockRecommendations)

      const { result } = renderHook(() => useApprovedRecommendations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockRecommendations)
      expect(mockApprovedGet).toHaveBeenCalledTimes(1)
    })

    it('handles fetch error', async () => {
      mockApprovedGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useApprovedRecommendations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useAllRecommendations', () => {
    it('fetches all recommendations ordered alphabetically', async () => {
      const mockAll = [
        { id: 2, name: 'Bread', isApproved: true },
        { id: 3, name: 'Cheese', isApproved: false },
        { id: 1, name: 'Milk', isApproved: true },
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
  })

  describe('usePendingRecommendations', () => {
    it('fetches pending recommendations', async () => {
      const mockPending = [
        { id: 3, name: 'Cheese', isApproved: false },
      ]
      mockPendingGet.mockResolvedValueOnce(mockPending)

      const { result } = renderHook(() => usePendingRecommendations(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockPending)
      expect(mockPendingGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('useApproveRecommendation', () => {
    it('calls approve endpoint with correct id', async () => {
      mockApprovePost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useApproveRecommendation(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(1)
      })

      expect(mockItemById).toHaveBeenCalledWith(1)
      expect(mockApprovePost).toHaveBeenCalledTimes(1)
    })

    it('handles approval error', async () => {
      mockApprovePost.mockRejectedValueOnce(new Error('Forbidden'))

      const { result } = renderHook(() => useApproveRecommendation(), {
        wrapper: createWrapper(),
      })

      await expect(
        act(async () => {
          await result.current.mutateAsync(1)
        })
      ).rejects.toThrow('Forbidden')
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
      expect(mockPutFn).toHaveBeenCalledWith({ name: 'Milk', preferredUnit: 'L' })
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
})

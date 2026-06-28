import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useInventoryBoxes,
  useCreateInventoryBox,
  useUpdateInventoryBox,
  useDeleteInventoryBox,
} from '@/hooks/useInventoryBoxes'

// Mock the apiClient module
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockByIdPut = jest.fn()
const mockByIdDelete = jest.fn()
const mockById: jest.Mock = jest.fn(() => ({ put: mockByIdPut, delete: mockByIdDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      inventoryBoxes: {
        get: (...args: unknown[]) => mockGet(...args),
        post: (...args: unknown[]) => mockPost(...args),
        byId: (...args: unknown[]) => mockById(...args),
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

describe('useInventoryBoxes hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useInventoryBoxes', () => {
    it('should fetch inventory boxes successfully', async () => {
      const mockData = [
        { id: 1, number: 1, storageUnitId: 1, createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, number: 2, storageUnitId: 1, createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useInventoryBoxes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useInventoryBoxes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateInventoryBox', () => {
    it('should create an inventory box successfully', async () => {
      const mockResponse = { id: 1, number: 1, storageUnitId: 1, createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateInventoryBox(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ number: 1, storageUnitId: 1 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPost).toHaveBeenCalledWith({ number: 1, storageUnitId: 1 })
    })

    it('should handle create error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateInventoryBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ number: 1 })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateInventoryBox', () => {
    it('should update an inventory box successfully', async () => {
      mockByIdPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateInventoryBox(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ id: 1, number: 2, storageUnitId: 2 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockByIdPut).toHaveBeenCalledWith({ number: 2, storageUnitId: 2 })
    })

    it('should handle update error', async () => {
      mockByIdPut.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useUpdateInventoryBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, number: 2 })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useDeleteInventoryBox', () => {
    it('should delete an inventory box successfully', async () => {
      mockByIdDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteInventoryBox(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(1)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockByIdDelete).toHaveBeenCalled()
    })

    it('should handle delete error', async () => {
      mockByIdDelete.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useDeleteInventoryBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

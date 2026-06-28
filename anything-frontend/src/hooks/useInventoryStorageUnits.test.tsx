import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useInventoryStorageUnits,
  useCreateInventoryStorageUnit,
  useUpdateInventoryStorageUnit,
  useDeleteInventoryStorageUnit,
} from '@/hooks/useInventoryStorageUnits'

// Mock the apiClient module
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockByIdPut = jest.fn()
const mockByIdDelete = jest.fn()
const mockById: jest.Mock = jest.fn(() => ({ put: mockByIdPut, delete: mockByIdDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      inventoryStorageUnits: {
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

describe('useInventoryStorageUnits hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useInventoryStorageUnits', () => {
    it('should fetch inventory storage units successfully', async () => {
      const mockData = [
        { id: 1, name: 'Garage', type: 'Garage', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Basement', type: 'Basement', createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useInventoryStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useInventoryStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateInventoryStorageUnit', () => {
    it('should create an inventory storage unit successfully', async () => {
      const mockResponse = { id: 1, name: 'New Storage', type: 'Closet', createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'New Storage', type: 'Closet' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPost).toHaveBeenCalledWith({ name: 'New Storage', type: 'Closet' })
    })

    it('should handle create error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'New Storage' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateInventoryStorageUnit', () => {
    it('should update an inventory storage unit successfully', async () => {
      mockByIdPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Updated Storage', type: 'Attic' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockByIdPut).toHaveBeenCalledWith({ name: 'Updated Storage', type: 'Attic' })
    })

    it('should handle update error', async () => {
      mockByIdPut.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useUpdateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, name: 'Updated Storage' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useDeleteInventoryStorageUnit', () => {
    it('should delete an inventory storage unit successfully', async () => {
      mockByIdDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteInventoryStorageUnit(), {
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

      const { result } = renderHook(() => useDeleteInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

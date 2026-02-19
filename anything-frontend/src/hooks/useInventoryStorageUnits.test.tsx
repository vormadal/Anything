import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useInventoryStorageUnits,
  useCreateInventoryStorageUnit,
  useUpdateInventoryStorageUnit,
  useDeleteInventoryStorageUnit,
} from '@/hooks/useInventoryStorageUnits'

// Mock fetch globally
global.fetch = jest.fn()

// Mock getAccessToken to return null (unauthenticated)
jest.mock('@/hooks/useAuth', () => ({
  getAccessToken: jest.fn(() => null),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
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

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const { result } = renderHook(() => useInventoryStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/inventory-storage-units',
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json"
          })
        })
      )
    })

    it('should handle fetch error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useInventoryStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateInventoryStorageUnit', () => {
    it('should create an inventory storage unit successfully', async () => {
      const mockResponse = {
        id: 1,
        name: 'New Storage',
        type: 'Closet',
        createdOn: '2024-01-01T00:00:00Z',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useCreateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'New Storage', type: 'Closet' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/inventory-storage-units',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'New Storage', type: 'Closet' }),
        })
      )
    })

    it('should handle create error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useUpdateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, name: 'Updated Storage', type: 'Attic' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/inventory-storage-units/1',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Updated Storage', type: 'Attic' }),
        })
      )
    })

    it('should handle update error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useDeleteInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/inventory-storage-units/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should handle delete error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useDeleteInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

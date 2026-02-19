import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useInventoryBoxes,
  useCreateInventoryBox,
  useUpdateInventoryBox,
  useDeleteInventoryBox,
} from '@/hooks/useInventoryBoxes'

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

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const { result } = renderHook(() => useInventoryBoxes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/inventory-boxes',
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

      const { result } = renderHook(() => useInventoryBoxes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateInventoryBox', () => {
    it('should create an inventory box successfully', async () => {
      const mockResponse = {
        id: 1,
        number: 1,
        storageUnitId: 1,
        createdOn: '2024-01-01T00:00:00Z',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useCreateInventoryBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ number: 1, storageUnitId: 1 })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/inventory-boxes',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ number: 1, storageUnitId: 1 }),
        })
      )
    })

    it('should handle create error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useUpdateInventoryBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, number: 2, storageUnitId: 2 })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/inventory-boxes/1',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ number: 2, storageUnitId: 2 }),
        })
      )
    })

    it('should handle update error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

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
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useDeleteInventoryBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/inventory-boxes/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should handle delete error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useDeleteInventoryBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
} from '@/hooks/useItems'

// Mock fetch globally
global.fetch = jest.fn()

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

describe('useItems hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useItems', () => {
    it('should fetch items successfully', async () => {
      const mockData = [
        { id: 1, name: 'Winter Clothes', description: 'Seasonal clothing', boxId: 1, createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Books', description: 'Old textbooks', boxId: 2, createdOn: '2024-01-02T00:00:00Z' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const { result } = renderHook(() => useItems(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/items',
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

      const { result } = renderHook(() => useItems(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateItem', () => {
    it('should create an item successfully', async () => {
      const mockResponse = {
        id: 1,
        name: 'New Item',
        description: 'Test description',
        boxId: 5,
        storageUnitId: 2,
        createdOn: '2024-01-01T00:00:00Z',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useCreateItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: 'New Item',
        description: 'Test description',
        boxId: 5,
        storageUnitId: 2,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/items',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'New Item',
            description: 'Test description',
            boxId: 5,
            storageUnitId: 2,
          }),
        })
      )
    })

    it('should handle create error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useCreateItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'New Item' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateItem', () => {
    it('should update an item successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useUpdateItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 1,
        name: 'Updated Item',
        description: 'Updated description',
        boxId: 10,
        storageUnitId: 3,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/items/1',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Updated Item',
            description: 'Updated description',
            boxId: 10,
            storageUnitId: 3,
          }),
        })
      )
    })

    it('should handle update error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useUpdateItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, name: 'Updated Item' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useDeleteItem', () => {
    it('should delete an item successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useDeleteItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/items/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should handle delete error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useDeleteItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

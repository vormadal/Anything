import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useBoxes,
  useCreateBox,
  useUpdateBox,
  useDeleteBox,
} from '@/hooks/useBoxes'

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

describe('useBoxes hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useBoxes', () => {
    it('should fetch boxes successfully', async () => {
      const mockData = [
        { id: 1, number: 1, storageUnitId: 1, createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, number: 2, storageUnitId: 1, createdOn: '2024-01-02T00:00:00Z' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const { result } = renderHook(() => useBoxes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/boxes',
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

      const { result } = renderHook(() => useBoxes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateBox', () => {
    it('should create a box successfully', async () => {
      const mockResponse = {
        id: 1,
        number: 5,
        storageUnitId: 2,
        createdOn: '2024-01-01T00:00:00Z',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useCreateBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ number: 5, storageUnitId: 2 })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/boxes',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ number: 5, storageUnitId: 2 }),
        })
      )
    })

    it('should handle create error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useCreateBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ number: 5 })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateBox', () => {
    it('should update a box successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useUpdateBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, number: 10, storageUnitId: 3 })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/boxes/1',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ number: 10, storageUnitId: 3 }),
        })
      )
    })

    it('should handle update error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useUpdateBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, number: 10 })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useDeleteBox', () => {
    it('should delete a box successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useDeleteBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/boxes/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should handle delete error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useDeleteBox(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

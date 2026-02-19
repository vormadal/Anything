import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useStorageUnits,
  useCreateStorageUnit,
  useUpdateStorageUnit,
  useDeleteStorageUnit,
} from '@/hooks/useStorageUnits'

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

describe('useStorageUnits hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useStorageUnits', () => {
    it('should fetch storage units successfully', async () => {
      const mockData = [
        { id: 1, name: 'Basement', type: 'basement', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Shed', type: 'shed', createdOn: '2024-01-02T00:00:00Z' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const { result } = renderHook(() => useStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/storageunits',
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

      const { result } = renderHook(() => useStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateStorageUnit', () => {
    it('should create a storage unit successfully', async () => {
      const mockResponse = {
        id: 1,
        name: 'New Unit',
        type: 'garage',
        createdOn: '2024-01-01T00:00:00Z',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useCreateStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'New Unit', type: 'garage' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/storageunits',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'New Unit', type: 'garage' }),
        })
      )
    })

    it('should handle create error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useCreateStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'New Unit' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateStorageUnit', () => {
    it('should update a storage unit successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useUpdateStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, name: 'Updated Unit', type: 'attic' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/storageunits/1',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Updated Unit', type: 'attic' }),
        })
      )
    })

    it('should handle update error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useUpdateStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, name: 'Updated Unit' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useDeleteStorageUnit', () => {
    it('should delete a storage unit successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const { result } = renderHook(() => useDeleteStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/storageunits/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should handle delete error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useDeleteStorageUnit(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

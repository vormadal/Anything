import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useSomethings,
  useCreateSomething,
  useUpdateSomething,
  useDeleteSomething,
} from '@/hooks/useSomethings'

// Mock the apiClient module
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockByIdPut = jest.fn()
const mockByIdDelete = jest.fn()
const mockById = jest.fn(() => ({ put: mockByIdPut, delete: mockByIdDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      somethings: {
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

describe('useSomethings hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useSomethings', () => {
    it('should fetch somethings successfully', async () => {
      const mockData = [
        { id: 1, name: 'Test Something', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Another Something', createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useSomethings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useSomethings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateSomething', () => {
    it('should create a something successfully', async () => {
      const mockResponse = {
        id: 1,
        name: 'New Something',
        createdOn: '2024-01-01T00:00:00Z',
      }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateSomething(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'New Something' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPost).toHaveBeenCalledWith({ name: 'New Something' })
    })

    it('should handle create error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateSomething(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'New Something' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateSomething', () => {
    it('should update a something successfully', async () => {
      mockByIdPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateSomething(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Updated Something' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockByIdPut).toHaveBeenCalledWith({ name: 'Updated Something' })
    })

    it('should handle update error', async () => {
      mockByIdPut.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useUpdateSomething(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, name: 'Updated Something' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useDeleteSomething', () => {
    it('should delete a something successfully', async () => {
      mockByIdDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteSomething(), {
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

      const { result } = renderHook(() => useDeleteSomething(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

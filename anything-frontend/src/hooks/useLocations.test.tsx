import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from '@/hooks/useLocations'

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockByIdPut = jest.fn()
const mockByIdDelete = jest.fn()
const mockById: jest.Mock = jest.fn(() => ({ put: mockByIdPut, delete: mockByIdDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      locations: {
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

describe('useLocations hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useLocations', () => {
    it('should fetch locations successfully', async () => {
      const mockData = [
        { id: 1, name: 'Home', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Summerhouse', createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useLocations(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useLocations(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateLocation', () => {
    it('should create a location successfully', async () => {
      const mockResponse = { id: 1, name: 'Home', createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateLocation(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate('Home')
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockPost).toHaveBeenCalledWith({ name: 'Home' })
    })

    it('should handle create error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateLocation(), { wrapper: createWrapper() })

      result.current.mutate('Home')

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateLocation', () => {
    it('should update a location successfully', async () => {
      mockByIdPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateLocation(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Updated Home' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockByIdPut).toHaveBeenCalledWith({ name: 'Updated Home' })
    })
  })

  describe('useDeleteLocation', () => {
    it('should delete a location successfully', async () => {
      mockByIdDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteLocation(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate(1)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockByIdDelete).toHaveBeenCalled()
    })
  })
})

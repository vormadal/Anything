import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/useVendors'

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockByIdPut = jest.fn()
const mockByIdDelete = jest.fn()
const mockById: jest.Mock = jest.fn(() => ({ put: mockByIdPut, delete: mockByIdDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      vendors: {
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

describe('useVendors hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useVendors', () => {
    it('should fetch vendors successfully', async () => {
      const mockData = [
        { id: 1, name: 'Netflix', website: 'https://netflix.com', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Spotify', createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useVendors(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useVendors(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateVendor', () => {
    it('should create a vendor successfully', async () => {
      const mockResponse = { id: 1, name: 'Netflix', website: 'https://netflix.com', createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateVendor(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ name: 'Netflix', website: 'https://netflix.com' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockPost).toHaveBeenCalledWith({ name: 'Netflix', website: 'https://netflix.com' })
    })

    it('should create a vendor without website', async () => {
      const mockResponse = { id: 2, name: 'Local Utilities', createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateVendor(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ name: 'Local Utilities' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockPost).toHaveBeenCalledWith({ name: 'Local Utilities', website: null })
    })
  })

  describe('useUpdateVendor', () => {
    it('should update a vendor successfully', async () => {
      mockByIdPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateVendor(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Netflix Inc.', website: 'https://netflix.com' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockByIdPut).toHaveBeenCalledWith({ name: 'Netflix Inc.', website: 'https://netflix.com' })
    })
  })

  describe('useDeleteVendor', () => {
    it('should delete a vendor successfully', async () => {
      mockByIdDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteVendor(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate(1)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockByIdDelete).toHaveBeenCalled()
    })
  })
})

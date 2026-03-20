import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/useVendors'

const mockAuthenticatedFetch = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  API_BASE_URL: 'http://localhost:5238',
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
}))

function jsonRes(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => data })
}

function noContent() {
  return Promise.resolve({ ok: true, status: 204, json: async () => undefined })
}

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
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockData))

      const { result } = renderHook(() => useVendors(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/vendors',
        expect.any(Object)
      )
    })

    it('should handle fetch error', async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useVendors(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateVendor', () => {
    it('should create a vendor successfully', async () => {
      const mockResponse = { id: 1, name: 'Netflix', website: 'https://netflix.com', createdOn: '2024-01-01T00:00:00Z' }
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockResponse))

      const { result } = renderHook(() => useCreateVendor(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ name: 'Netflix', website: 'https://netflix.com' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [url, options] = mockAuthenticatedFetch.mock.calls[0]
      expect(url).toBe('http://localhost:5238/api/vendors')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body as string)).toMatchObject({ name: 'Netflix', website: 'https://netflix.com' })
    })

    it('should create a vendor without website', async () => {
      const mockResponse = { id: 2, name: 'Local Utilities', createdOn: '2024-01-01T00:00:00Z' }
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockResponse))

      const { result } = renderHook(() => useCreateVendor(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ name: 'Local Utilities' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const body = JSON.parse(mockAuthenticatedFetch.mock.calls[0][1].body as string)
      expect(body).toMatchObject({ name: 'Local Utilities', website: null })
    })
  })

  describe('useUpdateVendor', () => {
    it('should update a vendor successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())

      const { result } = renderHook(() => useUpdateVendor(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Netflix Inc.', website: 'https://netflix.com' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [url, options] = mockAuthenticatedFetch.mock.calls[0]
      expect(url).toBe('http://localhost:5238/api/vendors/1')
      expect(options.method).toBe('PUT')
      expect(JSON.parse(options.body as string)).toMatchObject({ name: 'Netflix Inc.', website: 'https://netflix.com' })
    })
  })

  describe('useDeleteVendor', () => {
    it('should delete a vendor successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())

      const { result } = renderHook(() => useDeleteVendor(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate(1)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/vendors/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})

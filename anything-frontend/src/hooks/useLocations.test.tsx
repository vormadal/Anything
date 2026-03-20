import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from '@/hooks/useLocations'

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
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockData))

      const { result } = renderHook(() => useLocations(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/locations',
        expect.any(Object)
      )
    })

    it('should handle fetch error', async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useLocations(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateLocation', () => {
    it('should create a location successfully', async () => {
      const mockResponse = { id: 1, name: 'Home', createdOn: '2024-01-01T00:00:00Z' }
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockResponse))

      const { result } = renderHook(() => useCreateLocation(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate('Home')
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [url, options] = mockAuthenticatedFetch.mock.calls[0]
      expect(url).toBe('http://localhost:5238/api/locations')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body as string)).toMatchObject({ name: 'Home' })
    })

    it('should handle create error', async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateLocation(), { wrapper: createWrapper() })

      result.current.mutate('Home')

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateLocation', () => {
    it('should update a location successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())

      const { result } = renderHook(() => useUpdateLocation(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Updated Home' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [url, options] = mockAuthenticatedFetch.mock.calls[0]
      expect(url).toBe('http://localhost:5238/api/locations/1')
      expect(options.method).toBe('PUT')
      expect(JSON.parse(options.body as string)).toMatchObject({ name: 'Updated Home' })
    })
  })

  describe('useDeleteLocation', () => {
    it('should delete a location successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())

      const { result } = renderHook(() => useDeleteLocation(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate(1)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/locations/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})

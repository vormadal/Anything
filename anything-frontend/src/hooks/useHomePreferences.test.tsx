import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useHomeCardPreferences, useUpdateHomeCardPreferences } from '@/hooks/useHomePreferences'

const mockGet = jest.fn()
const mockPut = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      home: {
        cardPreferences: {
          get: (...args: unknown[]) => mockGet(...args),
          put: (...args: unknown[]) => mockPut(...args),
        },
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

describe('useHomePreferences hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useHomeCardPreferences', () => {
    it('should fetch card preferences successfully', async () => {
      const mockData = [
        { cardKey: 'foodplan', sortOrder: 0, isVisible: true },
        { cardKey: 'lists', sortOrder: 1, isVisible: true },
        { cardKey: 'bills', sortOrder: 2, isVisible: false },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHomeCardPreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('useUpdateHomeCardPreferences', () => {
    it('should send the reordered cards to the API', async () => {
      mockPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateHomeCardPreferences(), {
        wrapper: createWrapper(),
      })

      const cards = [
        { cardKey: 'lists', isVisible: true },
        { cardKey: 'foodplan', isVisible: false },
      ]

      await act(async () => {
        result.current.mutate(cards)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPut).toHaveBeenCalledWith({ cards })
    })

    it('should optimistically update the cached preferences before the request settles', async () => {
      let resolvePut: () => void = () => {}
      mockPut.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePut = resolve
          })
      )

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
      queryClient.setQueryData(['homeCardPreferences'], [
        { cardKey: 'foodplan', sortOrder: 0, isVisible: true },
        { cardKey: 'lists', sortOrder: 1, isVisible: true },
      ])
      const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
      Wrapper.displayName = 'TestQueryClientWrapper'

      const { result } = renderHook(() => useUpdateHomeCardPreferences(), {
        wrapper: Wrapper,
      })

      act(() => {
        result.current.mutate([
          { cardKey: 'lists', isVisible: false },
          { cardKey: 'foodplan', isVisible: true },
        ])
      })

      await waitFor(() => {
        expect(queryClient.getQueryData(['homeCardPreferences'])).toEqual([
          { cardKey: 'lists', sortOrder: 0, isVisible: false },
          { cardKey: 'foodplan', sortOrder: 1, isVisible: true },
        ])
      })

      resolvePut()
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should roll back the cache when the request fails', async () => {
      mockPut.mockRejectedValueOnce(new Error('failed'))

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
      const original = [{ cardKey: 'foodplan', sortOrder: 0, isVisible: true }]
      queryClient.setQueryData(['homeCardPreferences'], original)
      const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
      Wrapper.displayName = 'TestQueryClientWrapper'

      const { result } = renderHook(() => useUpdateHomeCardPreferences(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        result.current.mutate([{ cardKey: 'foodplan', isVisible: false }])
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(queryClient.getQueryData(['homeCardPreferences'])).toEqual(original)
    })
  })
})

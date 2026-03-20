import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useBills,
  useBillSummary,
  useBill,
  useBillPriceHistory,
  useCreateBill,
  useUpdateBill,
  useUpdateBillPrice,
  useDeleteBill,
  useAddBillPrice,
  useDeleteBillPrice,
} from '@/hooks/useBills'

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

const mockBill = {
  id: 1,
  name: 'Netflix',
  vendorId: 1,
  vendorName: 'Netflix Inc.',
  frequency: 'Monthly' as const,
  isAutomated: true,
  locationId: 1,
  locationName: 'Home',
  currentAmount: 99,
  monthlyEquivalent: 99,
  priceIncreased: false,
  createdOn: '2024-01-01T00:00:00Z',
}

describe('useBills hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useBills', () => {
    it('should fetch bills successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes([mockBill]))

      const { result } = renderHook(() => useBills(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([mockBill])
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/bills',
        expect.any(Object)
      )
    })

    it('should handle fetch error', async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useBills(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useBillSummary', () => {
    it('should fetch bill summary successfully', async () => {
      const mockSummary = { totalBills: 3, totalMonthlyEquivalent: 250, automatedCount: 2, manualCount: 1 }
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockSummary))

      const { result } = renderHook(() => useBillSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSummary)
    })
  })

  describe('useBill', () => {
    it('should fetch a single bill successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockBill))

      const { result } = renderHook(() => useBill(1), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockBill)
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/bills/1',
        expect.any(Object)
      )
    })

    it('should not fetch when id is 0', async () => {
      const { result } = renderHook(() => useBill(0), { wrapper: createWrapper() })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockAuthenticatedFetch).not.toHaveBeenCalled()
    })
  })

  describe('useBillPriceHistory', () => {
    it('should fetch price history successfully', async () => {
      const mockHistory = [
        { id: 1, billId: 1, amount: 99, effectiveDate: '2024-01-01T00:00:00Z', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, billId: 1, amount: 89, effectiveDate: '2023-01-01T00:00:00Z', previousAmount: null, createdOn: '2023-01-01T00:00:00Z' },
      ]
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockHistory))

      const { result } = renderHook(() => useBillPriceHistory(1), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockHistory)
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/bills/1/price-history',
        expect.any(Object)
      )
    })
  })

  describe('useCreateBill', () => {
    it('should create a bill successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(mockBill))

      const { result } = renderHook(() => useCreateBill(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({
          name: 'Netflix',
          frequency: 'Monthly',
          isAutomated: true,
          initialAmount: 99,
        })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [url, options] = mockAuthenticatedFetch.mock.calls[0]
      expect(url).toBe('http://localhost:5238/api/bills')
      expect(options.method).toBe('POST')
      const body = JSON.parse(options.body as string)
      expect(body).toMatchObject({
        name: 'Netflix',
        frequency: 'Monthly',
        isAutomated: true,
        initialAmount: 99,
      })
    })

    it('should handle create error', async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateBill(), { wrapper: createWrapper() })

      result.current.mutate({ name: 'Netflix', frequency: 'Monthly', isAutomated: true })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateBill', () => {
    it('should update a bill successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())

      const { result } = renderHook(() => useUpdateBill(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Netflix HD', frequency: 'Monthly', isAutomated: true })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [url, options] = mockAuthenticatedFetch.mock.calls[0]
      expect(url).toBe('http://localhost:5238/api/bills/1')
      expect(options.method).toBe('PUT')
      const body = JSON.parse(options.body as string)
      expect(body).toMatchObject({ name: 'Netflix HD' })
    })
  })

  describe('useDeleteBill', () => {
    it('should delete a bill successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())

      const { result } = renderHook(() => useDeleteBill(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate(1)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/bills/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('useAddBillPrice', () => {
    it('should add a price entry successfully', async () => {
      const newEntry = { id: 3, billId: 1, amount: 109, effectiveDate: '2025-01-01T00:00:00Z', createdOn: '2025-01-01T00:00:00Z' }
      mockAuthenticatedFetch.mockReturnValueOnce(jsonRes(newEntry))

      const { result } = renderHook(() => useAddBillPrice(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, amount: 109, effectiveDate: '2025-01-01T00:00:00Z' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [url, options] = mockAuthenticatedFetch.mock.calls[0]
      expect(url).toBe('http://localhost:5238/api/bills/1/price-history')
      expect(options.method).toBe('POST')
      const body = JSON.parse(options.body as string)
      expect(body).toMatchObject({ amount: 109 })
    })
  })

  describe('useDeleteBillPrice', () => {
    it('should delete a price entry successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())

      const { result } = renderHook(() => useDeleteBillPrice(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, historyId: 2 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        'http://localhost:5238/api/bills/1/price-history/2',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('useUpdateBillPrice', () => {
    it('should update a price entry successfully', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())

      const { result } = renderHook(() => useUpdateBillPrice(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, historyId: 2, amount: 119, effectiveDate: '2025-06-01T00:00:00Z' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [url, options] = mockAuthenticatedFetch.mock.calls[0]
      expect(url).toBe('http://localhost:5238/api/bills/1/price-history/2')
      expect(options.method).toBe('PUT')
      const body = JSON.parse(options.body as string)
      expect(body).toMatchObject({ amount: 119, effectiveDate: '2025-06-01T00:00:00Z' })
    })

    it('should invalidate related query caches on success', async () => {
      mockAuthenticatedFetch.mockReturnValueOnce(noContent())
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
      wrapper.displayName = 'TestQueryClientWrapper'

      const { result } = renderHook(() => useUpdateBillPrice(), { wrapper })

      await act(async () => {
        result.current.mutate({ billId: 1, historyId: 3, amount: 99, effectiveDate: '2025-01-01T00:00:00Z' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['billPriceHistory', 1] }))
      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['bill', 1] }))
      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['bills'] }))
      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['billSummary'] }))
    })

    it('should handle update error', async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useUpdateBillPrice(), { wrapper: createWrapper() })

      result.current.mutate({ billId: 1, historyId: 2, amount: 99, effectiveDate: '2025-01-01T00:00:00Z' })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })
})

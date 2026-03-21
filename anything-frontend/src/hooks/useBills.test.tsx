import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useBills,
  useBillSummary,
  useBill,
  useBillPriceHistory,
  useBillAttachments,
  useCreateBill,
  useUpdateBill,
  useUpdateBillPrice,
  useDeleteBill,
  useAddBillPrice,
  useDeleteBillPrice,
  useUploadBillAttachment,
  useUpdateBillAttachment,
  useDeleteBillAttachment,
} from '@/hooks/useBills'

const mockBillsGet = jest.fn()
const mockBillPost = jest.fn()
const mockSummaryGet = jest.fn()
const mockBillByIdGet = jest.fn()
const mockBillByIdPut = jest.fn()
const mockBillByIdDelete = jest.fn()
const mockPriceHistoryGet = jest.fn()
const mockPriceHistoryPost = jest.fn()
const mockPriceHistoryByIdPut = jest.fn()
const mockPriceHistoryByIdDelete = jest.fn()

const mockPriceHistoryById = jest.fn(() => ({
  put: mockPriceHistoryByIdPut,
  delete: mockPriceHistoryByIdDelete,
}))

const mockPriceHistory = {
  get: (...args: unknown[]) => mockPriceHistoryGet(...args),
  post: (...args: unknown[]) => mockPriceHistoryPost(...args),
  byHistoryId: (...args: unknown[]) => mockPriceHistoryById(...args),
}

const mockBillById = jest.fn(() => ({
  get: mockBillByIdGet,
  put: mockBillByIdPut,
  delete: mockBillByIdDelete,
  priceHistory: mockPriceHistory,
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      bills: {
        get: (...args: unknown[]) => mockBillsGet(...args),
        post: (...args: unknown[]) => mockBillPost(...args),
        summary: { get: (...args: unknown[]) => mockSummaryGet(...args) },
        byId: (...args: unknown[]) => mockBillById(...args),
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
      mockBillsGet.mockResolvedValueOnce([mockBill])

      const { result } = renderHook(() => useBills(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([mockBill])
      expect(mockBillsGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockBillsGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useBills(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useBillSummary', () => {
    it('should fetch bill summary successfully', async () => {
      const mockSummary = { totalBills: 3, totalMonthlyEquivalent: 250, automatedCount: 2, manualCount: 1 }
      mockSummaryGet.mockResolvedValueOnce(mockSummary)

      const { result } = renderHook(() => useBillSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSummary)
    })
  })

  describe('useBill', () => {
    it('should fetch a single bill successfully', async () => {
      mockBillByIdGet.mockResolvedValueOnce(mockBill)

      const { result } = renderHook(() => useBill(1), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockBill)
      expect(mockBillById).toHaveBeenCalledWith(1)
    })

    it('should not fetch when id is 0', async () => {
      const { result } = renderHook(() => useBill(0), { wrapper: createWrapper() })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockBillById).not.toHaveBeenCalled()
    })
  })

  describe('useBillPriceHistory', () => {
    it('should fetch price history successfully', async () => {
      const mockHistory = [
        { id: 1, billId: 1, amount: 99, effectiveDate: '2024-01-01T00:00:00Z', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, billId: 1, amount: 89, effectiveDate: '2023-01-01T00:00:00Z', previousAmount: null, createdOn: '2023-01-01T00:00:00Z' },
      ]
      mockPriceHistoryGet.mockResolvedValueOnce(mockHistory)

      const { result } = renderHook(() => useBillPriceHistory(1), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockHistory)
      expect(mockBillById).toHaveBeenCalledWith(1)
    })
  })

  describe('useCreateBill', () => {
    it('should create a bill successfully', async () => {
      mockBillPost.mockResolvedValueOnce(mockBill)

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

      expect(mockBillPost).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Netflix',
        frequency: 'Monthly',
        isAutomated: true,
        initialAmount: 99,
      }))
    })

    it('should handle create error', async () => {
      mockBillPost.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateBill(), { wrapper: createWrapper() })

      result.current.mutate({ name: 'Netflix', frequency: 'Monthly', isAutomated: true })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateBill', () => {
    it('should update a bill successfully', async () => {
      mockBillByIdPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateBill(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Netflix HD', frequency: 'Monthly', isAutomated: true })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockBillById).toHaveBeenCalledWith(1)
      expect(mockBillByIdPut).toHaveBeenCalledWith(expect.objectContaining({ name: 'Netflix HD' }))
    })
  })

  describe('useDeleteBill', () => {
    it('should delete a bill successfully', async () => {
      mockBillByIdDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteBill(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate(1)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockBillById).toHaveBeenCalledWith(1)
      expect(mockBillByIdDelete).toHaveBeenCalled()
    })
  })

  describe('useAddBillPrice', () => {
    it('should add a price entry successfully', async () => {
      mockPriceHistoryPost.mockResolvedValueOnce({ id: 3, billId: 1, amount: 109, effectiveDate: '2025-01-01T00:00:00Z', createdOn: '2025-01-01T00:00:00Z' })

      const { result } = renderHook(() => useAddBillPrice(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, amount: 109, effectiveDate: '2025-01-01T00:00:00Z' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockBillById).toHaveBeenCalledWith(1)
      expect(mockPriceHistoryPost).toHaveBeenCalledWith(expect.objectContaining({ amount: 109 }))
    })
  })

  describe('useDeleteBillPrice', () => {
    it('should delete a price entry successfully', async () => {
      mockPriceHistoryByIdDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteBillPrice(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, historyId: 2 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockBillById).toHaveBeenCalledWith(1)
      expect(mockPriceHistoryById).toHaveBeenCalledWith(2)
      expect(mockPriceHistoryByIdDelete).toHaveBeenCalled()
    })
  })

  describe('useUpdateBillPrice', () => {
    it('should update a price entry successfully', async () => {
      mockPriceHistoryByIdPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateBillPrice(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, historyId: 2, amount: 119, effectiveDate: '2025-06-01T00:00:00Z' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockBillById).toHaveBeenCalledWith(1)
      expect(mockPriceHistoryById).toHaveBeenCalledWith(2)
      expect(mockPriceHistoryByIdPut).toHaveBeenCalledWith(expect.objectContaining({ amount: 119, effectiveDate: new Date('2025-06-01T00:00:00Z') }))
    })

    it('should invalidate related query caches on success', async () => {
      mockPriceHistoryByIdPut.mockResolvedValueOnce(undefined)
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
      mockPriceHistoryByIdPut.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useUpdateBillPrice(), { wrapper: createWrapper() })

      result.current.mutate({ billId: 1, historyId: 2, amount: 99, effectiveDate: '2025-01-01T00:00:00Z' })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useBillAttachments', () => {
    it('should fetch attachments via fetch API', async () => {
      const mockAttachment = {
        id: 1,
        billId: 1,
        name: 'Invoice',
        contentType: 'application/pdf',
        url: 'http://minio/bills/doc.pdf',
        thumbnailUrl: null,
        createdOn: '2024-01-01T00:00:00Z',
      }
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockAttachment]),
      } as Response)

      const { result } = renderHook(() => useBillAttachments(1), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data![0].name).toBe('Invoice')
    })
  })

  describe('useUploadBillAttachment', () => {
    it('should upload attachment successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      const { result } = renderHook(() => useUploadBillAttachment(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, file: new File(['content'], 'invoice.pdf', { type: 'application/pdf' }) })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should handle upload error', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
      } as Response)

      const { result } = renderHook(() => useUploadBillAttachment(), { wrapper: createWrapper() })

      result.current.mutate({ billId: 1, file: new File(['content'], 'invoice.pdf', { type: 'application/pdf' }) })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteBillAttachment', () => {
    it('should delete attachment successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
      } as Response)

      const { result } = renderHook(() => useDeleteBillAttachment(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, attachmentId: 5 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useUpdateBillAttachment', () => {
    it('should update attachment name successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
      } as Response)

      const { result } = renderHook(() => useUpdateBillAttachment(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, attachmentId: 5, name: 'New Name' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

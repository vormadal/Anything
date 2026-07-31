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

const mockPriceHistoryById: jest.Mock = jest.fn(() => ({
  put: mockPriceHistoryByIdPut,
  delete: mockPriceHistoryByIdDelete,
}))

const mockPriceHistory = {
  get: (...args: unknown[]) => mockPriceHistoryGet(...args),
  post: (...args: unknown[]) => mockPriceHistoryPost(...args),
  byHistoryId: (...args: unknown[]) => mockPriceHistoryById(...args),
}

const mockAttachmentsGet = jest.fn()
const mockAttachmentsPost = jest.fn()
const mockAttachmentItemPut = jest.fn()
const mockAttachmentItemDelete = jest.fn()
const mockAttachmentDownloadGet = jest.fn()
const mockAttachmentItemById: jest.Mock = jest.fn(() => ({
  put: mockAttachmentItemPut,
  delete: mockAttachmentItemDelete,
  download: { get: mockAttachmentDownloadGet },
}))

const mockAttachments = {
  get: (...args: unknown[]) => mockAttachmentsGet(...args),
  post: (...args: unknown[]) => mockAttachmentsPost(...args),
  byAttachmentId: (...args: unknown[]) => mockAttachmentItemById(...args),
}

const mockBillById: jest.Mock = jest.fn(() => ({
  get: mockBillByIdGet,
  put: mockBillByIdPut,
  delete: mockBillByIdDelete,
  priceHistory: mockPriceHistory,
  attachments: mockAttachments,
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
  createMultipartBody: () => ({ addOrReplacePart: jest.fn() }),
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

  describe('useBillAttachments', () => {
    it('should fetch attachments via apiClient', async () => {
      const mockAttachment = {
        id: 1,
        billId: 1,
        name: 'Invoice',
        contentType: 'application/pdf',
        url: 'http://minio/bills/doc.pdf',
        thumbnailUrl: null,
        createdOn: '2024-01-01T00:00:00Z',
      }
      mockAttachmentsGet.mockResolvedValueOnce([mockAttachment])

      const { result } = renderHook(() => useBillAttachments(1), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data![0].name).toBe('Invoice')
    })
  })

  describe('useUploadBillAttachment', () => {
    it('should upload attachment successfully', async () => {
      mockAttachmentsPost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUploadBillAttachment(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, file: new File(['content'], 'invoice.pdf', { type: 'application/pdf' }) })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockBillById).toHaveBeenCalledWith(1)
      expect(mockAttachmentsPost).toHaveBeenCalled()
    })

    it('should handle upload error', async () => {
      mockAttachmentsPost.mockRejectedValueOnce(new Error('Upload failed'))

      const { result } = renderHook(() => useUploadBillAttachment(), { wrapper: createWrapper() })

      result.current.mutate({ billId: 1, file: new File(['content'], 'invoice.pdf', { type: 'application/pdf' }) })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })

    it('rejects a file over the 10 MB limit without calling the API', async () => {
      const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' })
      const { result } = renderHook(() => useUploadBillAttachment(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, file: bigFile })
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('too large')
      expect(mockAttachmentsPost).not.toHaveBeenCalled()
    })

    it('maps a 413 response to a friendly message', async () => {
      mockAttachmentsPost.mockRejectedValueOnce({ responseStatusCode: 413, message: 'Payload Too Large' })
      const { result } = renderHook(() => useUploadBillAttachment(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, file: new File(['content'], 'invoice.pdf', { type: 'application/pdf' }) })
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('File is too large. Please use a file under 10 MB.')
    })
  })

  describe('useDeleteBillAttachment', () => {
    it('should delete attachment successfully', async () => {
      mockAttachmentItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteBillAttachment(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, attachmentId: 5 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockAttachmentItemById).toHaveBeenCalledWith(5)
      expect(mockAttachmentItemDelete).toHaveBeenCalled()
    })
  })

  describe('useUpdateBillAttachment', () => {
    it('should update attachment name successfully', async () => {
      mockAttachmentItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateBillAttachment(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.mutate({ billId: 1, attachmentId: 5, name: 'New Name' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockAttachmentItemById).toHaveBeenCalledWith(5)
      expect(mockAttachmentItemPut).toHaveBeenCalledWith({ name: 'New Name' })
    })
  })
})

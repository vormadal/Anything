import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useCreateInventoryBox,
  useCreateInventoryItem,
  useCreateInventoryStorageUnit,
  useDeleteInventoryBox,
  useDeleteInventoryBoxAttachment,
  useDeleteInventoryItem,
  useDeleteInventoryItemAttachment,
  useDeleteInventoryStorageUnit,
  useDownloadInventoryItemAttachment,
  useInventoryBox,
  useInventoryBoxAttachments,
  useInventoryBoxes,
  useInventoryItem,
  useInventoryItemAttachments,
  useInventoryItems,
  useInventoryStorageUnit,
  useInventoryStorageUnits,
  useUpdateInventoryBox,
  useUpdateInventoryItem,
  useUpdateInventoryItemFields,
  useUpdateInventoryStorageUnit,
  useUploadInventoryItemAttachment,
} from '@/hooks/useInventory'

const mockUnitsGet = jest.fn()
const mockUnitsPost = jest.fn()
const mockUnitItemGet = jest.fn()
const mockUnitItemPut = jest.fn()
const mockUnitItemDelete = jest.fn()
const mockUnitAttachmentsGet = jest.fn()
const mockUnitById: jest.Mock = jest.fn(() => ({
  get: mockUnitItemGet,
  put: mockUnitItemPut,
  delete: mockUnitItemDelete,
  attachments: { get: mockUnitAttachmentsGet },
}))

const mockBoxesGet = jest.fn()
const mockBoxesPost = jest.fn()
const mockBoxItemGet = jest.fn()
const mockBoxItemPut = jest.fn()
const mockBoxItemDelete = jest.fn()
const mockBoxAttachmentsGet = jest.fn()
const mockBoxAttachmentDelete = jest.fn()
const mockBoxAttachmentById = jest.fn(() => ({ delete: mockBoxAttachmentDelete }))
const mockBoxById: jest.Mock = jest.fn(() => ({
  get: mockBoxItemGet,
  put: mockBoxItemPut,
  delete: mockBoxItemDelete,
  attachments: { get: mockBoxAttachmentsGet, byAttachmentId: mockBoxAttachmentById },
}))

const mockItemsGet = jest.fn()
const mockItemsPost = jest.fn()
const mockItemItemGet = jest.fn()
const mockItemItemPut = jest.fn()
const mockItemItemDelete = jest.fn()
const mockItemFieldsPut = jest.fn()
const mockItemAttachmentsGet = jest.fn()
const mockItemAttachmentsPost = jest.fn()
const mockItemAttachmentDelete = jest.fn()
const mockItemAttachmentDownloadGet = jest.fn()
const mockItemAttachmentById = jest.fn(() => ({
  delete: mockItemAttachmentDelete,
  download: { get: mockItemAttachmentDownloadGet },
}))
const mockItemById: jest.Mock = jest.fn(() => ({
  get: mockItemItemGet,
  put: mockItemItemPut,
  delete: mockItemItemDelete,
  fields: { put: mockItemFieldsPut },
  attachments: {
    get: mockItemAttachmentsGet,
    post: mockItemAttachmentsPost,
    byAttachmentId: mockItemAttachmentById,
  },
}))

const mockAddOrReplacePart = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      inventoryStorageUnits: {
        get: (...args: unknown[]) => mockUnitsGet(...args),
        post: (...args: unknown[]) => mockUnitsPost(...args),
        byId: (...args: unknown[]) => mockUnitById(...args),
      },
      inventoryBoxes: {
        get: (...args: unknown[]) => mockBoxesGet(...args),
        post: (...args: unknown[]) => mockBoxesPost(...args),
        byId: (...args: unknown[]) => mockBoxById(...args),
      },
      inventoryItems: {
        get: (...args: unknown[]) => mockItemsGet(...args),
        post: (...args: unknown[]) => mockItemsPost(...args),
        byId: (...args: unknown[]) => mockItemById(...args),
      },
    },
  },
  createMultipartBody: () => ({ addOrReplacePart: mockAddOrReplacePart }),
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

const place = { id: 1, name: 'Summerhouse', type: 'Cabin' }
const box = { id: 10, number: 4, storageUnitId: 1 }
const item = { id: 100, name: 'Christmas lights', boxId: 10, storageUnitId: 1 }

describe('useInventory hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('storage places', () => {
    it('fetches the places', async () => {
      mockUnitsGet.mockResolvedValueOnce([place])

      const { result } = renderHook(() => useInventoryStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([place])
    })

    it('returns an empty list when the API returns nothing', async () => {
      mockUnitsGet.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useInventoryStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([])
    })

    it('surfaces a fetch error', async () => {
      mockUnitsGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useInventoryStorageUnits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })

    it('fetches a single place', async () => {
      mockUnitItemGet.mockResolvedValueOnce(place)

      const { result } = renderHook(() => useInventoryStorageUnit(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUnitById).toHaveBeenCalledWith(1)
      expect(result.current.data).toEqual(place)
    })

    it('does not fetch a place without a valid id', () => {
      const { result } = renderHook(() => useInventoryStorageUnit(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockUnitItemGet).not.toHaveBeenCalled()
    })

    it('creates a place, sending an explicit null for a blank type', async () => {
      mockUnitsPost.mockResolvedValueOnce(place)

      const { result } = renderHook(() => useCreateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ name: 'Summerhouse' })

      expect(mockUnitsPost).toHaveBeenCalledWith({ name: 'Summerhouse', type: null, parentId: null })
    })

    it('updates a place', async () => {
      mockUnitItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ id: 1, name: 'Basement', type: 'Room', parentId: 2 })

      expect(mockUnitById).toHaveBeenCalledWith(1)
      expect(mockUnitItemPut).toHaveBeenCalledWith({ name: 'Basement', type: 'Room', parentId: 2 })
    })

    it('deletes a place', async () => {
      mockUnitItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync(1)

      expect(mockUnitById).toHaveBeenCalledWith(1)
      expect(mockUnitItemDelete).toHaveBeenCalled()
    })
  })

  describe('boxes', () => {
    it('fetches the boxes', async () => {
      mockBoxesGet.mockResolvedValueOnce([box])

      const { result } = renderHook(() => useInventoryBoxes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([box])
    })

    it('fetches a single box', async () => {
      mockBoxItemGet.mockResolvedValueOnce(box)

      const { result } = renderHook(() => useInventoryBox(10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockBoxById).toHaveBeenCalledWith(10)
    })

    it('creates a box, sending explicit nulls for label/description left blank', async () => {
      mockBoxesPost.mockResolvedValueOnce(box)

      const { result } = renderHook(() => useCreateInventoryBox(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ number: 4, storageUnitId: 1 })

      expect(mockBoxesPost).toHaveBeenCalledWith({
        number: 4,
        storageUnitId: 1,
        label: null,
        description: null,
      })
    })

    it('creates a box with a label and description', async () => {
      mockBoxesPost.mockResolvedValueOnce(box)

      const { result } = renderHook(() => useCreateInventoryBox(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        number: 4,
        storageUnitId: 1,
        label: 'Christmas decorations',
        description: 'Lights and ornaments',
      })

      expect(mockBoxesPost).toHaveBeenCalledWith({
        number: 4,
        storageUnitId: 1,
        label: 'Christmas decorations',
        description: 'Lights and ornaments',
      })
    })

    it('updates a box', async () => {
      mockBoxItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateInventoryBox(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ id: 10, number: 5 })

      expect(mockBoxItemPut).toHaveBeenCalledWith({
        number: 5,
        storageUnitId: null,
        label: null,
        description: null,
      })
    })

    it('deletes a box', async () => {
      mockBoxItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteInventoryBox(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync(10)

      expect(mockBoxById).toHaveBeenCalledWith(10)
      expect(mockBoxItemDelete).toHaveBeenCalled()
    })
  })

  describe('items', () => {
    it('fetches the items', async () => {
      mockItemsGet.mockResolvedValueOnce([item])

      const { result } = renderHook(() => useInventoryItems(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([item])
    })

    it('fetches a single item', async () => {
      mockItemItemGet.mockResolvedValueOnce(item)

      const { result } = renderHook(() => useInventoryItem(100), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockItemById).toHaveBeenCalledWith(100)
    })

    it('creates an item, sending explicit nulls for the fields left blank', async () => {
      mockItemsPost.mockResolvedValueOnce(item)

      const { result } = renderHook(() => useCreateInventoryItem(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ name: 'Christmas lights' })

      expect(mockItemsPost).toHaveBeenCalledWith({
        name: 'Christmas lights',
        description: null,
        boxId: null,
        storageUnitId: null,
        quantity: null,
        brand: null,
        model: null,
        serialNumber: null,
        purchasedOn: null,
        purchasePrice: null,
        warrantyExpiresOn: null,
        notes: null,
      })
    })

    it('creates an item with metadata, converting date strings to Date objects', async () => {
      mockItemsPost.mockResolvedValueOnce(item)

      const { result } = renderHook(() => useCreateInventoryItem(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        name: 'Drill',
        quantity: 2,
        brand: 'Bosch',
        model: 'PSB 750',
        serialNumber: 'SN-123',
        purchasedOn: '2024-01-15',
        purchasePrice: 49.99,
        warrantyExpiresOn: '2026-01-15',
        notes: 'Keep in the garage',
      })

      expect(mockItemsPost).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Drill',
          quantity: 2,
          brand: 'Bosch',
          model: 'PSB 750',
          serialNumber: 'SN-123',
          purchasedOn: new Date('2024-01-15'),
          purchasePrice: 49.99,
          warrantyExpiresOn: new Date('2026-01-15'),
          notes: 'Keep in the garage',
        })
      )
    })

    it('updates an item', async () => {
      mockItemItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateInventoryItem(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 100,
        name: 'Christmas lights',
        description: 'Warm white',
        boxId: 10,
        storageUnitId: 1,
      })

      expect(mockItemById).toHaveBeenCalledWith(100)
      expect(mockItemItemPut).toHaveBeenCalledWith({
        name: 'Christmas lights',
        description: 'Warm white',
        boxId: 10,
        storageUnitId: 1,
        quantity: null,
        brand: null,
        model: null,
        serialNumber: null,
        purchasedOn: null,
        purchasePrice: null,
        warrantyExpiresOn: null,
        notes: null,
      })
    })

    it('deletes an item', async () => {
      mockItemItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteInventoryItem(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync(100)

      expect(mockItemById).toHaveBeenCalledWith(100)
      expect(mockItemItemDelete).toHaveBeenCalled()
    })
  })

  describe('custom fields', () => {
    it('replaces the field list wholesale', async () => {
      const saved = [{ id: 1, label: 'Color', value: 'Blue', sortOrder: 0 }]
      mockItemFieldsPut.mockResolvedValueOnce(saved)

      const { result } = renderHook(() => useUpdateInventoryItemFields(100), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync([{ label: 'Color', value: 'Blue' }])

      expect(mockItemById).toHaveBeenCalledWith(100)
      expect(mockItemFieldsPut).toHaveBeenCalledWith({
        fields: [{ label: 'Color', value: 'Blue' }],
      })
    })
  })

  describe('attachments', () => {
    it('fetches an item’s attachments', async () => {
      const attachment = { id: 5, name: 'manual', contentType: 'application/pdf', kind: 'Manual' }
      mockItemAttachmentsGet.mockResolvedValueOnce([attachment])

      const { result } = renderHook(() => useInventoryItemAttachments(100), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([attachment])
    })

    it('returns an empty list when the API returns nothing', async () => {
      mockItemAttachmentsGet.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useInventoryItemAttachments(100), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([])
    })

    it('uploads a file as an ArrayBuffer, never the raw File', async () => {
      mockItemAttachmentsPost.mockResolvedValueOnce({ id: 1 })
      const file = new File(['contents'], 'manual.pdf', { type: 'application/pdf' })

      const { result } = renderHook(() => useUploadInventoryItemAttachment(100), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ file, kind: 'Manual' })

      expect(mockAddOrReplacePart).toHaveBeenCalledWith(
        'file',
        'application/pdf',
        expect.any(ArrayBuffer),
        undefined,
        'manual.pdf'
      )
      expect(mockItemAttachmentsPost).toHaveBeenCalledWith(
        expect.anything(),
        { queryParameters: { kind: 'Manual', name: undefined } }
      )
    })

    it('rejects a file over the 10 MB limit before calling the API', async () => {
      const oversized = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.pdf', {
        type: 'application/pdf',
      })

      const { result } = renderHook(() => useUploadInventoryItemAttachment(100), {
        wrapper: createWrapper(),
      })

      await expect(result.current.mutateAsync({ file: oversized })).rejects.toThrow(/too large/i)
      expect(mockItemAttachmentsPost).not.toHaveBeenCalled()
    })

    it('downloads an attachment as a named file', async () => {
      const originalCreateObjectURL = URL.createObjectURL
      const originalRevokeObjectURL = URL.revokeObjectURL
      URL.createObjectURL = jest.fn(() => 'blob:mock')
      URL.revokeObjectURL = jest.fn()
      mockItemAttachmentDownloadGet.mockResolvedValueOnce(new ArrayBuffer(4))

      const { result } = renderHook(() => useDownloadInventoryItemAttachment(100), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ attachmentId: 5, name: 'manual.pdf' })

      expect(mockItemAttachmentById).toHaveBeenCalledWith(5)
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')

      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    })

    it('deletes an item attachment', async () => {
      mockItemAttachmentDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteInventoryItemAttachment(100), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync(5)

      expect(mockItemAttachmentById).toHaveBeenCalledWith(5)
      expect(mockItemAttachmentDelete).toHaveBeenCalled()
    })

    it('fetches a box’s attachments through the box builder', async () => {
      mockBoxAttachmentsGet.mockResolvedValueOnce([])

      const { result } = renderHook(() => useInventoryBoxAttachments(10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockBoxById).toHaveBeenCalledWith(10)
    })

    it('deletes a box attachment through the box builder', async () => {
      mockBoxAttachmentDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteInventoryBoxAttachment(10), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync(7)

      expect(mockBoxAttachmentById).toHaveBeenCalledWith(7)
      expect(mockBoxAttachmentDelete).toHaveBeenCalled()
    })
  })
})

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useCreateInventoryBox,
  useCreateInventoryItem,
  useCreateInventoryStorageUnit,
  useDeleteInventoryBox,
  useDeleteInventoryItem,
  useDeleteInventoryStorageUnit,
  useInventoryBox,
  useInventoryBoxes,
  useInventoryItem,
  useInventoryItems,
  useInventoryStorageUnit,
  useInventoryStorageUnits,
  useUpdateInventoryBox,
  useUpdateInventoryItem,
  useUpdateInventoryStorageUnit,
} from '@/hooks/useInventory'

const mockUnitsGet = jest.fn()
const mockUnitsPost = jest.fn()
const mockUnitItemGet = jest.fn()
const mockUnitItemPut = jest.fn()
const mockUnitItemDelete = jest.fn()
const mockUnitById: jest.Mock = jest.fn(() => ({
  get: mockUnitItemGet,
  put: mockUnitItemPut,
  delete: mockUnitItemDelete,
}))

const mockBoxesGet = jest.fn()
const mockBoxesPost = jest.fn()
const mockBoxItemGet = jest.fn()
const mockBoxItemPut = jest.fn()
const mockBoxItemDelete = jest.fn()
const mockBoxById: jest.Mock = jest.fn(() => ({
  get: mockBoxItemGet,
  put: mockBoxItemPut,
  delete: mockBoxItemDelete,
}))

const mockItemsGet = jest.fn()
const mockItemsPost = jest.fn()
const mockItemItemGet = jest.fn()
const mockItemItemPut = jest.fn()
const mockItemItemDelete = jest.fn()
const mockItemById: jest.Mock = jest.fn(() => ({
  get: mockItemItemGet,
  put: mockItemItemPut,
  delete: mockItemItemDelete,
}))

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

      expect(mockUnitsPost).toHaveBeenCalledWith({ name: 'Summerhouse', type: null })
    })

    it('updates a place', async () => {
      mockUnitItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateInventoryStorageUnit(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ id: 1, name: 'Basement', type: 'Room' })

      expect(mockUnitById).toHaveBeenCalledWith(1)
      expect(mockUnitItemPut).toHaveBeenCalledWith({ name: 'Basement', type: 'Room' })
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

    it('creates a box', async () => {
      mockBoxesPost.mockResolvedValueOnce(box)

      const { result } = renderHook(() => useCreateInventoryBox(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ number: 4, storageUnitId: 1 })

      expect(mockBoxesPost).toHaveBeenCalledWith({ number: 4, storageUnitId: 1 })
    })

    it('updates a box', async () => {
      mockBoxItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateInventoryBox(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({ id: 10, number: 5 })

      expect(mockBoxItemPut).toHaveBeenCalledWith({ number: 5, storageUnitId: null })
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
      })
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
})

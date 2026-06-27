import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useShoppingLists,
  useCreateShoppingList,
  useDeleteShoppingList,
  useCompleteShoppingList,
  useShoppingListItems,
  useAddShoppingListItem,
  useUpdateShoppingListItem,
  useReorderShoppingListItems,
  useRemoveShoppingListItem,
  useUpdateShoppingList,
} from '@/hooks/useShoppingLists'

// Mock the apiClient module
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockDelete = jest.fn()
const mockPut = jest.fn()
const mockItemsGet = jest.fn()
const mockItemsPost = jest.fn()
const mockItemsItemPut = jest.fn()
const mockItemsItemDelete = jest.fn()
const mockItemsReorderPut = jest.fn()
const mockItemsItemById = jest.fn(() => ({ put: mockItemsItemPut, delete: mockItemsItemDelete }))
const mockCompletePost = jest.fn()
const mockItems = { get: mockItemsGet, post: mockItemsPost, byItemId: mockItemsItemById, reorder: { put: mockItemsReorderPut } }
const mockComplete = { post: mockCompletePost }
const mockById = jest.fn(() => ({ delete: mockDelete, get: mockGet, put: mockPut, items: mockItems, complete: mockComplete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      checklists: {
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

describe('useShoppingLists hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useShoppingLists', () => {
    it('should fetch shopping lists successfully', async () => {
      const mockData = [
        { id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Hardware', createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useShoppingLists(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useShoppingLists(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateShoppingList', () => {
    it('should create a shopping list successfully', async () => {
      const mockResponse = { id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateShoppingList(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'Groceries' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPost).toHaveBeenCalledWith({ name: 'Groceries', type: 1 })
    })

    it('should create a general checklist with type 0', async () => {
      const mockResponse = { id: 2, name: 'My Checklist', createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateShoppingList(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'My Checklist', type: 0 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPost).toHaveBeenCalledWith({ name: 'My Checklist', type: 0 })
    })

    it('should handle create error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateShoppingList(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'Groceries' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useDeleteShoppingList', () => {
    it('should delete a shopping list successfully', async () => {
      mockDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteShoppingList(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(1)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('useCompleteShoppingList', () => {
    it('should complete a shopping list', async () => {
      mockCompletePost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useCompleteShoppingList(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ id: 1, markUnchecked: true })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockCompletePost).toHaveBeenCalledWith({ markUnchecked: true })
    })
  })

  describe('useShoppingListItems', () => {
    it('should fetch items for a shopping list', async () => {
      const mockItems = [
        { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
        { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
      ]
      mockItemsGet.mockResolvedValueOnce(mockItems)

      const { result } = renderHook(() => useShoppingListItems(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockItems)
      expect(mockById).toHaveBeenCalledWith(1)
    })

    it('should not fetch when listId is 0', () => {
      const { result } = renderHook(() => useShoppingListItems(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockItemsGet).not.toHaveBeenCalled()
    })
  })

  describe('useAddShoppingListItem', () => {
    it('should add an item to a shopping list', async () => {
      const mockItem = { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }
      mockItemsPost.mockResolvedValueOnce(mockItem)

      const { result } = renderHook(() => useAddShoppingListItem(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'Milk' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockItemsPost).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk' }))
    })
  })

  describe('useUpdateShoppingListItem', () => {
    it('should update an item in a shopping list', async () => {
      mockItemsItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateShoppingListItem(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ itemId: 2, name: 'Milk', isChecked: true })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockItemsItemById).toHaveBeenCalledWith(2)
      expect(mockItemsItemPut).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk', isChecked: true }))
    })
  })

  describe('useRemoveShoppingListItem', () => {
    it('should remove an item from a shopping list', async () => {
      mockItemsItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useRemoveShoppingListItem(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(2)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockItemsItemById).toHaveBeenCalledWith(2)
      expect(mockItemsItemDelete).toHaveBeenCalled()
    })
  })

  describe('useReorderShoppingListItems', () => {
    it('should reorder items in a shopping list', async () => {
      mockItemsReorderPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useReorderShoppingListItems(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate([3, 1, 2])
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockItemsReorderPut).toHaveBeenCalledWith({ ids: [3, 1, 2] })
    })
  })

  describe('useUpdateShoppingList', () => {
    it('should update a shopping list name successfully', async () => {
      mockPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateShoppingList(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Updated Groceries' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockPut).toHaveBeenCalledWith({ name: 'Updated Groceries' })
    })

    it('should handle update error', async () => {
      mockPut.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useUpdateShoppingList(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, name: 'Updated Groceries' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})

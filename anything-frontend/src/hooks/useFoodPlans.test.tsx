import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useFoodPlans,
  useFoodPlan,
  useFoodPlanEntries,
  useCreateFoodPlan,
  useUpdateFoodPlan,
  useDeleteFoodPlan,
  useAddFoodPlanEntry,
  useUpdateFoodPlanEntry,
  useDeleteFoodPlanEntry,
  useAddFoodPlanToShoppingList,
} from '@/hooks/useFoodPlans'

// Mock the apiClient module
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPut = jest.fn()
const mockDelete = jest.fn()
const mockEntriesGet = jest.fn()
const mockEntriesPost = jest.fn()
const mockEntriesItemPut = jest.fn()
const mockEntriesItemDelete = jest.fn()
const mockEntriesItemById = jest.fn(() => ({ put: mockEntriesItemPut, delete: mockEntriesItemDelete }))
const mockEntries = { get: mockEntriesGet, post: mockEntriesPost, byId: mockEntriesItemById }
const mockAddToShoppingListPost = jest.fn()
const mockAddToShoppingList = { post: mockAddToShoppingListPost }
const mockById = jest.fn(() => ({
  get: mockGet,
  put: mockPut,
  delete: mockDelete,
  entries: mockEntries,
  addToShoppingList: mockAddToShoppingList,
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      foodPlans: {
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

describe('useFoodPlans hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useFoodPlans', () => {
    it('should fetch food plans successfully', async () => {
      const mockData = [
        { id: 1, name: 'Week 1', weekStart: '2026-03-02T00:00:00Z' },
        { id: 2, name: 'Week 2', weekStart: '2026-03-09T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useFoodPlans(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useFoodPlans(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useFoodPlan', () => {
    it('should fetch a single food plan successfully', async () => {
      const mockData = { id: 1, name: 'Week 1', weekStart: '2026-03-02T00:00:00Z' }
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useFoodPlan(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockById).toHaveBeenCalledWith(1)
    })

    it('should not fetch when id is 0', () => {
      const { result } = renderHook(() => useFoodPlan(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockGet).not.toHaveBeenCalled()
    })
  })

  describe('useFoodPlanEntries', () => {
    it('should fetch entries for a food plan', async () => {
      const mockData = [
        { id: 1, foodPlanId: 1, recipeId: 1, name: 'Pasta', dayOfWeek: 0 },
        { id: 2, foodPlanId: 1, recipeId: null, name: 'Salad', dayOfWeek: 1 },
      ]
      mockEntriesGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useFoodPlanEntries(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockById).toHaveBeenCalledWith(1)
    })

    it('should not fetch when foodPlanId is 0', () => {
      const { result } = renderHook(() => useFoodPlanEntries(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockEntriesGet).not.toHaveBeenCalled()
    })
  })

  describe('useCreateFoodPlan', () => {
    it('should create a food plan successfully', async () => {
      const mockResponse = { id: 1, name: 'Week 1', weekStart: '2026-03-02T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateFoodPlan(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'Week 1', weekStart: new Date('2026-03-02T00:00:00Z') })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPost).toHaveBeenCalledWith({
        name: 'Week 1',
        weekStart: new Date('2026-03-02T00:00:00Z'),
      })
    })

    it('should handle create error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateFoodPlan(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'Week 1', weekStart: new Date('2026-03-02T00:00:00Z') })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateFoodPlan', () => {
    it('should update a food plan successfully', async () => {
      mockPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateFoodPlan(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Updated Week', weekStart: new Date('2026-03-09T00:00:00Z') })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockPut).toHaveBeenCalledWith({ name: 'Updated Week', weekStart: new Date('2026-03-09T00:00:00Z') })
    })
  })

  describe('useDeleteFoodPlan', () => {
    it('should delete a food plan successfully', async () => {
      mockDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteFoodPlan(), {
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

  describe('useAddFoodPlanEntry', () => {
    it('should add an entry with a recipe', async () => {
      const mockEntry = { id: 1, foodPlanId: 1, recipeId: 5, name: 'Pasta', dayOfWeek: 0 }
      mockEntriesPost.mockResolvedValueOnce(mockEntry)

      const { result } = renderHook(() => useAddFoodPlanEntry(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'Pasta', recipeId: 5, dayOfWeek: 0 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockEntriesPost).toHaveBeenCalledWith({
        name: 'Pasta',
        recipeId: 5,
        dayOfWeek: 0,
      })
    })

    it('should add an entry without a recipe', async () => {
      const mockEntry = { id: 2, foodPlanId: 1, recipeId: null, name: 'Salad', dayOfWeek: 1 }
      mockEntriesPost.mockResolvedValueOnce(mockEntry)

      const { result } = renderHook(() => useAddFoodPlanEntry(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'Salad', dayOfWeek: 1 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockEntriesPost).toHaveBeenCalledWith({
        name: 'Salad',
        recipeId: undefined,
        dayOfWeek: 1,
      })
    })
  })

  describe('useUpdateFoodPlanEntry', () => {
    it('should update a food plan entry successfully', async () => {
      mockEntriesItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateFoodPlanEntry(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ entryId: 2, name: 'Updated Salad', dayOfWeek: 2 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockEntriesItemById).toHaveBeenCalledWith(2)
      expect(mockEntriesItemPut).toHaveBeenCalledWith({
        name: 'Updated Salad',
        recipeId: undefined,
        dayOfWeek: 2,
      })
    })
  })

  describe('useDeleteFoodPlanEntry', () => {
    it('should delete a food plan entry successfully', async () => {
      mockEntriesItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteFoodPlanEntry(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(2)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockEntriesItemById).toHaveBeenCalledWith(2)
      expect(mockEntriesItemDelete).toHaveBeenCalled()
    })
  })

  describe('useAddFoodPlanToShoppingList', () => {
    it('should add food plan ingredients to a shopping list', async () => {
      mockAddToShoppingListPost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAddFoodPlanToShoppingList(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(5)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockAddToShoppingListPost).toHaveBeenCalledWith({ shoppingListId: 5 })
    })
  })
})

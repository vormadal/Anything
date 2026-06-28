import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useFoodPlanSettings,
  useUpdateFoodPlanSettings,
  useFoodPlanEntries,
  useAddFoodPlanEntry,
  useUpdateFoodPlanEntry,
  useDeleteFoodPlanEntry,
  useAddFoodPlanToShoppingList,
  useFoodPlanNotes,
  useUpsertFoodPlanNote,
  useDeleteFoodPlanNote,
} from '@/hooks/useFoodPlans'

// Mock the apiClient module
const mockSettingsGet = jest.fn()
const mockSettingsPut = jest.fn()
const mockEntriesGet = jest.fn()
const mockEntriesPost = jest.fn()
const mockEntriesItemPut = jest.fn()
const mockEntriesItemDelete = jest.fn()
const mockEntriesItemById = jest.fn(() => ({ put: mockEntriesItemPut, delete: mockEntriesItemDelete }))
const mockAddToShoppingListPost = jest.fn()
const mockNotesGet = jest.fn()
const mockNotesPut = jest.fn()
const mockNotesDelete = jest.fn()
const mockNotesByNoteId = jest.fn(() => ({ delete: mockNotesDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      foodPlan: {
        settings: {
          get: (...args: unknown[]) => mockSettingsGet(...args),
          put: (...args: unknown[]) => mockSettingsPut(...args),
        },
        entries: {
          get: (...args: unknown[]) => mockEntriesGet(...args),
          post: (...args: unknown[]) => mockEntriesPost(...args),
          byEntryId: (...args: unknown[]) => mockEntriesItemById(...args),
        },
        notes: {
          get: (...args: unknown[]) => mockNotesGet(...args),
          put: (...args: unknown[]) => mockNotesPut(...args),
          byNoteId: (...args: unknown[]) => mockNotesByNoteId(...args),
        },
        addToShoppingList: {
          post: (...args: unknown[]) => mockAddToShoppingListPost(...args),
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

describe('useFoodPlans hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useFoodPlanSettings', () => {
    it('should fetch food plan settings successfully', async () => {
      const mockData = { id: 1, activeDays: 31 }
      mockSettingsGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useFoodPlanSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockSettingsGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockSettingsGet.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useFoodPlanSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateFoodPlanSettings', () => {
    it('should update settings successfully', async () => {
      mockSettingsPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateFoodPlanSettings(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ activeDays: 127 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSettingsPut).toHaveBeenCalledWith({ activeDays: 127 })
    })
  })

  describe('useFoodPlanEntries', () => {
    it('should fetch entries by date range', async () => {
      const mockData = [
        { id: 1, name: 'Pasta', date: '2026-03-09T00:00:00Z' },
        { id: 2, name: 'Salad', date: '2026-03-10T00:00:00Z' },
      ]
      mockEntriesGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(
        () => useFoodPlanEntries('2026-03-09T00:00:00Z', '2026-03-15T23:59:59Z'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockEntriesGet).toHaveBeenCalledWith({
        queryParameters: {
          startDate: new Date('2026-03-09T00:00:00Z'),
          endDate: new Date('2026-03-15T23:59:59Z'),
        },
      })
    })

    it('should not fetch when dates are empty', () => {
      const { result } = renderHook(() => useFoodPlanEntries('', ''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockEntriesGet).not.toHaveBeenCalled()
    })
  })

  describe('useAddFoodPlanEntry', () => {
    it('should add an entry with a recipe', async () => {
      const mockEntry = { id: 1, name: 'Pasta', recipeId: 5, date: '2026-03-09T00:00:00Z' }
      mockEntriesPost.mockResolvedValueOnce(mockEntry)

      const { result } = renderHook(() => useAddFoodPlanEntry(), {
        wrapper: createWrapper(),
      })

      const date = new Date('2026-03-09T00:00:00Z')
      await act(async () => {
        result.current.mutate({ name: 'Pasta', recipeId: 5, date })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockEntriesPost).toHaveBeenCalledWith({
        name: 'Pasta',
        recipeId: 5,
        date,
      })
    })

    it('should add an entry without a recipe', async () => {
      const mockEntry = { id: 2, name: 'Salad', date: '2026-03-10T00:00:00Z' }
      mockEntriesPost.mockResolvedValueOnce(mockEntry)

      const { result } = renderHook(() => useAddFoodPlanEntry(), {
        wrapper: createWrapper(),
      })

      const date = new Date('2026-03-10T00:00:00Z')
      await act(async () => {
        result.current.mutate({ name: 'Salad', date })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockEntriesPost).toHaveBeenCalledWith({
        name: 'Salad',
        recipeId: undefined,
        date,
      })
    })
  })

  describe('useUpdateFoodPlanEntry', () => {
    it('should update a food plan entry successfully', async () => {
      mockEntriesItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateFoodPlanEntry(), {
        wrapper: createWrapper(),
      })

      const date = new Date('2026-03-11T00:00:00Z')
      await act(async () => {
        result.current.mutate({ entryId: 2, name: 'Updated Salad', date })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockEntriesItemById).toHaveBeenCalledWith(2)
      expect(mockEntriesItemPut).toHaveBeenCalledWith({
        name: 'Updated Salad',
        recipeId: undefined,
        date,
      })
    })
  })

  describe('useDeleteFoodPlanEntry', () => {
    it('should delete a food plan entry successfully', async () => {
      mockEntriesItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteFoodPlanEntry(), {
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

      const { result } = renderHook(() => useAddFoodPlanToShoppingList(), {
        wrapper: createWrapper(),
      })

      const startDate = new Date('2026-03-09T00:00:00Z')
      const endDate = new Date('2026-03-15T00:00:00Z')
      await act(async () => {
        result.current.mutate({ shoppingListId: 5, startDate, endDate })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockAddToShoppingListPost).toHaveBeenCalledWith({
        shoppingListId: 5,
        startDate,
        endDate,
        recipeMultipliers: undefined,
      })
    })

    it('should include recipe multipliers when provided', async () => {
      mockAddToShoppingListPost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAddFoodPlanToShoppingList(), {
        wrapper: createWrapper(),
      })

      const startDate = new Date('2026-03-09T00:00:00Z')
      const endDate = new Date('2026-03-15T00:00:00Z')
      const recipeMultipliers = [{ recipeId: 1, multiplier: 2 }]
      await act(async () => {
        result.current.mutate({ shoppingListId: 5, startDate, endDate, recipeMultipliers })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockAddToShoppingListPost).toHaveBeenCalledWith({
        shoppingListId: 5,
        startDate,
        endDate,
        recipeMultipliers,
      })
    })
  })

  describe('useFoodPlanNotes', () => {
    it('should fetch notes by date range via the typed client', async () => {
      const mockNotes = [{ id: 1, date: '2026-03-10', note: 'Eating at friends' }]
      mockNotesGet.mockResolvedValueOnce(mockNotes)

      const { result } = renderHook(
        () => useFoodPlanNotes('2026-03-10', '2026-03-16'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockNotes)
      const queryParameters = (
        mockNotesGet.mock.calls[0][0] as {
          queryParameters: { startDate: unknown; endDate: unknown }
        }
      ).queryParameters
      // The hook passes Kiota DateOnly instances, serialized as date-only "yyyy-MM-dd".
      expect(String(queryParameters.startDate)).toBe('2026-03-10')
      expect(String(queryParameters.endDate)).toBe('2026-03-16')
    })

    it('should not fetch when dates are empty', () => {
      const { result } = renderHook(
        () => useFoodPlanNotes('', ''),
        { wrapper: createWrapper() }
      )

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockNotesGet).not.toHaveBeenCalled()
    })
  })

  describe('useUpsertFoodPlanNote', () => {
    it('should upsert a note for a specific date via the typed client', async () => {
      mockNotesPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpsertFoodPlanNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ date: '2026-03-10', note: 'Leftovers' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockNotesPut).toHaveBeenCalledTimes(1)
      const [body, config] = mockNotesPut.mock.calls[0] as [
        { note: string },
        { queryParameters: { date: unknown } },
      ]
      expect(body).toEqual({ note: 'Leftovers' })
      // The date is passed as a Kiota DateOnly query parameter.
      expect(String(config.queryParameters.date)).toBe('2026-03-10')
    })
  })

  describe('useDeleteFoodPlanNote', () => {
    it('should delete a note by id via the typed client', async () => {
      mockNotesDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteFoodPlanNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(42)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockNotesByNoteId).toHaveBeenCalledWith(42)
      expect(mockNotesDelete).toHaveBeenCalledTimes(1)
    })
  })
})

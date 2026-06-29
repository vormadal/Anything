import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useRecipes,
  useRecipe,
  useTopRecipeTags,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useRecipeIngredients,
  useAddRecipeIngredient,
  useUpdateRecipeIngredient,
  useDeleteRecipeIngredient,
  useAddRecipeStep,
  useUpdateRecipeStep,
  useDeleteRecipeStep,
  useUploadRecipeImage,
  useDeleteRecipeImage,
  useAddIngredientsToShoppingList,
  useReimportRecipe,
} from '@/hooks/useRecipes'

// Mock the apiClient module
const mockRecipesListGet = jest.fn()
const mockTagsListGet = jest.fn()
const mockRecipeGet = jest.fn()
const mockGet = mockRecipeGet
const mockPost = jest.fn()
const mockDelete = jest.fn()
const mockPut = jest.fn()
const mockIngredientsGet = jest.fn()
const mockIngredientsPost = jest.fn()
const mockIngredientsItemPut = jest.fn()
const mockIngredientsItemDelete = jest.fn()
const mockIngredientsItemById: jest.Mock = jest.fn(() => ({ put: mockIngredientsItemPut, delete: mockIngredientsItemDelete }))
const mockIngredientsReorderPut = jest.fn()
const mockIngredientsReorder = { put: mockIngredientsReorderPut }
const mockIngredients = { get: mockIngredientsGet, post: mockIngredientsPost, byIngredientId: mockIngredientsItemById, reorder: mockIngredientsReorder }
const mockStepsGet = jest.fn()
const mockStepsPost = jest.fn()
const mockStepsItemById: jest.Mock = jest.fn(() => ({ put: jest.fn(), delete: jest.fn() }))
const mockStepsReorderPut = jest.fn()
const mockStepsReorder = { put: mockStepsReorderPut }
const mockSteps = { get: mockStepsGet, post: mockStepsPost, byStepId: mockStepsItemById, reorder: mockStepsReorder }
const mockImagesGet = jest.fn()
const mockImagesPost = jest.fn()
const mockImagesItemById: jest.Mock = jest.fn(() => ({ delete: jest.fn() }))
const mockImagesUploadPost = jest.fn()
const mockImagesUpload = { post: mockImagesUploadPost }
const mockImages = { get: mockImagesGet, post: mockImagesPost, byImageId: mockImagesItemById, upload: mockImagesUpload }
const mockAddToShoppingListPost = jest.fn()
const mockAddToShoppingList = { post: mockAddToShoppingListPost }
const mockReimportPost = jest.fn()
const mockReimport = { post: mockReimportPost }
const mockTagsGet = jest.fn()
const mockTagsPost = jest.fn()
const mockTagsItemDelete = jest.fn()
const mockTagsItemById: jest.Mock = jest.fn(() => ({ delete: mockTagsItemDelete }))
const mockTags = { get: mockTagsGet, post: mockTagsPost, byTagId: mockTagsItemById }
const mockById: jest.Mock = jest.fn(() => ({
  get: mockGet,
  put: mockPut,
  delete: mockDelete,
  ingredients: mockIngredients,
  steps: mockSteps,
  images: mockImages,
  addToShoppingList: mockAddToShoppingList,
  tags: mockTags,
  reimport: mockReimport,
}))

const mockParseUrlPost = jest.fn()
const mockImportPost = jest.fn()

// Mock MultipartBody via the createMultipartBody factory exported from apiClient
const mockMultipartBodyInstance = { addOrReplacePart: jest.fn() }

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: {
        get: (...args: unknown[]) => mockRecipesListGet(...args),
        post: (...args: unknown[]) => mockPost(...args),
        byId: (...args: unknown[]) => mockById(...args),
        parseUrl: { post: (...args: unknown[]) => mockParseUrlPost(...args) },
        importEscaped: { post: (...args: unknown[]) => mockImportPost(...args) },
        tags: { get: (...args: unknown[]) => mockTagsListGet(...args) },
      },
    },
  },
  createMultipartBody: () => mockMultipartBodyInstance,
  HOUSEHOLD_ID_KEY: 'householdId',
  HOUSEHOLD_HEADER: 'X-Household-Id',
}))

jest.mock('@/lib/householdUtils', () => ({
  getHouseholdHeader: () => ({}),
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

describe('useRecipes hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default list responses for query hooks backed by the generated client
    mockRecipesListGet.mockResolvedValue([])
    mockTagsListGet.mockResolvedValue([])
  })

  describe('useRecipes', () => {
    it('should fetch recipes successfully', async () => {
      const mockData = [
        { id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Salad', createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockRecipesListGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockRecipesListGet).toHaveBeenCalledTimes(1)
      expect(mockRecipesListGet).toHaveBeenCalledWith({
        queryParameters: { search: undefined, tag: undefined },
      })
    })

    it('passes search and tag as query parameters', async () => {
      mockRecipesListGet.mockResolvedValueOnce([])

      const { result } = renderHook(() => useRecipes('pasta', 'dinner'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockRecipesListGet).toHaveBeenCalledWith({
        queryParameters: { search: 'pasta', tag: 'dinner' },
      })
    })

    it('refetches on every mount so a freshly created recipe shows on return (issue #571)', async () => {
      // First mount: empty list (e.g. before a recipe is created elsewhere)
      mockRecipesListGet.mockResolvedValueOnce([])
      // Second mount (returning to the list): backend now has the new recipe
      const created = [{ id: 1, name: 'Fresh Recipe', createdOn: '2024-01-03T00:00:00Z' }]
      mockRecipesListGet.mockResolvedValueOnce(created)

      // A shared client so the cached query survives the unmount/remount, mirroring
      // navigating away from and back to the recipe list page.
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 60 * 1000 },
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const first = renderHook(() => useRecipes(), { wrapper })
      await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
      expect(first.result.current.data).toEqual([])
      first.unmount()

      // Remount: refetchOnMount: "always" must trigger a fresh fetch even though
      // the cached data is still within staleTime.
      const second = renderHook(() => useRecipes(), { wrapper })
      await waitFor(() => expect(second.result.current.data).toEqual(created))
      expect(mockRecipesListGet).toHaveBeenCalledTimes(2)
    })

    it('should handle fetch error', async () => {
      mockRecipesListGet.mockRejectedValueOnce(new Error('Failed to fetch recipes: 500'))

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useTopRecipeTags', () => {
    it('maps the response to name/count pairs with the requested count', async () => {
      mockTagsListGet.mockResolvedValueOnce([
        { name: 'dinner', count: 5 },
        { name: 'quick', count: 2 },
      ])

      const { result } = renderHook(() => useTopRecipeTags(5), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([
        { name: 'dinner', count: 5 },
        { name: 'quick', count: 2 },
      ])
      expect(mockTagsListGet).toHaveBeenCalledWith({ queryParameters: { count: 5 } })
    })

    it('coerces null name/count and a null list to safe defaults', async () => {
      mockTagsListGet.mockResolvedValueOnce([{ name: null, count: null }])

      const { result } = renderHook(() => useTopRecipeTags(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([{ name: '', count: 0 }])
      expect(mockTagsListGet).toHaveBeenCalledWith({ queryParameters: { count: 10 } })
    })
  })

  describe('useReimportRecipe', () => {
    it('posts the reimport flags through the generated client', async () => {
      mockReimportPost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useReimportRecipe(7), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          importName: true,
          importIngredients: false,
          importSteps: true,
          importImages: false,
        })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(7)
      expect(mockReimportPost).toHaveBeenCalledWith({
        importName: true,
        importIngredients: false,
        importSteps: true,
        importImages: false,
      })
    })

    it('surfaces the Kiota status code on the thrown error', async () => {
      mockReimportPost.mockRejectedValueOnce(
        Object.assign(new Error('Gone'), { responseStatusCode: 410 })
      )

      const { result } = renderHook(() => useReimportRecipe(7), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        importName: true,
        importIngredients: true,
        importSteps: true,
        importImages: true,
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect((result.current.error as { status?: number }).status).toBe(410)
    })

    it('rethrows non-Kiota errors unchanged', async () => {
      const networkError = new Error('Network down')
      mockReimportPost.mockRejectedValueOnce(networkError)

      const { result } = renderHook(() => useReimportRecipe(7), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        importName: true,
        importIngredients: true,
        importSteps: true,
        importImages: true,
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBe(networkError)
      expect((result.current.error as { status?: number }).status).toBeUndefined()
    })
  })

  describe('useCreateRecipe', () => {
    it('should create a recipe successfully', async () => {
      const mockResponse = { id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateRecipe(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'Pasta' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPost).toHaveBeenCalledWith({ name: 'Pasta', link: undefined, notes: undefined, cookTimeMinutes: undefined, servings: undefined, servingsType: undefined })
    })

    it('should create a recipe with time and servings', async () => {
      const mockResponse = { id: 1, name: 'Pancakes', cookTimeMinutes: 20, servings: 8, servingsType: 'Pieces', createdOn: '2024-01-01T00:00:00Z' }
      mockPost.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useCreateRecipe(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'Pancakes', cookTimeMinutes: 20, servings: 8, servingsType: 'Pieces' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({ cookTimeMinutes: 20, servings: 8, servingsType: 'Pieces' }))
    })

    it('should handle create error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(() => useCreateRecipe(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'Pasta' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useDeleteRecipe', () => {
    it('should delete a recipe successfully', async () => {
      mockDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteRecipe(), {
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

  describe('useRecipeIngredients', () => {
    it('should fetch ingredients for a recipe', async () => {
      const mockIngredientData = [
        { id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 },
        { id: 2, name: 'Eggs', amount: 3, unit: null, recipeId: 1 },
      ]
      mockIngredientsGet.mockResolvedValueOnce(mockIngredientData)

      const { result } = renderHook(() => useRecipeIngredients(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockIngredientData)
      expect(mockById).toHaveBeenCalledWith(1)
    })

    it('should not fetch when recipeId is 0', () => {
      const { result } = renderHook(() => useRecipeIngredients(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockIngredientsGet).not.toHaveBeenCalled()
    })
  })

  describe('useAddRecipeIngredient', () => {
    it('should add an ingredient to a recipe', async () => {
      const mockIngredient = { id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 }
      mockIngredientsPost.mockResolvedValueOnce(mockIngredient)

      const { result } = renderHook(() => useAddRecipeIngredient(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ name: 'Flour', amount: 2, unit: 'cups' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockIngredientsPost).toHaveBeenCalledWith({
        name: 'Flour',
        amount: 2,
        unit: 'cups',
        group: undefined,
      })
    })
  })

  describe('useAddRecipeStep', () => {
    it('should add a step to a recipe', async () => {
      const mockStep = { id: 1, text: 'Mix ingredients', order: 1, recipeId: 1 }
      mockStepsPost.mockResolvedValueOnce(mockStep)

      const { result } = renderHook(() => useAddRecipeStep(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ text: 'Mix ingredients', order: 1 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockStepsPost).toHaveBeenCalledWith({ text: 'Mix ingredients', order: 1 })
    })
  })

  describe('useAddIngredientsToShoppingList', () => {
    it('should add ingredients to a shopping list', async () => {
      mockAddToShoppingListPost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAddIngredientsToShoppingList(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ shoppingListId: 5 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockAddToShoppingListPost).toHaveBeenCalledWith({ shoppingListId: 5 })
    })
  })

  describe('useRecipe', () => {
    it('should fetch a single recipe successfully', async () => {
      const mockData = { id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useRecipe(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockById).toHaveBeenCalledWith(1)
    })

    it('should not fetch when id is 0', () => {
      const { result } = renderHook(() => useRecipe(0), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockGet).not.toHaveBeenCalled()
    })
  })

  describe('useUpdateRecipe', () => {
    it('should update a recipe successfully', async () => {
      mockPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateRecipe(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Updated Pasta', link: null, notes: null })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockPut).toHaveBeenCalledWith({ name: 'Updated Pasta', link: null, notes: null, cookTimeMinutes: undefined, servings: undefined, servingsType: undefined })
    })

    it('should update a recipe with time and servings fields', async () => {
      mockPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateRecipe(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ id: 1, name: 'Dinner for 4', cookTimeMinutes: 45, servings: 4, servingsType: 'People' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ cookTimeMinutes: 45, servings: 4, servingsType: 'People' }))
    })
  })

  describe('useUpdateRecipeIngredient', () => {
    it('should update an ingredient successfully', async () => {
      mockIngredientsItemPut.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUpdateRecipeIngredient(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ ingredientId: 2, name: 'Sugar', amount: 1, unit: 'cup', group: null })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockIngredientsItemById).toHaveBeenCalledWith(2)
      expect(mockIngredientsItemPut).toHaveBeenCalledWith({ name: 'Sugar', amount: 1, unit: 'cup', group: null })
    })
  })

  describe('useDeleteRecipeIngredient', () => {
    it('should delete an ingredient successfully', async () => {
      mockIngredientsItemDelete.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteRecipeIngredient(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(2)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockIngredientsItemById).toHaveBeenCalledWith(2)
      expect(mockIngredientsItemDelete).toHaveBeenCalled()
    })
  })

  describe('useUpdateRecipeStep', () => {
    it('should update a step successfully', async () => {
      const mockStepPut = jest.fn().mockResolvedValueOnce(undefined)
      mockStepsItemById.mockReturnValueOnce({ put: mockStepPut, delete: jest.fn() })

      const { result } = renderHook(() => useUpdateRecipeStep(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({ stepId: 2, text: 'Updated step', order: 1 })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockStepsItemById).toHaveBeenCalledWith(2)
      expect(mockStepPut).toHaveBeenCalledWith({ text: 'Updated step', order: 1 })
    })
  })

  describe('useDeleteRecipeStep', () => {
    it('should delete a step successfully', async () => {
      const mockStepDelete = jest.fn().mockResolvedValueOnce(undefined)
      mockStepsItemById.mockReturnValueOnce({ put: jest.fn(), delete: mockStepDelete })

      const { result } = renderHook(() => useDeleteRecipeStep(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(2)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockStepsItemById).toHaveBeenCalledWith(2)
      expect(mockStepDelete).toHaveBeenCalled()
    })
  })

  describe('useUploadRecipeImage', () => {
    it('should upload an image successfully', async () => {
      mockImagesUploadPost.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUploadRecipeImage(1), {
        wrapper: createWrapper(),
      })

      const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })

      await act(async () => {
        result.current.mutate(file)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockImagesUploadPost).toHaveBeenCalled()
    })
  })

  describe('useDeleteRecipeImage', () => {
    it('should delete an image successfully', async () => {
      const mockImageDelete = jest.fn().mockResolvedValueOnce(undefined)
      mockImagesItemById.mockReturnValueOnce({ delete: mockImageDelete })

      const { result } = renderHook(() => useDeleteRecipeImage(1), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate(2)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockImagesItemById).toHaveBeenCalledWith(2)
      expect(mockImageDelete).toHaveBeenCalled()
    })
  })
})

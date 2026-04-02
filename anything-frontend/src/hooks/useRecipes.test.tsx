import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useRecipes,
  useRecipe,
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
} from '@/hooks/useRecipes'

// Mock fetch globally for hooks that use it directly
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock the apiClient module (used by hooks other than useRecipes/useTopRecipeTags)
const mockRecipeGet = jest.fn()
const mockGet = mockRecipeGet
const mockPost = jest.fn()
const mockDelete = jest.fn()
const mockPut = jest.fn()
const mockIngredientsGet = jest.fn()
const mockIngredientsPost = jest.fn()
const mockIngredientsItemPut = jest.fn()
const mockIngredientsItemDelete = jest.fn()
const mockIngredientsItemById = jest.fn(() => ({ put: mockIngredientsItemPut, delete: mockIngredientsItemDelete }))
const mockIngredients = { get: mockIngredientsGet, post: mockIngredientsPost, byIngredientId: mockIngredientsItemById }
const mockStepsGet = jest.fn()
const mockStepsPost = jest.fn()
const mockStepsItemById = jest.fn(() => ({ put: jest.fn(), delete: jest.fn() }))
const mockSteps = { get: mockStepsGet, post: mockStepsPost, byStepId: mockStepsItemById }
const mockImagesGet = jest.fn()
const mockImagesPost = jest.fn()
const mockImagesItemById = jest.fn(() => ({ delete: jest.fn() }))
const mockImages = { get: mockImagesGet, post: mockImagesPost, byImageId: mockImagesItemById }
const mockAddToShoppingListPost = jest.fn()
const mockAddToShoppingList = { post: mockAddToShoppingListPost }
const mockById = jest.fn(() => ({
  get: mockGet,
  put: mockPut,
  delete: mockDelete,
  ingredients: mockIngredients,
  steps: mockSteps,
  images: mockImages,
  addToShoppingList: mockAddToShoppingList,
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: {
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

describe('useRecipes hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default fetch response for hooks that use fetch directly
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    } as Response)
  })

  describe('useRecipes', () => {
    it('should fetch recipes successfully', async () => {
      const mockData = [
        { id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Salad', createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response)

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/recipes'),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.any(String) }) })
      )
    })

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      } as Response)

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
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
      const originalFetch = global.fetch
      const mockFetch = jest.fn().mockResolvedValueOnce({ ok: true } as Response)
      global.fetch = mockFetch

      try {
        const { result } = renderHook(() => useUploadRecipeImage(1), {
          wrapper: createWrapper(),
        })

        const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })

        await act(async () => {
          result.current.mutate(file)
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/recipes/1/images/upload'),
          expect.objectContaining({ method: 'POST' })
        )
      } finally {
        global.fetch = originalFetch
      }
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

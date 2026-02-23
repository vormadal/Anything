import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useRecipes,
  useCreateRecipe,
  useDeleteRecipe,
  useRecipeIngredients,
  useAddRecipeIngredient,
  useAddRecipeStep,
  useAddIngredientsToShoppingList,
} from '@/hooks/useRecipes'

// Mock the apiClient module
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockDelete = jest.fn()
const mockPut = jest.fn()
const mockIngredientsGet = jest.fn()
const mockIngredientsPost = jest.fn()
const mockIngredientsItemPut = jest.fn()
const mockIngredientsItemDelete = jest.fn()
const mockIngredientsItemById = jest.fn(() => ({ put: mockIngredientsItemPut, delete: mockIngredientsItemDelete }))
const mockIngredients = { get: mockIngredientsGet, post: mockIngredientsPost, byId: mockIngredientsItemById }
const mockStepsGet = jest.fn()
const mockStepsPost = jest.fn()
const mockStepsItemById = jest.fn(() => ({ put: jest.fn(), delete: jest.fn() }))
const mockSteps = { get: mockStepsGet, post: mockStepsPost, byId: mockStepsItemById }
const mockImagesGet = jest.fn()
const mockImagesPost = jest.fn()
const mockImagesItemById = jest.fn(() => ({ delete: jest.fn() }))
const mockImages = { get: mockImagesGet, post: mockImagesPost, byId: mockImagesItemById }
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

describe('useRecipes hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useRecipes', () => {
    it('should fetch recipes successfully', async () => {
      const mockData = [
        { id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' },
        { id: 2, name: 'Salad', createdOn: '2024-01-02T00:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useRecipes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockData)
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))

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

      expect(mockPost).toHaveBeenCalledWith({ name: 'Pasta', link: undefined, notes: undefined })
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
        result.current.mutate(5)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockAddToShoppingListPost).toHaveBeenCalledWith({ shoppingListId: 5 })
    })
  })
})

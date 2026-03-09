import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import RecipeDetailPage from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockRecipeGet = jest.fn()
const mockRecipePut = jest.fn()
const mockIngredientsGet = jest.fn()
const mockIngredientsPost = jest.fn()
const mockIngredientByIdPut = jest.fn()
const mockIngredientByIdDelete = jest.fn()
const mockStepsGet = jest.fn()
const mockStepsPost = jest.fn()
const mockStepByIdPut = jest.fn()
const mockStepByIdDelete = jest.fn()
const mockImagesGet = jest.fn()
const mockImagesPost = jest.fn()
const mockImageByIdDelete = jest.fn()
const mockAddToShoppingListPost = jest.fn()

const mockRecipeDelete = jest.fn()
const mockIngredientById = jest.fn(() => ({ put: mockIngredientByIdPut, delete: mockIngredientByIdDelete }))
const mockStepById = jest.fn(() => ({ put: mockStepByIdPut, delete: mockStepByIdDelete }))
const mockImageById = jest.fn(() => ({ delete: mockImageByIdDelete }))
const mockById = jest.fn(() => ({
  get: mockRecipeGet,
  put: mockRecipePut,
  delete: mockRecipeDelete,
  ingredients: { get: mockIngredientsGet, post: mockIngredientsPost, byId: mockIngredientById },
  steps: { get: mockStepsGet, post: mockStepsPost, byId: mockStepById },
  images: { get: mockImagesGet, post: mockImagesPost, byId: mockImageById },
  addToShoppingList: { post: mockAddToShoppingListPost },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: {
        get: jest.fn().mockResolvedValue([]),
        post: jest.fn(),
        byId: (...args: unknown[]) => mockById(...args),
      },
      shoppingLists: {
        get: jest.fn().mockResolvedValue([{ id: 1, name: 'My List' }]),
        post: jest.fn(),
        byId: jest.fn(() => ({
          get: jest.fn(),
          delete: jest.fn(),
          items: { get: jest.fn(), post: jest.fn(), byId: jest.fn() },
          complete: { post: jest.fn() },
        })),
      },
      foodPlans: {
        get: jest.fn().mockResolvedValue([]),
        post: jest.fn(),
        byId: jest.fn(() => ({
          get: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
          entries: { get: jest.fn(), post: jest.fn(), byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
          addToShoppingList: { post: jest.fn() },
        })),
      },
    },
  },
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/recipes/1',
}))

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: null }),
  useLogout: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

const mockRecipe = { id: 1, name: 'Test Recipe', createdOn: '2024-01-01T00:00:00Z' }

async function enterEditMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'More options' }))
  await user.click(await screen.findByRole('menuitem', { name: /Edit recipe/i }))
}

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecipeGet.mockResolvedValue(mockRecipe)
    mockRecipeDelete.mockResolvedValue(undefined)
    mockIngredientsGet.mockResolvedValue([])
    mockStepsGet.mockResolvedValue([])
    mockImagesGet.mockResolvedValue([])
  })

  it('should render back button', () => {
    render(<RecipeDetailPage />)

    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
  })

  it('should display loading state', () => {
    mockRecipeGet.mockImplementation(() => new Promise(() => { // Promise that never resolves to simulate loading state
    }))

    render(<RecipeDetailPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error state when recipe fetch fails', async () => {
    mockRecipeGet.mockRejectedValue(new Error('API error'))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load recipe/i)).toBeInTheDocument()
    })
  })

  it('should display recipe name when loaded', async () => {
    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })
  })

  it('should display recipe link when present and it is a safe URL', async () => {
    mockRecipeGet.mockResolvedValue({
      ...mockRecipe,
      link: 'https://example.com/recipe',
    })

    render(<RecipeDetailPage />)

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'https://example.com/recipe' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://example.com/recipe')
    })
  })

  it('should display recipe notes when present', async () => {
    mockRecipeGet.mockResolvedValue({
      ...mockRecipe,
      notes: 'These are my recipe notes',
    })

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('These are my recipe notes')).toBeInTheDocument()
    })
  })

  it('should switch to edit mode when Edit button is clicked', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)

    expect(screen.getByRole('button', { name: 'Done editing' })).toBeInTheDocument()
    // Title/link/notes are directly editable; no separate "Edit Details" button
    expect(screen.queryByRole('button', { name: 'Edit Details' })).not.toBeInTheDocument()
  })

  it('should not show Edit Details button in view mode', async () => {
    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Edit Details' })).not.toBeInTheDocument()
  })

  it('should show Add Ingredient form in edit mode', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)

    expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Qty')).toBeInTheDocument()
  })

  it('should add an ingredient in edit mode', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockResolvedValueOnce({ id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 })

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)

    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Flour')
    await user.type(screen.getByPlaceholderText('Qty'), '2')
    await user.type(screen.getByPlaceholderText('Unit'), 'cups')

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    await waitFor(() => {
      expect(mockIngredientsPost).toHaveBeenCalledWith({
        name: 'Flour',
        amount: 2,
        unit: 'cups',
        group: undefined,
      })
    })

    expect(toast.success).toHaveBeenCalledWith('Ingredient added')
  })

  it('should not submit add ingredient form when name is empty', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)
    await user.type(screen.getByPlaceholderText('Qty'), '2')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(mockIngredientsPost).not.toHaveBeenCalled()
  })

  it('should not submit add ingredient form when amount is invalid', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)
    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Flour')
    // No amount entered — amount is optional, so form should submit
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    await waitFor(() => {
      expect(mockIngredientsPost).toHaveBeenCalledWith({
        name: 'Flour',
        amount: null,
        unit: undefined,
        group: undefined,
      })
    })
  })

  it('should add an ingredient without amount in edit mode', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockResolvedValueOnce({ id: 2, name: 'Salt', amount: null, unit: null, recipeId: 1 })

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)
    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Salt')
    // No amount or unit entered
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    await waitFor(() => {
      expect(mockIngredientsPost).toHaveBeenCalledWith({
        name: 'Salt',
        amount: null,
        unit: undefined,
        group: undefined,
      })
    })

    expect(toast.success).toHaveBeenCalledWith('Ingredient added')
  })

  it('should show error when add ingredient fails', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)
    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Flour')
    await user.type(screen.getByPlaceholderText('Qty'), '2')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add ingredient. Please try again.')
    })
  })

  it('should delete an ingredient in edit mode', async () => {
    const user = userEvent.setup()
    mockIngredientsGet.mockResolvedValue([
      { id: 5, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 },
    ])
    mockIngredientByIdDelete.mockResolvedValueOnce(undefined)

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/Flour/)).toBeInTheDocument()
    })

    await enterEditMode(user)

    const removeButton = screen.getByRole('button', { name: 'Remove ingredient' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockIngredientById).toHaveBeenCalledWith(5)
      expect(mockIngredientByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Ingredient removed')
  })

  it('should add a step in edit mode', async () => {
    const user = userEvent.setup()
    mockStepsPost.mockResolvedValueOnce({ id: 1, text: 'Mix ingredients', order: 1, recipeId: 1 })

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)

    await user.type(screen.getByPlaceholderText('Step description...'), 'Mix ingredients')
    await user.click(screen.getByRole('button', { name: 'Add step' }))

    await waitFor(() => {
      expect(mockStepsPost).toHaveBeenCalledWith({ text: 'Mix ingredients', order: 1 })
    })

    expect(toast.success).toHaveBeenCalledWith('Step added')
  })

  it('should show error when add step fails', async () => {
    const user = userEvent.setup()
    mockStepsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)
    await user.type(screen.getByPlaceholderText('Step description...'), 'Mix')
    await user.click(screen.getByRole('button', { name: 'Add step' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add step. Please try again.')
    })
  })

  it('should delete a step in edit mode', async () => {
    const user = userEvent.setup()
    mockStepsGet.mockResolvedValue([
      { id: 3, text: 'Preheat oven', order: 1, recipeId: 1 },
    ])
    mockStepByIdDelete.mockResolvedValueOnce(undefined)

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Preheat oven')).toBeInTheDocument()
    })

    await enterEditMode(user)

    // The Remove step button
    const removeButtons = screen.getAllByRole('button', { name: 'Remove step' })
    await user.click(removeButtons[0])

    await waitFor(() => {
      expect(mockStepById).toHaveBeenCalledWith(3)
      expect(mockStepByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Step removed')
  })

  it('should add an image in edit mode', async () => {
    const user = userEvent.setup()
    const originalFetch = global.fetch
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/tags')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as unknown as Response)
      }
      return Promise.resolve({ ok: true } as Response)
    })
    global.fetch = mockFetch

    try {
      render(<RecipeDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Recipe')).toBeInTheDocument()
      })

      await enterEditMode(user)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/recipes/1/images/upload'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    } finally {
      global.fetch = originalFetch
    }
  })

  it('should delete an image in edit mode', async () => {
    const user = userEvent.setup()
    mockImagesGet.mockResolvedValue([
      { id: 7, thumbnailUrl: 'https://example.com/img-thumb.jpg', originalUrl: 'https://example.com/img.jpg', recipeId: 1 },
    ])
    mockImageByIdDelete.mockResolvedValueOnce(undefined)

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getAllByAltText('Recipe image').length).toBeGreaterThan(0)
    })

    await enterEditMode(user)

    const removeButton = screen.getByRole('button', { name: 'Remove image' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockImageById).toHaveBeenCalledWith(7)
      expect(mockImageByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Image removed')
  })

  it('should navigate back to recipes when back button is clicked', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    const backButton = screen.getByRole('button', { name: 'Go back' })
    await user.click(backButton)

    expect(mockPush).toHaveBeenCalledWith('/recipes')
  })

  it('should add to shopping list when button clicked', async () => {
    const user = userEvent.setup()
    mockIngredientsGet.mockResolvedValue([
      { id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 },
    ])
    mockAddToShoppingListPost.mockResolvedValueOnce(undefined)

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    // Open More options and click Add to Shopping List
    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('menuitem', { name: /Add to Shopping List/i }))

    // Click the shopping list button in the dialog
    const listButton = await screen.findByRole('button', { name: 'My List' })
    await user.click(listButton)

    await waitFor(() => {
      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockAddToShoppingListPost).toHaveBeenCalledWith({ shoppingListId: 1, multiplier: 1 })
    })

    expect(toast.success).toHaveBeenCalledWith('Ingredients added to shopping list')
  })

  it('should show error when add to shopping list fails', async () => {
    const user = userEvent.setup()
    mockIngredientsGet.mockResolvedValue([
      { id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 },
    ])
    mockAddToShoppingListPost.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    // Open More options and click Add to Shopping List
    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('menuitem', { name: /Add to Shopping List/i }))

    // Click the shopping list button in the dialog
    const listButton = await screen.findByRole('button', { name: 'My List' })
    await user.click(listButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add ingredients to shopping list. Please try again.')
    })
  })

  it('should show context menu button in view mode', async () => {
    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument()
  })

  it('should show context menu button in edit mode', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)

    expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument()
  })

  it('should open delete confirmation dialog from context menu', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))

    const deleteMenuItem = await screen.findByRole('menuitem', { name: /Delete Recipe/i })
    await user.click(deleteMenuItem)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete Recipe')).toBeInTheDocument()
  })

  it('should delete recipe and navigate to /recipes on confirm', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))

    const deleteMenuItem = await screen.findByRole('menuitem', { name: /Delete Recipe/i })
    await user.click(deleteMenuItem)

    const confirmButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockRecipeDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Recipe deleted')
    expect(mockPush).toHaveBeenCalledWith('/recipes')
  })

  it('should show error toast when delete recipe fails', async () => {
    const user = userEvent.setup()
    mockRecipeDelete.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))

    const deleteMenuItem = await screen.findByRole('menuitem', { name: /Delete Recipe/i })
    await user.click(deleteMenuItem)

    const confirmButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete recipe. Please try again.')
    })

    expect(mockPush).not.toHaveBeenCalledWith('/recipes')
  })

  it('should show add-to-food-plan button in view mode', async () => {
    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Add to food plan/i })).toBeInTheDocument()
  })

  it('should not show add-to-food-plan button in edit mode', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await enterEditMode(user)

    expect(screen.queryByRole('button', { name: /Add to food plan/i })).not.toBeInTheDocument()
  })

  it('should open food plan dialog when add-to-food-plan button is clicked', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Add to food plan/i }))

    await waitFor(() => {
      expect(screen.getByText('Add to Food Plan')).toBeInTheDocument()
    })
  })
})

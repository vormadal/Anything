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

const mockIngredientById = jest.fn(() => ({ put: mockIngredientByIdPut, delete: mockIngredientByIdDelete }))
const mockStepById = jest.fn(() => ({ put: mockStepByIdPut, delete: mockStepByIdDelete }))
const mockImageById = jest.fn(() => ({ delete: mockImageByIdDelete }))
const mockById = jest.fn(() => ({
  get: mockRecipeGet,
  put: mockRecipePut,
  delete: jest.fn(),
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
    },
  },
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: '1' }),
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

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecipeGet.mockResolvedValue(mockRecipe)
    mockIngredientsGet.mockResolvedValue([])
    mockStepsGet.mockResolvedValue([])
    mockImagesGet.mockResolvedValue([])
  })

  it('should render back button "← Back to Recipes"', () => {
    render(<RecipeDetailPage />)

    expect(screen.getByText('← Back to Recipes')).toBeInTheDocument()
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

    const editButton = screen.getByRole('button', { name: 'Edit' })
    await user.click(editButton)

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Details' })).toBeInTheDocument()
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
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument()
  })

  it('should add an ingredient in edit mode', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockResolvedValueOnce({ id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 })

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Flour')
    await user.type(screen.getByPlaceholderText('Amount'), '2')
    await user.type(screen.getByPlaceholderText('Unit (optional)'), 'cups')

    await user.click(screen.getByRole('button', { name: 'Add' }))

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
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByPlaceholderText('Amount'), '2')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(mockIngredientsPost).not.toHaveBeenCalled()
  })

  it('should not submit add ingredient form when amount is invalid', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Flour')
    // No amount entered
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(mockIngredientsPost).not.toHaveBeenCalled()
  })

  it('should show error when add ingredient fails', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Flour')
    await user.type(screen.getByPlaceholderText('Amount'), '2')
    await user.click(screen.getByRole('button', { name: 'Add' }))

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

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const removeButton = screen.getByRole('button', { name: 'Remove' })
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
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    await user.type(screen.getByPlaceholderText('Step description...'), 'Mix ingredients')
    await user.click(screen.getByRole('button', { name: 'Add Step' }))

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
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByPlaceholderText('Step description...'), 'Mix')
    await user.click(screen.getByRole('button', { name: 'Add Step' }))

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

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    // The Remove button for steps
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    await user.click(removeButtons[0])

    await waitFor(() => {
      expect(mockStepById).toHaveBeenCalledWith(3)
      expect(mockStepByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Step removed')
  })

  it('should add an image in edit mode', async () => {
    const user = userEvent.setup()
    mockImagesPost.mockResolvedValueOnce({ id: 1, url: 'https://example.com/img.jpg', recipeId: 1 })

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByPlaceholderText('Image URL...'), 'https://example.com/img.jpg')
    await user.click(screen.getByRole('button', { name: 'Add Image' }))

    await waitFor(() => {
      expect(mockImagesPost).toHaveBeenCalledWith({ url: 'https://example.com/img.jpg' })
    })

    expect(toast.success).toHaveBeenCalledWith('Image added')
  })

  it('should delete an image in edit mode', async () => {
    const user = userEvent.setup()
    mockImagesGet.mockResolvedValue([
      { id: 7, url: 'https://example.com/img.jpg', recipeId: 1 },
    ])
    mockImageByIdDelete.mockResolvedValueOnce(undefined)

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getAllByAltText('Recipe image').length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const removeButton = screen.getByRole('button', { name: 'Remove' })
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

    const backButton = screen.getByText('← Back to Recipes')
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
      expect(screen.getByText('Add to Shopping List')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, '1')

    const addButton = screen.getByRole('button', { name: 'Add Ingredients' })
    await user.click(addButton)

    await waitFor(() => {
      expect(mockById).toHaveBeenCalledWith(1)
      expect(mockAddToShoppingListPost).toHaveBeenCalledWith({ shoppingListId: 1 })
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
      expect(screen.getByText('Add to Shopping List')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, '1')

    const addButton = screen.getByRole('button', { name: 'Add Ingredients' })
    await user.click(addButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add ingredients to shopping list. Please try again.')
    })
  })
})

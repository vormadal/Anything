import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import RecipeDetailPage from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockDetailsGet = jest.fn()
const mockAddToShoppingListPost = jest.fn()
const mockRecipeDelete = jest.fn()
const mockReimportPost = jest.fn()

const mockById: jest.Mock = jest.fn(() => ({
  delete: mockRecipeDelete,
  details: { get: mockDetailsGet },
  addToShoppingList: { post: mockAddToShoppingListPost },
  reimport: { post: mockReimportPost },
  // Edit-mode data comes from the granular per-resource endpoints — see
  // RecipeEditMode.test.tsx for CRUD coverage of these; this file only
  // needs enough to render the edit form once the user switches into it.
  get: jest.fn().mockResolvedValue({ id: 1, name: 'Test Recipe', link: 'https://example.com/recipe', createdOn: '2024-01-01T00:00:00Z' }),
  put: jest.fn().mockResolvedValue({ id: 1, name: 'Test Recipe' }),
  ingredients: { get: jest.fn().mockResolvedValue([]), post: jest.fn(), byIngredientId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
  steps: { get: jest.fn().mockResolvedValue([]), post: jest.fn(), byStepId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
  images: { get: jest.fn().mockResolvedValue([]), byImageId: jest.fn(() => ({ delete: jest.fn() })), upload: { post: jest.fn() } },
  tags: { get: jest.fn().mockResolvedValue([]) },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: {
        get: jest.fn().mockResolvedValue([]),
        post: jest.fn(),
        byId: (...args: unknown[]) => mockById(...args),
      },
      checklists: {
        get: jest.fn().mockResolvedValue([{ id: 1, name: 'My List' }]),
        post: jest.fn(),
        byId: jest.fn(() => ({
          get: jest.fn(),
          delete: jest.fn(),
          items: { get: jest.fn(), post: jest.fn(), byItemId: jest.fn() },
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
          entries: { get: jest.fn(), post: jest.fn(), byEntryId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
          addToShoppingList: { post: jest.fn() },
        })),
      },
    },
  },
  createMultipartBody: () => ({ addOrReplacePart: jest.fn() }),
}))

jest.mock('@/hooks/useRecommendations', () => ({
  useRecommendations: () => ({ data: [] }),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/recipes/1',
  useSearchParams: () => ({ get: jest.fn().mockReturnValue(null) }),
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

// The detail page loads everything from one aggregate endpoint; build a
// RecipeDetailResponse-shaped object with optional overrides.
const buildDetail = (overrides: Record<string, unknown> = {}) => ({
  ...mockRecipe,
  ingredients: [],
  steps: [],
  images: [],
  tags: [],
  ...overrides,
})

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDetailsGet.mockResolvedValue(buildDetail())
    mockRecipeDelete.mockResolvedValue(undefined)
  })

  it('should render back button', () => {
    render(<RecipeDetailPage />)

    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
  })

  it('should display loading state', () => {
    mockDetailsGet.mockImplementation(() => new Promise(() => { // Promise that never resolves to simulate loading state
    }))

    render(<RecipeDetailPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error state when recipe fetch fails', async () => {
    mockDetailsGet.mockRejectedValue(new Error('API error'))

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
    mockDetailsGet.mockResolvedValue(buildDetail({
      link: 'https://example.com/recipe',
    }))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'example.com' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://example.com/recipe')
    })
  })

  it('should display recipe notes when present', async () => {
    mockDetailsGet.mockResolvedValue(buildDetail({
      notes: 'These are my recipe notes',
    }))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('These are my recipe notes')).toBeInTheDocument()
    })
  })

  it('should switch to edit mode in place when Edit recipe is selected', async () => {
    const user = userEvent.setup()

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('menuitem', { name: /Edit recipe/i }))

    // Entering edit mode pushes exactly one history entry (the query param)
    // instead of navigating to a separate route — see issue #621.
    expect(mockPush).toHaveBeenCalledWith('?edit=true')
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
    })
  })

  it('should show edit-mode-only dropdown options and no Done button once in edit mode', async () => {
    const user = userEvent.setup()
    mockDetailsGet.mockResolvedValue(buildDetail({ link: 'https://example.com/recipe' }))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('menuitem', { name: /Edit recipe/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Recipe name')).toBeInTheDocument()
    })

    // There is no client-side "Done" button — the header back-chevron is the
    // only way out, so a single back-press always leaves edit mode.
    expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'More options' }))
    expect(await screen.findByRole('menuitem', { name: /Reimport from URL/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Delete Recipe/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Edit recipe/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Add to Shopping List/i })).not.toBeInTheDocument()
  })

  it('should reimport the recipe from the edit-mode dropdown', async () => {
    const user = userEvent.setup()
    mockDetailsGet.mockResolvedValue(buildDetail({ link: 'https://example.com/recipe' }))
    mockReimportPost.mockResolvedValueOnce(undefined)

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('menuitem', { name: /Edit recipe/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Recipe name')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('menuitem', { name: /Reimport from URL/i }))

    await user.click(screen.getByRole('button', { name: 'Reimport' }))

    await waitFor(() => {
      expect(mockReimportPost).toHaveBeenCalledWith({
        importName: true,
        importIngredients: true,
        importSteps: true,
        importImages: true,
      })
    })

    expect(toast.success).toHaveBeenCalledWith('Recipe reimported successfully')
  })

  it('should not show edit inputs on view page', async () => {
    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Done editing' })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Ingredient name')).not.toBeInTheDocument()
  })

  it('should show add-to-food-plan button in view mode', async () => {
    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Add to food plan/i })).toBeInTheDocument()
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

  it('should show context menu button in view mode', async () => {
    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

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

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
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

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
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

  it('should add to shopping list when button clicked', async () => {
    const user = userEvent.setup()
    mockDetailsGet.mockResolvedValue(buildDetail({
      ingredients: [{ id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 }],
    }))
    mockAddToShoppingListPost.mockResolvedValueOnce(undefined)

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('menuitem', { name: /Add to Shopping List/i }))

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
    mockDetailsGet.mockResolvedValue(buildDetail({
      ingredients: [{ id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 }],
    }))
    mockAddToShoppingListPost.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipeDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(await screen.findByRole('menuitem', { name: /Add to Shopping List/i }))

    const listButton = await screen.findByRole('button', { name: 'My List' })
    await user.click(listButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add ingredients to shopping list. Please try again.')
    })
  })

  describe('offline', () => {
    function setOnline(value: boolean) {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value })
    }

    afterEach(() => {
      setOnline(true)
    })

    it('disables Delete Recipe and Add to Shopping List while offline', async () => {
      const user = userEvent.setup()
      setOnline(false)

      render(<RecipeDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Recipe')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'More options' }))
      expect(await screen.findByRole('menuitem', { name: /Delete Recipe/i })).toHaveAttribute(
        'aria-disabled',
        'true'
      )
      expect(screen.getByRole('menuitem', { name: /Add to Shopping List/i })).toHaveAttribute(
        'aria-disabled',
        'true'
      )
    })
  })
})

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import RecipeEditPage from './page'
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
const mockImagesUploadPost = jest.fn().mockResolvedValue(undefined)
const mockImageByIdDelete = jest.fn()
const mockRecipeDelete = jest.fn()
const mockIngredientById = jest.fn(() => ({ put: mockIngredientByIdPut, delete: mockIngredientByIdDelete }))
const mockStepById = jest.fn(() => ({ put: mockStepByIdPut, delete: mockStepByIdDelete }))
const mockImageById = jest.fn(() => ({ delete: mockImageByIdDelete }))
const mockById = jest.fn(() => ({
  get: mockRecipeGet,
  put: mockRecipePut,
  delete: mockRecipeDelete,
  ingredients: { get: mockIngredientsGet, post: mockIngredientsPost, byIngredientId: mockIngredientById },
  steps: { get: mockStepsGet, post: mockStepsPost, byStepId: mockStepById },
  images: { get: mockImagesGet, post: jest.fn(), byImageId: mockImageById, upload: { post: mockImagesUploadPost } },
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
      shoppingLists: {
        get: jest.fn().mockResolvedValue([]),
        byId: jest.fn(() => ({ get: jest.fn() })),
      },
      foodPlans: {
        get: jest.fn().mockResolvedValue([]),
        byId: jest.fn(() => ({ get: jest.fn() })),
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
  usePathname: () => '/recipes/1/edit',
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

describe('RecipeEditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecipeGet.mockResolvedValue(mockRecipe)
    mockRecipePut.mockResolvedValue(mockRecipe)
    mockRecipeDelete.mockResolvedValue(undefined)
    mockIngredientsGet.mockResolvedValue([])
    mockStepsGet.mockResolvedValue([])
    mockImagesGet.mockResolvedValue([])
  })

  it('should render Done editing button', async () => {
    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done editing' })).toBeInTheDocument()
    })
  })

  it('should show Add Ingredient form', async () => {
    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Qty')).toBeInTheDocument()
    })
  })

  it('should add an ingredient', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockResolvedValueOnce({ id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 })

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
    })

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

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Qty'), '2')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    expect(mockIngredientsPost).not.toHaveBeenCalled()
  })

  it('should add an ingredient without amount', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockResolvedValueOnce({ id: 2, name: 'Salt', amount: null, unit: null, recipeId: 1 })

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Salt')
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

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Ingredient name'), 'Flour')
    await user.type(screen.getByPlaceholderText('Qty'), '2')
    await user.click(screen.getByRole('button', { name: 'Add ingredient' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add ingredient. Please try again.')
    })
  })

  it('should delete an ingredient', async () => {
    const user = userEvent.setup()
    mockIngredientsGet.mockResolvedValue([
      { id: 5, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 },
    ])
    mockIngredientByIdDelete.mockResolvedValueOnce(undefined)

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Flour')).toBeInTheDocument()
    })

    const removeButton = screen.getByRole('button', { name: 'Remove ingredient' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockIngredientById).toHaveBeenCalledWith(5)
      expect(mockIngredientByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Ingredient removed')
  })

  it('should save ingredient on blur', async () => {
    const user = userEvent.setup()
    mockIngredientsGet.mockResolvedValue([
      { id: 5, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 },
    ])
    mockIngredientByIdPut.mockResolvedValueOnce(undefined)

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Flour')).toBeInTheDocument()
    })

    const nameInput = screen.getByDisplayValue('Flour')
    await user.clear(nameInput)
    await user.type(nameInput, 'Bread Flour')
    await user.tab()

    await waitFor(() => {
      expect(mockIngredientById).toHaveBeenCalledWith(5)
      expect(mockIngredientByIdPut).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bread Flour' })
      )
    })
  })

  it('should add a step', async () => {
    const user = userEvent.setup()
    mockStepsPost.mockResolvedValueOnce({ id: 1, text: 'Mix ingredients', order: 1, recipeId: 1 })

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Step description...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Step description...'), 'Mix ingredients')
    await user.click(screen.getByRole('button', { name: 'Add step' }))

    await waitFor(() => {
      expect(mockStepsPost).toHaveBeenCalledWith({ text: 'Mix ingredients', order: 1 })
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Step description...')).toHaveValue('')
    })
  })

  it('should show error when add step fails', async () => {
    const user = userEvent.setup()
    mockStepsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Step description...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Step description...'), 'Mix')
    await user.click(screen.getByRole('button', { name: 'Add step' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add step. Please try again.')
    })
  })

  it('should delete a step', async () => {
    const user = userEvent.setup()
    mockStepsGet.mockResolvedValue([
      { id: 3, text: 'Preheat oven', order: 1, recipeId: 1 },
    ])
    mockStepByIdDelete.mockResolvedValueOnce(undefined)

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Preheat oven')).toBeInTheDocument()
    })

    const removeButtons = screen.getAllByRole('button', { name: 'Remove step' })
    await user.click(removeButtons[0])

    await waitFor(() => {
      expect(mockStepById).toHaveBeenCalledWith(3)
      expect(mockStepByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Step removed')
  })

  it('should add an image', async () => {
    const user = userEvent.setup()

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done editing' })).toBeInTheDocument()
    })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(mockImagesUploadPost).toHaveBeenCalled()
    })
  })

  it('should delete an image', async () => {
    const user = userEvent.setup()
    mockImagesGet.mockResolvedValue([
      { id: 7, thumbnailUrl: 'https://example.com/img-thumb.jpg', originalUrl: 'https://example.com/img.jpg', recipeId: 1 },
    ])
    mockImageByIdDelete.mockResolvedValueOnce(undefined)

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getAllByAltText('Recipe image').length).toBeGreaterThan(0)
    })

    const removeButton = screen.getByRole('button', { name: 'Remove image' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockImageById).toHaveBeenCalledWith(7)
      expect(mockImageByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Image removed')
  })

  it('should show context menu button', async () => {
    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument()
    })
  })

  it('should open delete confirmation dialog from context menu', async () => {
    const user = userEvent.setup()

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument()
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

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument()
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

  it('should navigate to view page when Done is clicked with no changes', async () => {
    const user = userEvent.setup()

    render(<RecipeEditPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done editing' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Done editing' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/recipes/1')
    })
  })
})

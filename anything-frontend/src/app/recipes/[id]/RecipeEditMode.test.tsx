import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import { RecipeEditMode } from './RecipeEditMode'
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
const mockIngredientById: jest.Mock = jest.fn(() => ({ put: mockIngredientByIdPut, delete: mockIngredientByIdDelete }))
const mockStepById: jest.Mock = jest.fn(() => ({ put: mockStepByIdPut, delete: mockStepByIdDelete }))
const mockImageById: jest.Mock = jest.fn(() => ({ delete: mockImageByIdDelete }))
const mockById: jest.Mock = jest.fn(() => ({
  get: mockRecipeGet,
  put: mockRecipePut,
  ingredients: { get: mockIngredientsGet, post: mockIngredientsPost, byIngredientId: mockIngredientById },
  steps: { get: mockStepsGet, post: mockStepsPost, byStepId: mockStepById },
  images: { get: mockImagesGet, post: jest.fn(), byImageId: mockImageById, upload: { post: mockImagesUploadPost } },
  tags: { get: jest.fn().mockResolvedValue([]) },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: {
        byId: (...args: unknown[]) => mockById(...args),
      },
    },
  },
  createMultipartBody: () => ({ addOrReplacePart: jest.fn() }),
}))

jest.mock('@/hooks/useRecommendations', () => ({
  useRecommendations: () => ({ data: [] }),
}))

// Mock next/navigation — RecipeEditMode itself doesn't navigate, but the
// test wrapper's header back-button (useSmartBack) does.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/recipes/1',
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

function Wrapper() {
  return <RecipeEditMode recipeId={1} />
}

describe('RecipeEditMode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecipeGet.mockResolvedValue(mockRecipe)
    mockRecipePut.mockResolvedValue(mockRecipe)
    mockIngredientsGet.mockResolvedValue([])
    mockStepsGet.mockResolvedValue([])
    mockImagesGet.mockResolvedValue([])
  })

  it('should show Add Ingredient form', async () => {
    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ingredient name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Qty')).toBeInTheDocument()
    })
  })

  it('should add an ingredient', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockResolvedValueOnce({ id: 1, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 })

    render(<Wrapper />)

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
  })

  it('should not submit add ingredient form when name is empty', async () => {
    const user = userEvent.setup()

    render(<Wrapper />)

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

    render(<Wrapper />)

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
  })

  it('should show error when add ingredient fails', async () => {
    const user = userEvent.setup()
    mockIngredientsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<Wrapper />)

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

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Flour')).toBeInTheDocument()
    })

    const removeButton = screen.getByRole('button', { name: 'Remove ingredient' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockIngredientById).toHaveBeenCalledWith(5)
      expect(mockIngredientByIdDelete).toHaveBeenCalled()
    })
  })

  it('should save ingredient on blur', async () => {
    const user = userEvent.setup()
    mockIngredientsGet.mockResolvedValue([
      { id: 5, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 },
    ])
    mockIngredientByIdPut.mockResolvedValueOnce(undefined)

    render(<Wrapper />)

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

    render(<Wrapper />)

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

    render(<Wrapper />)

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

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Preheat oven')).toBeInTheDocument()
    })

    const removeButtons = screen.getAllByRole('button', { name: 'Remove step' })
    await user.click(removeButtons[0])

    await waitFor(() => {
      expect(mockStepById).toHaveBeenCalledWith(3)
      expect(mockStepByIdDelete).toHaveBeenCalled()
    })
  })

  it('should add an image', async () => {
    const user = userEvent.setup()

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Recipe name')).toBeInTheDocument()
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

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getAllByAltText('Recipe image').length).toBeGreaterThan(0)
    })

    const removeButton = screen.getByRole('button', { name: 'Remove image' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockImageById).toHaveBeenCalledWith(7)
      expect(mockImageByIdDelete).toHaveBeenCalled()
    })
  })

  it('should save the recipe name when the hero name field is blurred', async () => {
    const user = userEvent.setup()

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Recipe name')).toHaveValue('Test Recipe')
    })

    const nameInput = screen.getByPlaceholderText('Recipe name')
    await user.clear(nameInput)
    await user.type(nameInput, 'New Recipe Name')
    await user.tab()

    await waitFor(() => {
      expect(mockRecipePut).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Recipe Name' })
      )
    })
  })

  it('should not save metadata on blur when nothing changed', async () => {
    const user = userEvent.setup()

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Recipe name')).toHaveValue('Test Recipe')
    })

    await user.click(screen.getByPlaceholderText('Recipe name'))
    await user.tab()

    expect(mockRecipePut).not.toHaveBeenCalled()
  })

  it('should save link/notes/cookTime/servings together as one PUT when the field group is left', async () => {
    const user = userEvent.setup()

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Recipe link (optional)')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Recipe link (optional)'), 'https://example.com')
    // Tabbing to a sibling field within the same group should not save yet.
    await user.tab()
    expect(mockRecipePut).not.toHaveBeenCalled()

    await user.type(screen.getByPlaceholderText('Notes (optional)'), 'Some notes')
    // Leaving the whole metadata group fires exactly one save.
    await user.tab({ shift: false })
    await user.click(document.body)

    await waitFor(() => {
      expect(mockRecipePut).toHaveBeenCalledWith(
        expect.objectContaining({ link: 'https://example.com', notes: 'Some notes' })
      )
    })
  })

  describe('offline', () => {
    function setOnline(value: boolean) {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value })
    }

    afterEach(() => {
      setOnline(true)
    })

    it('disables editing controls while offline', async () => {
      mockIngredientsGet.mockResolvedValue([
        { id: 5, name: 'Flour', amount: 2, unit: 'cups', recipeId: 1 },
      ])
      mockStepsGet.mockResolvedValue([
        { id: 3, text: 'Preheat oven', order: 1, recipeId: 1 },
      ])
      setOnline(false)

      render(<Wrapper />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Flour')).toBeInTheDocument()
      })

      expect(screen.getByDisplayValue('Flour')).toBeDisabled()
      expect(screen.getByDisplayValue('Preheat oven')).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Remove ingredient' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Remove step' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Add ingredient' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Add step' })).toBeDisabled()
      expect(screen.getByPlaceholderText('Recipe name')).toBeDisabled()
      expect(screen.getByPlaceholderText('Recipe link (optional)')).toBeDisabled()
      expect(screen.getByPlaceholderText('Notes (optional)')).toBeDisabled()
      expect(screen.getByPlaceholderText('Add a tag (e.g. vegetarian)').nextElementSibling).toBeDisabled()
    })

    it('disables uploading and removing a photo while offline', async () => {
      mockImagesGet.mockResolvedValue([
        { id: 7, thumbnailUrl: 'https://example.com/img-thumb.jpg', originalUrl: 'https://example.com/img.jpg', recipeId: 1 },
      ])
      setOnline(false)

      render(<Wrapper />)

      await waitFor(() => {
        expect(screen.getAllByAltText('Recipe image').length).toBeGreaterThan(0)
      })

      expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Remove image' })).toBeDisabled()
    })
  })
})

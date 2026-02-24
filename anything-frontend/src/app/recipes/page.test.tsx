import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import RecipesPage from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockRecipesGet = jest.fn()
const mockRecipesPost = jest.fn()
const mockRecipesByIdDelete = jest.fn()
const mockRecipesById = jest.fn(() => ({
  delete: mockRecipesByIdDelete,
  get: jest.fn(),
  put: jest.fn(),
  ingredients: { get: jest.fn(), post: jest.fn(), byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
  steps: { get: jest.fn(), post: jest.fn(), byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
  images: { get: jest.fn(), post: jest.fn(), byId: jest.fn(() => ({ delete: jest.fn() })) },
  addToShoppingList: { post: jest.fn() },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: {
        get: (...args: unknown[]) => mockRecipesGet(...args),
        post: (...args: unknown[]) => mockRecipesPost(...args),
        byId: (...args: unknown[]) => mockRecipesById(...args),
      },
      shoppingLists: {
        get: jest.fn().mockResolvedValue([]),
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

// Mock useAuth
const mockUseCurrentUser = jest.fn()
const mockUseLogout = jest.fn()

jest.mock('@/hooks/useAuth', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
  useLogout: () => mockUseLogout(),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

describe('RecipesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCurrentUser.mockReturnValue({ data: { name: 'Test User', role: 'User' } })
    mockUseLogout.mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue(undefined), isPending: false })
  })

  it('should render the page title and description', () => {
    mockRecipesGet.mockResolvedValue([])

    render(<RecipesPage />)

    expect(screen.getByText('Recipes')).toBeInTheDocument()
    expect(screen.getByText('Manage your recipes')).toBeInTheDocument()
  })

  it('should display loading state initially', () => {
    mockRecipesGet.mockImplementation(() => new Promise(() => { // Promise that never resolves to simulate loading state
    }))

    render(<RecipesPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error message when API fails', async () => {
    mockRecipesGet.mockRejectedValue(new Error('API error'))

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load recipes/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no recipes exist', async () => {
    mockRecipesGet.mockResolvedValue([])

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('No recipes yet. Create your first one above!')).toBeInTheDocument()
    })
  })

  it('should display a list of recipes', async () => {
    const mockData = [
      { id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Salad', createdOn: '2024-01-02T00:00:00Z' },
    ]
    mockRecipesGet.mockResolvedValue(mockData)

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
      expect(screen.getByText('Salad')).toBeInTheDocument()
    })
  })

  it('should create a new recipe and navigate to it', async () => {
    const user = userEvent.setup()
    const mockNewRecipe = { id: 3, name: 'Tacos', createdOn: '2024-01-03T00:00:00Z' }
    mockRecipesGet.mockResolvedValue([])
    mockRecipesPost.mockResolvedValueOnce(mockNewRecipe)

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('No recipes yet. Create your first one above!')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('New recipe name...')
    await user.type(input, 'Tacos')

    const createButton = screen.getByRole('button', { name: 'Create Recipe' })
    await user.click(createButton)

    await waitFor(() => {
      expect(mockRecipesPost).toHaveBeenCalledWith({ name: 'Tacos', link: undefined, notes: undefined })
    })

    expect(toast.success).toHaveBeenCalledWith('Recipe created')
    expect(mockPush).toHaveBeenCalledWith('/recipes/3')
    expect(input).toHaveValue('')
  })

  it('should not submit when name is empty', async () => {
    const user = userEvent.setup()
    mockRecipesGet.mockResolvedValue([])

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('No recipes yet. Create your first one above!')).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: 'Create Recipe' })
    await user.click(createButton)

    expect(mockRecipesPost).not.toHaveBeenCalled()
  })

  it('should show error toast when create fails', async () => {
    const user = userEvent.setup()
    mockRecipesGet.mockResolvedValue([])
    mockRecipesPost.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('No recipes yet. Create your first one above!')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('New recipe name...')
    await user.type(input, 'Fail Recipe')

    const createButton = screen.getByRole('button', { name: 'Create Recipe' })
    await user.click(createButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create recipe. Please try again.')
    })
  })

  it('should delete a recipe when delete button is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }]
    mockRecipesGet.mockResolvedValueOnce(mockData).mockResolvedValueOnce([])
    mockRecipesByIdDelete.mockResolvedValueOnce(undefined)

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockRecipesById).toHaveBeenCalledWith(1)
      expect(mockRecipesByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Recipe deleted')
  })

  it('should show error toast when delete fails', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }]
    mockRecipesGet.mockResolvedValue(mockData)
    mockRecipesByIdDelete.mockRejectedValueOnce(new Error('Server error'))

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete recipe. Please try again.')
    })
  })

  it('should navigate to recipe via Open button', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }]
    mockRecipesGet.mockResolvedValue(mockData)

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const openButton = screen.getByRole('button', { name: 'Open' })
    await user.click(openButton)

    expect(mockPush).toHaveBeenCalledWith('/recipes/1')
  })

  it('should navigate to recipe when row is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }]
    mockRecipesGet.mockResolvedValue(mockData)

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const row = screen.getByRole('button', { name: /Pasta/ })
    await user.click(row)

    expect(mockPush).toHaveBeenCalledWith('/recipes/1')
  })

  it('should show Admin Panel button for admin users', async () => {
    mockUseCurrentUser.mockReturnValue({ data: { name: 'Admin User', role: 'Admin' } })
    mockRecipesGet.mockResolvedValue([])

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument()
    })
  })

  it('should show loading state on create button while creating', async () => {
    const user = userEvent.setup()
    mockRecipesGet.mockResolvedValue([])
    mockRecipesPost.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: 1, name: 'Test', createdOn: '2024-01-01T00:00:00Z' }), 100))
    )

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('No recipes yet. Create your first one above!')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('New recipe name...')
    await user.type(input, 'Test')

    const createButton = screen.getByRole('button', { name: 'Create Recipe' })
    await user.click(createButton)

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
  })
})

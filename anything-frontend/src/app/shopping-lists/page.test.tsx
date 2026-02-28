import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import ShoppingListsPage from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockShoppingListsGet = jest.fn()
const mockShoppingListsPost = jest.fn()
const mockShoppingListsByIdDelete = jest.fn()
const mockShoppingListsById = jest.fn(() => ({ delete: mockShoppingListsByIdDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      shoppingLists: {
        get: (...args: unknown[]) => mockShoppingListsGet(...args),
        post: (...args: unknown[]) => mockShoppingListsPost(...args),
        byId: (...args: unknown[]) => mockShoppingListsById(...args),
      },
    },
  },
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

describe('ShoppingListsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should display loading state initially', () => {
    mockShoppingListsGet.mockImplementation(() => new Promise(() => { /* never resolves */ }))

    render(<ShoppingListsPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error message when API fails', async () => {
    mockShoppingListsGet.mockRejectedValue(new Error('API error'))

    render(<ShoppingListsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load shopping lists/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no lists exist', async () => {
    mockShoppingListsGet.mockResolvedValue([])

    render(<ShoppingListsPage />)

    await waitFor(() => {
      expect(screen.getByText('No shopping lists yet.')).toBeInTheDocument()
    })
  })

  it('should display a list of shopping lists', async () => {
    const mockData = [
      { id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Hardware', createdOn: '2024-01-02T00:00:00Z' },
    ]
    mockShoppingListsGet.mockResolvedValue(mockData)

    render(<ShoppingListsPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Hardware')).toBeInTheDocument()
    })
  })

  it('should open create form when plus button is clicked', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])

    render(<ShoppingListsPage />)

    const plusButton = screen.getByRole('button', { name: 'Create shopping list' })
    await user.click(plusButton)

    expect(screen.getByPlaceholderText('List name...')).toBeInTheDocument()
  })

  it('should create a new list and navigate to it', async () => {
    const user = userEvent.setup()
    const mockNewList = { id: 3, name: 'Party Supplies', createdOn: '2024-01-03T00:00:00Z' }
    mockShoppingListsGet.mockResolvedValue([])
    mockShoppingListsPost.mockResolvedValueOnce(mockNewList)

    render(<ShoppingListsPage />)

    await user.click(screen.getByRole('button', { name: 'Create shopping list' }))

    const input = screen.getByPlaceholderText('List name...')
    await user.type(input, 'Party Supplies')

    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockShoppingListsPost).toHaveBeenCalledWith({ name: 'Party Supplies' })
    })

    expect(toast.success).toHaveBeenCalledWith('Shopping list created')
    expect(mockPush).toHaveBeenCalledWith('/shopping-lists/3')
  })

  it('should not submit when list name is empty', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])

    render(<ShoppingListsPage />)

    await user.click(screen.getByRole('button', { name: 'Create shopping list' }))

    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(mockShoppingListsPost).not.toHaveBeenCalled()
  })

  it('should show error toast when create fails', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    mockShoppingListsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListsPage />)

    await user.click(screen.getByRole('button', { name: 'Create shopping list' }))

    await user.type(screen.getByPlaceholderText('List name...'), 'Fail List')

    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create shopping list. Please try again.')
    })
  })

  it('should cancel create form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])

    render(<ShoppingListsPage />)

    await user.click(screen.getByRole('button', { name: 'Create shopping list' }))
    expect(screen.getByPlaceholderText('List name...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByPlaceholderText('List name...')).not.toBeInTheDocument()
  })

  it('should enter edit mode when edit button is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' }]
    mockShoppingListsGet.mockResolvedValue(mockData)

    render(<ShoppingListsPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit lists' }))

    expect(screen.getByRole('button', { name: 'Delete list' })).toBeInTheDocument()
  })

  it('should delete a list when delete button is clicked in edit mode', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' }]
    mockShoppingListsGet.mockResolvedValueOnce(mockData).mockResolvedValueOnce([])
    mockShoppingListsByIdDelete.mockResolvedValueOnce(undefined)

    render(<ShoppingListsPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit lists' }))
    await user.click(screen.getByRole('button', { name: 'Delete list' }))

    await waitFor(() => {
      expect(mockShoppingListsById).toHaveBeenCalledWith(1)
      expect(mockShoppingListsByIdDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Shopping list deleted')
  })

  it('should show error toast when delete fails', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' }]
    mockShoppingListsGet.mockResolvedValue(mockData)
    mockShoppingListsByIdDelete.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListsPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit lists' }))
    await user.click(screen.getByRole('button', { name: 'Delete list' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete shopping list. Please try again.')
    })
  })

  it('should navigate to list when row is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' }]
    mockShoppingListsGet.mockResolvedValue(mockData)

    render(<ShoppingListsPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    const row = screen.getByRole('button', { name: /Groceries/ })
    await user.click(row)

    expect(mockPush).toHaveBeenCalledWith('/shopping-lists/1')
  })

  it('should not navigate when row is clicked in edit mode', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' }]
    mockShoppingListsGet.mockResolvedValue(mockData)

    render(<ShoppingListsPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit lists' }))

    const row = screen.getByRole('button', { name: /Groceries/ })
    await user.click(row)

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should show creating state on create button while submitting', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    mockShoppingListsPost.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: 1, name: 'Test', createdOn: '2024-01-01T00:00:00Z' }), 100))
    )

    render(<ShoppingListsPage />)

    await user.click(screen.getByRole('button', { name: 'Create shopping list' }))
    await user.type(screen.getByPlaceholderText('List name...'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
  })
})

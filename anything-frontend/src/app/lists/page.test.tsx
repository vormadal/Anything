import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import ListsPage from './page'
import { toast } from 'sonner'

const mockShoppingListsGet = jest.fn()
const mockShoppingListsPost = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      checklists: {
        get: (...args: unknown[]) => mockShoppingListsGet(...args),
        post: (...args: unknown[]) => mockShoppingListsPost(...args),
      },
    },
  },
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => '/lists',
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

describe('ListsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => { localStorage.clear() })

  it('should display loading state initially', () => {
    mockShoppingListsGet.mockImplementation(() => new Promise(() => {}))
    render(<ListsPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error message when API fails', async () => {
    mockShoppingListsGet.mockRejectedValue(new Error('API error'))
    render(<ListsPage />)
    await waitFor(() => {
      expect(screen.getByText(/Failed to load lists/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no lists exist', async () => {
    mockShoppingListsGet.mockResolvedValue([])
    render(<ListsPage />)
    await waitFor(() => {
      expect(screen.getByText('No lists yet.')).toBeInTheDocument()
    })
  })

  it('should display a list of lists', async () => {
    const mockData = [
      { id: 1, name: 'Groceries', type: 1, createdOn: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Todo', type: 0, createdOn: '2024-01-02T00:00:00Z' },
    ]
    mockShoppingListsGet.mockResolvedValue(mockData)
    render(<ListsPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Todo')).toBeInTheDocument()
    })
  })

  it('should open create form when plus button is clicked', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    expect(screen.getByPlaceholderText('List name...')).toBeInTheDocument()
  })

  it('should create a new shopping list and navigate to it', async () => {
    const user = userEvent.setup()
    const mockNewList = { id: 3, name: 'Party Supplies', type: 1, createdOn: '2024-01-03T00:00:00Z' }
    mockShoppingListsGet.mockResolvedValue([])
    mockShoppingListsPost.mockResolvedValueOnce(mockNewList)
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.type(screen.getByPlaceholderText('List name...'), 'Party Supplies')
    await user.click(screen.getByRole('button', { name: 'Create list' }))
    await waitFor(() => {
      expect(mockShoppingListsPost).toHaveBeenCalledWith({ name: 'Party Supplies', type: 1 })
    })
    expect(toast.success).toHaveBeenCalledWith('List created')
    expect(mockPush).toHaveBeenCalledWith('/lists/3')
  })

  it('should not submit when list name is empty', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.click(screen.getByRole('button', { name: 'Create list' }))
    expect(mockShoppingListsPost).not.toHaveBeenCalled()
  })

  it('should show error toast when create fails', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    mockShoppingListsPost.mockRejectedValueOnce(new Error('Server error'))
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.type(screen.getByPlaceholderText('List name...'), 'Fail List')
    await user.click(screen.getByRole('button', { name: 'Create list' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create list. Please try again.')
    })
  })

  it('should cancel create form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    expect(screen.getByPlaceholderText('List name...')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByPlaceholderText('List name...')).not.toBeInTheDocument()
  })

  it('should navigate to list when row is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Groceries', type: 1, createdOn: '2024-01-01T00:00:00Z' }]
    mockShoppingListsGet.mockResolvedValue(mockData)
    render(<ListsPage />)
    await waitFor(() => { expect(screen.getByText('Groceries')).toBeInTheDocument() })
    await user.click(screen.getByRole('button', { name: /Groceries/ }))
    expect(mockPush).toHaveBeenCalledWith('/lists/1')
  })

  it('should display unchecked item count badge', async () => {
    const mockData = [
      { id: 1, name: 'Groceries', type: 1, createdOn: '2024-01-01T00:00:00Z', uncheckedItemCount: 3 },
      { id: 2, name: 'Hardware', type: 1, createdOn: '2024-01-02T00:00:00Z', uncheckedItemCount: 0 },
    ]
    mockShoppingListsGet.mockResolvedValue(mockData)
    render(<ListsPage />)
    await waitFor(() => { expect(screen.getByText('Groceries')).toBeInTheDocument() })
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

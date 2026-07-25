import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onlineManager } from '@tanstack/react-query'
import { render } from '@/__tests__/utils/test-utils'
import ListsPage from './page'
import { toast } from 'sonner'

const mockShoppingListsGet = jest.fn()
const mockShoppingListsPost = jest.fn()
const mockTemplatesGet = jest.fn()
const mockFromTemplatePost = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      checklists: {
        get: (...args: unknown[]) => mockShoppingListsGet(...args),
        post: (...args: unknown[]) => mockShoppingListsPost(...args),
        templates: { get: (...args: unknown[]) => mockTemplatesGet(...args) },
        fromTemplate: { post: (...args: unknown[]) => mockFromTemplatePost(...args) },
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

function setOnline(value: boolean) {
  // Covers every subscriber: the navigator property for components reading it directly
  // on first render, react-query's onlineManager singleton (which gates query fetch-pausing
  // and only reacts to a direct call, not the DOM event, before any query has subscribed),
  // and a real window event for useOnlineStatus's post-mount re-renders.
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
  onlineManager.setOnline(value)
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

describe('ListsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
    mockTemplatesGet.mockResolvedValue([])
  })

  afterEach(() => {
    localStorage.clear()
    setOnline(true)
  })

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

  it('should open create dialog when plus button is clicked', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('List name...')).toBeInTheDocument()
  })

  it('should create a checklist (type 0) by default and navigate to it', async () => {
    const user = userEvent.setup()
    const mockNewList = { id: 3, name: 'Chores', type: 0, createdOn: '2024-01-03T00:00:00Z' }
    mockShoppingListsGet.mockResolvedValue([])
    mockShoppingListsPost.mockResolvedValueOnce(mockNewList)
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.type(screen.getByPlaceholderText('List name...'), 'Chores')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => {
      expect(mockShoppingListsPost).toHaveBeenCalledWith({ name: 'Chores', type: 0, isTemplate: false })
    })
    expect(mockPush).toHaveBeenCalledWith('/lists/3')
  })

  it('should create a shopping list (type 1) when that mode is selected', async () => {
    const user = userEvent.setup()
    const mockNewList = { id: 4, name: 'Party Supplies', type: 1, createdOn: '2024-01-03T00:00:00Z' }
    mockShoppingListsGet.mockResolvedValue([])
    mockShoppingListsPost.mockResolvedValueOnce(mockNewList)
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.click(screen.getByRole('button', { name: 'Shopping list' }))
    await user.type(screen.getByPlaceholderText('List name...'), 'Party Supplies')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => {
      expect(mockShoppingListsPost).toHaveBeenCalledWith({ name: 'Party Supplies', type: 1, isTemplate: false })
    })
    expect(mockPush).toHaveBeenCalledWith('/lists/4')
  })

  it('should create a list from a template', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    mockTemplatesGet.mockResolvedValue([{ id: 7, name: 'Weekly Groceries', type: 1, itemCount: 5 }])
    mockFromTemplatePost.mockResolvedValueOnce({ id: 9, name: 'Weekly Groceries', type: 1, createdOn: '2024-01-03T00:00:00Z' })
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.click(screen.getByRole('button', { name: 'From template' }))
    await waitFor(() => {
      expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Weekly Groceries/ }))
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => {
      expect(mockFromTemplatePost).toHaveBeenCalledWith({ templateId: 7, name: 'Weekly Groceries' })
    })
    expect(mockPush).toHaveBeenCalledWith('/lists/9')
  })

  it('should disable Create when list name is empty', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
    expect(mockShoppingListsPost).not.toHaveBeenCalled()
  })

  it('should show error toast when create fails', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    mockShoppingListsPost.mockRejectedValueOnce(new Error('Server error'))
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.type(screen.getByPlaceholderText('List name...'), 'Fail List')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create list. Please try again.')
    })
  })

  it('should close the dialog when Cancel is clicked', async () => {
    const user = userEvent.setup()
    mockShoppingListsGet.mockResolvedValue([])
    render(<ListsPage />)
    await user.click(screen.getByRole('button', { name: 'New list' }))
    expect(screen.getByPlaceholderText('List name...')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('List name...')).not.toBeInTheDocument()
    })
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

  it('should still show cached lists after going offline', async () => {
    const mockData = [{ id: 1, name: 'Groceries', type: 1, createdOn: '2024-01-01T00:00:00Z' }]
    mockShoppingListsGet.mockResolvedValue(mockData)
    render(<ListsPage />)
    await waitFor(() => { expect(screen.getByText('Groceries')).toBeInTheDocument() })

    setOnline(false)

    await waitFor(() => { expect(screen.getByText('Groceries')).toBeInTheDocument() })
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument()
  })

  it('should show an offline message instead of a false empty state when there is no cached data', async () => {
    setOnline(false)
    mockShoppingListsGet.mockImplementation(() => new Promise(() => {}))
    render(<ListsPage />)
    await waitFor(() => {
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    })
    expect(screen.queryByText('No lists yet.')).not.toBeInTheDocument()
  })

  it('should disable the New list button while offline', async () => {
    setOnline(false)
    mockShoppingListsGet.mockResolvedValue([])
    render(<ListsPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New list' })).toBeDisabled()
    })
  })
})

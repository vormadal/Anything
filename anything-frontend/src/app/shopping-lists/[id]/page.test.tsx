import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import ShoppingListDetailPage from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockListGet = jest.fn()
const mockItemsGet = jest.fn()
const mockItemsPost = jest.fn()
const mockItemsItemPut = jest.fn()
const mockItemsItemDelete = jest.fn()
const mockCompletePost = jest.fn()
const mockItemsItemById = jest.fn(() => ({ put: mockItemsItemPut, delete: mockItemsItemDelete }))
const mockById = jest.fn(() => ({
  get: mockListGet,
  delete: jest.fn(),
  items: {
    get: mockItemsGet,
    post: mockItemsPost,
    byId: mockItemsItemById,
  },
  complete: { post: mockCompletePost },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      shoppingLists: {
        byId: (...args: unknown[]) => mockById(...args),
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
  useParams: () => ({ id: '1' }),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

const mockList = { id: 1, name: 'Groceries', createdOn: '2024-01-01T00:00:00Z' }

describe('ShoppingListDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
    mockListGet.mockResolvedValue(mockList)
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should render list name from API', async () => {
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })
  })

  it('should display loading state', () => {
    mockItemsGet.mockImplementation(() => new Promise(() => { /* never resolves */ }))

    render(<ShoppingListDetailPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error state', async () => {
    mockItemsGet.mockRejectedValue(new Error('API error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load items/i)).toBeInTheDocument()
    })
  })

  it('should display empty state in view mode', async () => {
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('No items yet. Switch to Edit mode to add items.')).toBeInTheDocument()
    })
  })

  it('should display items with checkboxes', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
      expect(screen.getByText('Bread')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('should toggle a checkbox when clicked', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockResolvedValueOnce(undefined)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    await waitFor(() => {
      expect(mockItemsItemById).toHaveBeenCalledWith(1)
      expect(mockItemsItemPut).toHaveBeenCalledWith({ name: 'Milk', isChecked: true })
    })
  })

  it('should show error when toggling checkbox fails', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update item. Please try again.')
    })
  })

  it('should switch to edit mode when Edit button is clicked', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('No items yet. Switch to Edit mode to add items.')).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: 'Edit' })
    await user.click(editButton)

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByText('No items yet. Add your first item above!')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add an item...')).toBeInTheDocument()
  })

  it('should return to view mode when Done button is clicked', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Add an item...')).not.toBeInTheDocument()
  })

  it('should add an item in edit mode', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])
    mockItemsPost.mockResolvedValueOnce({ id: 5, name: 'Butter', isChecked: false, shoppingListId: 1 })

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const input = screen.getByPlaceholderText('Add an item...')
    await user.type(input, 'Butter')

    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    await waitFor(() => {
      expect(mockItemsPost).toHaveBeenCalledWith({ name: 'Butter' })
    })

    expect(toast.success).toHaveBeenCalledWith('Item added')
    expect(input).toHaveValue('')
  })

  it('should not submit add item form when name is empty', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    expect(mockItemsPost).not.toHaveBeenCalled()
  })

  it('should show error when add item fails', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])
    mockItemsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const input = screen.getByPlaceholderText('Add an item...')
    await user.type(input, 'Eggs')

    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add item. Please try again.')
    })
  })

  it('should remove an item in edit mode', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemDelete.mockResolvedValueOnce(undefined)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const removeButton = screen.getByRole('button', { name: 'Remove' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockItemsItemById).toHaveBeenCalledWith(1)
      expect(mockItemsItemDelete).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Item removed')
  })

  it('should show error when remove fails', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemDelete.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to remove item. Please try again.')
    })
  })

  it('should enter inline edit mode when item name is clicked in edit mode', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const itemName = screen.getByRole('button', { name: 'Milk' })
    await user.click(itemName)

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('should save renamed item when Save is clicked', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockResolvedValueOnce(undefined)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const itemName = screen.getByRole('button', { name: 'Milk' })
    await user.click(itemName)

    const editInput = screen.getByDisplayValue('Milk')
    await user.clear(editInput)
    await user.type(editInput, 'Whole Milk')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockItemsItemPut).toHaveBeenCalledWith({ name: 'Whole Milk', isChecked: false })
    })

    expect(toast.success).toHaveBeenCalledWith('Item updated')
  })

  it('should cancel rename when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const itemName = screen.getByRole('button', { name: 'Milk' })
    await user.click(itemName)

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Milk' })).toBeInTheDocument()
  })

  it('should save renamed item when Enter key is pressed', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockResolvedValueOnce(undefined)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Milk' }))

    const editInput = screen.getByDisplayValue('Milk')
    await user.clear(editInput)
    await user.type(editInput, 'Skim Milk')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockItemsItemPut).toHaveBeenCalledWith({ name: 'Skim Milk', isChecked: false })
    })
  })

  it('should show error when rename fails', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Milk' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update item. Please try again.')
    })
  })

  it('should show complete button when less than 3 items are unchecked', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Almost done! 1 item remaining.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Mark Rest as Complete' })).toBeInTheDocument()
    })
  })

  it('should not show complete button when 3 or more items are unchecked', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: false, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: false, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Mark Rest as Complete' })).not.toBeInTheDocument()
  })

  it('should show all-checked banner when all items are checked', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: true, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('All items checked! Ready to complete the list?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Complete List' })).toBeInTheDocument()
    })
  })

  it('should complete the list and navigate to the new list', async () => {
    const user = userEvent.setup()
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
    ]
    const mockNewList = { id: 99, name: 'Groceries', createdOn: '2024-01-02T00:00:00Z' }
    mockItemsGet.mockResolvedValue(mockItems)
    mockCompletePost.mockResolvedValueOnce(mockNewList)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark Rest as Complete' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Mark Rest as Complete' }))

    await waitFor(() => {
      expect(mockCompletePost).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Shopping complete! A new list has been created.')
    expect(mockPush).toHaveBeenCalledWith('/shopping-lists/99')
  })

  it('should navigate to shopping lists when complete returns no id', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockCompletePost.mockResolvedValueOnce(null)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark Rest as Complete' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Mark Rest as Complete' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/shopping-lists')
    })
  })

  it('should show error when complete fails', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockCompletePost.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark Rest as Complete' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Mark Rest as Complete' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to complete list. Please try again.')
    })
  })

  it('should navigate back to shopping lists when back button is clicked', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    const backButton = screen.getByText('← Back to Shopping Lists')
    await user.click(backButton)

    expect(mockPush).toHaveBeenCalledWith('/shopping-lists')
  })

  it('should enter inline edit via keyboard (Enter key) in edit mode', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const itemName = screen.getByRole('button', { name: 'Milk' })
    itemName.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

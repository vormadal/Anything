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
      shoppingListRecommendations: {
        get: jest.fn().mockResolvedValue([]),
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
      expect(screen.getByText('No items yet.')).toBeInTheDocument()
    })
  })

  it('should display items with toggle buttons', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: false, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: false, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
      expect(screen.getByText('Bread')).toBeInTheDocument()
      expect(screen.getByText('Butter')).toBeInTheDocument()
    })

    // Unchecked items have "Check item" buttons
    const checkButtons = screen.getAllByRole('button', { name: 'Check item' })
    expect(checkButtons).toHaveLength(3)

    // Checked item has "Uncheck item" button
    expect(screen.getByRole('button', { name: 'Uncheck item' })).toBeInTheDocument()
  })

  it('should display amount and unit next to item name', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1, amount: 2, unit: 'l' },
      { id: 2, name: 'Eggs', isChecked: false, shoppingListId: 1, amount: 12, unit: null },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    expect(screen.getByText('2 l')).toBeInTheDocument()
    expect(screen.getByText('12×')).toBeInTheDocument()
  })

  it('should toggle item check when clicked', async () => {
    const user = userEvent.setup()
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: false, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: false, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: false, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockResolvedValueOnce(undefined)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    const checkButtons = screen.getAllByRole('button', { name: 'Check item' })
    await user.click(checkButtons[0])

    await waitFor(() => {
      expect(mockItemsItemById).toHaveBeenCalledWith(1)
      expect(mockItemsItemPut).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk', isChecked: true }))
    })
  })

  it('should toggle item check when checking an item with 3 or fewer unchecked', async () => {
    const user = userEvent.setup()
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockResolvedValueOnce(undefined)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Check item' }))

    await waitFor(() => {
      expect(mockItemsItemById).toHaveBeenCalledWith(1)
      expect(mockItemsItemPut).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk', isChecked: true }))
    })

    expect(mockCompletePost).not.toHaveBeenCalled()
  })

  it('should show error when check fails with few unchecked items', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Check item' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update item. Please try again.')
    })
  })

  it('should show error when toggling check fails', async () => {
    const user = userEvent.setup()
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: false, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: false, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: false, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    const checkButtons = screen.getAllByRole('button', { name: 'Check item' })
    await user.click(checkButtons[0])

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update item. Please try again.')
    })
  })

  it('should switch to edit mode when edit button is clicked', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('No items yet.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))

    expect(screen.getByRole('button', { name: 'Done editing' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add an item...')).toBeInTheDocument()
  })

  it('should return to view mode when done button is clicked', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit list' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))
    await user.click(screen.getByRole('button', { name: 'Done editing' }))

    expect(screen.getByRole('button', { name: 'Edit list' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Add an item...')).not.toBeInTheDocument()
  })

  it('should add an item in edit mode', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])
    mockItemsPost.mockResolvedValueOnce({ id: 5, name: 'Butter', isChecked: false, shoppingListId: 1 })

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit list' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))

    const input = screen.getByPlaceholderText('Add an item...')
    await user.type(input, 'Butter')

    await user.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => {
      expect(mockItemsPost).toHaveBeenCalledWith(expect.objectContaining({ name: 'Butter' }))
    })

    expect(toast.success).toHaveBeenCalledWith('Item added')
    expect(input).toHaveValue('')
  })

  it('should add an item with amount and unit', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])
    mockItemsPost.mockResolvedValueOnce({ id: 5, name: 'Milk', isChecked: false, shoppingListId: 1, amount: 2, unit: 'l' })

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit list' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))

    await user.type(screen.getByPlaceholderText('Add an item...'), 'Milk')
    await user.type(screen.getByPlaceholderText('Qty'), '2')
    await user.type(screen.getByPlaceholderText('Unit'), 'l')

    await user.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => {
      expect(mockItemsPost).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk', amount: 2, unit: 'l' }))
    })

    expect(toast.success).toHaveBeenCalledWith('Item added')
  })

  it('should not submit add item form when name is empty', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit list' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))

    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(mockItemsPost).not.toHaveBeenCalled()
  })

  it('should show error when add item fails', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])
    mockItemsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit list' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))

    await user.type(screen.getByPlaceholderText('Add an item...'), 'Eggs')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

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

    await user.click(screen.getByRole('button', { name: 'Edit list' }))

    await user.click(screen.getByRole('button', { name: 'Remove item' }))

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

    await user.click(screen.getByRole('button', { name: 'Edit list' }))
    await user.click(screen.getByRole('button', { name: 'Remove item' }))

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

    await user.click(screen.getByRole('button', { name: 'Edit list' }))

    const itemName = screen.getByRole('button', { name: 'Milk' })
    await user.click(itemName)

    expect(screen.getByRole('button', { name: 'Save item' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Milk')).toBeInTheDocument()
  })

  it('should save renamed item when save icon is clicked', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockResolvedValueOnce(undefined)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))
    await user.click(screen.getByRole('button', { name: 'Milk' }))

    const editInput = screen.getByDisplayValue('Milk')
    await user.clear(editInput)
    await user.type(editInput, 'Whole Milk')

    await user.click(screen.getByRole('button', { name: 'Save item' }))

    await waitFor(() => {
      expect(mockItemsItemPut).toHaveBeenCalledWith(expect.objectContaining({ name: 'Whole Milk', isChecked: false }))
    })

    expect(toast.success).toHaveBeenCalledWith('Item updated')
  })

  it('should save item with updated amount and unit', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1, amount: 1, unit: 'l' }]
    mockItemsGet.mockResolvedValue(mockItems)
    mockItemsItemPut.mockResolvedValueOnce(undefined)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))
    await user.click(screen.getByRole('button', { name: /Milk/i }))

    const qtyInput = screen.getByDisplayValue('1')
    await user.clear(qtyInput)
    await user.type(qtyInput, '2')

    await user.click(screen.getByRole('button', { name: 'Save item' }))

    await waitFor(() => {
      expect(mockItemsItemPut).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk', amount: 2, unit: 'l' }))
    })
  })

  it('should cancel rename when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))
    await user.click(screen.getByRole('button', { name: 'Milk' }))

    expect(screen.getByDisplayValue('Milk')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByDisplayValue('Milk')).not.toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Edit list' }))
    await user.click(screen.getByRole('button', { name: 'Milk' }))

    const editInput = screen.getByDisplayValue('Milk')
    await user.clear(editInput)
    await user.type(editInput, 'Skim Milk')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockItemsItemPut).toHaveBeenCalledWith(expect.objectContaining({ name: 'Skim Milk', isChecked: false }))
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

    await user.click(screen.getByRole('button', { name: 'Edit list' }))
    await user.click(screen.getByRole('button', { name: 'Milk' }))
    await user.click(screen.getByRole('button', { name: 'Save item' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update item. Please try again.')
    })
  })

  it('should show complete list button when all items are checked', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: true, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: true, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Complete List' })).toBeInTheDocument()
    })
  })

  it('should not show complete list button when some items are unchecked', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: false, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: false, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: false, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Complete List' })).not.toBeInTheDocument()
  })

  it('should complete the list and navigate to the new list', async () => {
    const user = userEvent.setup()
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: true, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: true, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: true, shoppingListId: 1 },
    ]
    const mockNewList = { id: 99, name: 'Groceries', createdOn: '2024-01-02T00:00:00Z' }
    mockItemsGet.mockResolvedValue(mockItems)
    mockCompletePost.mockResolvedValueOnce(mockNewList)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Complete List' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Complete List' }))

    await waitFor(() => {
      expect(mockCompletePost).toHaveBeenCalled()
    })

    expect(toast.success).toHaveBeenCalledWith('Shopping complete!')
    expect(mockPush).toHaveBeenCalledWith('/shopping-lists/99')
  })

  it('should navigate to shopping lists when complete returns no id', async () => {
    const user = userEvent.setup()
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: true, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: true, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)
    mockCompletePost.mockResolvedValueOnce(null)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Complete List' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Complete List' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/shopping-lists')
    })
  })

  it('should show error when complete fails', async () => {
    const user = userEvent.setup()
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: true, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: true, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)
    mockCompletePost.mockRejectedValueOnce(new Error('Server error'))

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Complete List' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Complete List' }))

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

  it('should enter inline edit via keyboard in edit mode', async () => {
    const user = userEvent.setup()
    const mockItems = [{ id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 }]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit list' }))

    const itemName = screen.getByRole('button', { name: 'Milk' })
    itemName.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'Save item' })).toBeInTheDocument()
  })

  it('should sort checked items to the bottom', async () => {
    const mockItems = [
      { id: 1, name: 'Milk', isChecked: false, shoppingListId: 1 },
      { id: 2, name: 'Bread', isChecked: true, shoppingListId: 1 },
      { id: 3, name: 'Eggs', isChecked: false, shoppingListId: 1 },
      { id: 4, name: 'Butter', isChecked: true, shoppingListId: 1 },
    ]
    mockItemsGet.mockResolvedValue(mockItems)

    render(<ShoppingListDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument()
    })

    const items = screen.getAllByRole('listitem')
    const itemTexts = items.map((item) => item.textContent)

    // Unchecked items (Milk, Eggs) should come before checked items (Bread, Butter)
    const milkIndex = itemTexts.findIndex((t) => t?.includes('Milk'))
    const eggsIndex = itemTexts.findIndex((t) => t?.includes('Eggs'))
    const breadIndex = itemTexts.findIndex((t) => t?.includes('Bread'))
    const butterIndex = itemTexts.findIndex((t) => t?.includes('Butter'))

    expect(milkIndex).toBeLessThan(breadIndex)
    expect(eggsIndex).toBeLessThan(breadIndex)
    expect(milkIndex).toBeLessThan(butterIndex)
    expect(eggsIndex).toBeLessThan(butterIndex)
  })
})

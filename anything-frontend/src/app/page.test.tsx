import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import Home from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockSomethingsGet = jest.fn()
const mockSomethingsPost = jest.fn()
const mockSomethingsByIdDelete = jest.fn()
const mockSomethingsById = jest.fn(() => ({ delete: mockSomethingsByIdDelete }))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      somethings: {
        get: (...args: unknown[]) => mockSomethingsGet(...args),
        post: (...args: unknown[]) => mockSomethingsPost(...args),
        byId: (...args: unknown[]) => mockSomethingsById(...args),
      },
    },
  },
}))

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

describe('Home Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up localStorage with a mock user
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should render the page with description', () => {
    mockSomethingsGet.mockResolvedValue([])

    render(<Home />)

    expect(
      screen.getByText('Create anything you want - lists, inventory, and more')
    ).toBeInTheDocument()
  })

  it('should display loading state initially', () => {
    mockSomethingsGet.mockImplementation(
      () => new Promise(() => { /* Never resolves to keep loading state */ })
    )

    render(<Home />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error message when API fails', async () => {
    mockSomethingsGet.mockRejectedValue(new Error('API error'))

    render(<Home />)

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load items/i)
      ).toBeInTheDocument()
    })
  })

  it('should display empty state when no items exist', async () => {
    mockSomethingsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(
        screen.getByText('No items yet. Create your first one above!')
      ).toBeInTheDocument()
    })
  })

  it('should display list of somethings', async () => {
    const mockData = [
      { id: 1, name: 'Test Item 1', createdOn: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Test Item 2', createdOn: '2024-01-02T00:00:00Z' },
    ]

    mockSomethingsGet.mockResolvedValue(mockData)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument()
      expect(screen.getByText('Test Item 2')).toBeInTheDocument()
    })
  })

  it('should create a new something when form is submitted', async () => {
    const user = userEvent.setup()
    const mockExistingData = [
      { id: 1, name: 'Existing Item', createdOn: '2024-01-01T00:00:00Z' },
    ]
    const mockNewItem = {
      id: 2,
      name: 'New Item',
      createdOn: '2024-01-02T00:00:00Z',
    }

    mockSomethingsGet
      .mockResolvedValueOnce(mockExistingData)
      .mockResolvedValueOnce([...mockExistingData, mockNewItem])
    mockSomethingsPost.mockResolvedValueOnce(mockNewItem)

    render(<Home />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Existing Item')).toBeInTheDocument()
    })

    // Fill in the form
    const input = screen.getByPlaceholderText('What do you want to create?')
    await user.type(input, 'New Item')

    // Submit the form
    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    // Verify POST was made via apiClient
    await waitFor(() => {
      expect(mockSomethingsPost).toHaveBeenCalledWith({ name: 'New Item' })
    })

    // Verify success toast was called
    expect(toast.success).toHaveBeenCalledWith('Item created successfully')

    // Verify input is cleared
    expect(input).toHaveValue('')
  })

  it('should not submit form when input is empty', async () => {
    const user = userEvent.setup()

    mockSomethingsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('No items yet. Create your first one above!')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    // Verify no POST was made (only the initial GET)
    expect(mockSomethingsPost).not.toHaveBeenCalled()
  })

  it('should delete a something when delete button is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [
      { id: 1, name: 'Item to Delete', createdOn: '2024-01-01T00:00:00Z' },
    ]

    mockSomethingsGet
      .mockResolvedValueOnce(mockData)
      .mockResolvedValueOnce([])
    mockSomethingsByIdDelete.mockResolvedValueOnce(undefined)

    render(<Home />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Item to Delete')).toBeInTheDocument()
    })

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)

    // Verify DELETE was made via apiClient
    await waitFor(() => {
      expect(mockSomethingsById).toHaveBeenCalledWith(1)
      expect(mockSomethingsByIdDelete).toHaveBeenCalled()
    })

    // Verify success toast was called
    expect(toast.success).toHaveBeenCalledWith('Item deleted successfully')
  })

  it('should show loading state on add button when creating', async () => {
    const user = userEvent.setup()

    mockSomethingsGet.mockResolvedValueOnce([])
    mockSomethingsPost.mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => resolve({ id: 1, name: 'Test', createdOn: '2024-01-01T00:00:00Z' }), 100)
      })
    )

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('No items yet. Create your first one above!')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('What do you want to create?')
    await user.type(input, 'Test')

    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    // Should show "Adding..." while pending
    expect(screen.getByRole('button', { name: 'Adding...' })).toBeInTheDocument()
  })

  it('should preserve form input when create fails', async () => {
    const user = userEvent.setup()

    mockSomethingsGet.mockResolvedValueOnce([])
    mockSomethingsPost.mockRejectedValueOnce(new Error('Server error'))

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('No items yet. Create your first one above!')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('What do you want to create?')
    await user.type(input, 'Will Fail')

    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    // Wait for the mutation to settle
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled()
    })

    // Input should still contain the text since creation failed
    expect(input).toHaveValue('Will Fail')

    // Verify error toast was called
    expect(toast.error).toHaveBeenCalledWith('Failed to create item. Please try again.')
  })

  it('should keep existing items visible when delete fails', async () => {
    const user = userEvent.setup()
    const mockData = [
      { id: 1, name: 'Persistent Item', createdOn: '2024-01-01T00:00:00Z' },
    ]

    mockSomethingsGet
      .mockResolvedValueOnce(mockData)
      .mockResolvedValueOnce(mockData)
    mockSomethingsByIdDelete.mockRejectedValueOnce(new Error('Server error'))

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Persistent Item')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)

    // Wait for mutation to settle
    await waitFor(() => {
      expect(deleteButton).not.toBeDisabled()
    })

    // Item should still be visible after failed delete
    expect(screen.getByText('Persistent Item')).toBeInTheDocument()

    // Verify error toast was called
    expect(toast.error).toHaveBeenCalledWith('Failed to delete item. Please try again.')
  })
})

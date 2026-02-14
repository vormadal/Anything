import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import Home from './page'

// Mock fetch globally
global.fetch = jest.fn()

describe('Home Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the page with title and description', () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    })

    render(<Home />)

    expect(screen.getByText('Anything')).toBeInTheDocument()
    expect(
      screen.getByText('Create anything you want - lists, inventory, and more')
    ).toBeInTheDocument()
  })

  it('should display loading state initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves to keep loading state
        })
    )

    render(<Home />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error message when API fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    })

    render(<Home />)

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load items/i)
      ).toBeInTheDocument()
    })
  })

  it('should display empty state when no items exist', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    })

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

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    })

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

    ;(global.fetch as jest.Mock)
      // Initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockExistingData,
      })
      // Create POST
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewItem,
      })
      // Refetch after creation
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [...mockExistingData, mockNewItem],
      })

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

    // Verify POST request was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/somethings',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'New Item' }),
        })
      )
    })

    // Verify input is cleared
    expect(input).toHaveValue('')
  })

  it('should not submit form when input is empty', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('No items yet. Create your first one above!')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    // Verify no POST request was made (only the initial GET)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should delete a something when delete button is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [
      { id: 1, name: 'Item to Delete', createdOn: '2024-01-01T00:00:00Z' },
    ]

    ;(global.fetch as jest.Mock)
      // Initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })
      // Delete request
      .mockResolvedValueOnce({
        ok: true,
      })
      // Refetch after deletion
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

    render(<Home />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Item to Delete')).toBeInTheDocument()
    })

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)

    // Verify DELETE request was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/somethings/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  it('should show loading state on add button when creating', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 1, name: 'Test', createdOn: '2024-01-01T00:00:00Z' }),
                }),
              100
            )
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
})

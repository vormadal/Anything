import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onlineManager } from '@tanstack/react-query'
import { render } from '@/__tests__/utils/test-utils'
import { GeneralChecklistView } from './GeneralChecklistView'
import { toast } from 'sonner'

const mockItemsGet = jest.fn()
const mockItemsItemPut = jest.fn()
const mockItemsReorderPut = jest.fn()
const mockCompletePost = jest.fn()
const mockDelete = jest.fn()
const mockItemsItemById: jest.Mock = jest.fn(() => ({ put: mockItemsItemPut, delete: jest.fn() }))
const mockById: jest.Mock = jest.fn(() => ({
  get: jest.fn(),
  put: jest.fn(),
  delete: mockDelete,
  items: { get: mockItemsGet, post: jest.fn(), byItemId: mockItemsItemById, reorder: { put: mockItemsReorderPut } },
  complete: { post: mockCompletePost },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      checklists: {
        byId: (...args: unknown[]) => mockById(...args),
      },
    },
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/lists/1',
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

function setOnline(value: boolean) {
  // Covers all three readers: navigator for components reading it directly,
  // react-query's onlineManager (which gates query pausing and only reacts to a
  // direct call), and a real event for useOnlineStatus's post-mount re-render.
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
  onlineManager.setOnline(value)
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

describe('GeneralChecklistView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
    setOnline(true)
  })

  it('shows loading state', () => {
    mockItemsGet.mockImplementation(() => new Promise(() => {}))
    render(<GeneralChecklistView listId={1} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it("says items couldn't be loaded when the request fails, instead of the empty state", async () => {
    mockItemsGet.mockRejectedValue(new Error('API error'))
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => { expect(screen.getByText("Couldn't load items")).toBeInTheDocument() })
    expect(screen.queryByText('No items yet.')).not.toBeInTheDocument()
  })

  it('says so when offline with nothing cached, rather than rendering nothing', async () => {
    // Offline, React Query pauses the query instead of failing it: not loading,
    // not errored, and `items` is undefined rather than [], so the old
    // isLoading/error/isEmpty props left the page completely blank.
    setOnline(false)
    mockItemsGet.mockImplementation(() => new Promise(() => {}))

    render(<GeneralChecklistView listId={1} />)

    await waitFor(() => { expect(screen.getByText("Couldn't load items")).toBeInTheDocument() })
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    expect(mockItemsGet).not.toHaveBeenCalled()
  })

  it('shows cached items while offline instead of a failure', async () => {
    mockItemsGet.mockResolvedValue([{ id: 1, name: 'Task A', isChecked: false }])
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => { expect(screen.getByText('Task A')).toBeInTheDocument() })

    setOnline(false)

    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.queryByText("Couldn't load items")).not.toBeInTheDocument()
  })

  it('shows empty state', async () => {
    mockItemsGet.mockResolvedValue([])
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => { expect(screen.getByText('No items yet.')).toBeInTheDocument() })
  })

  it('renders unchecked items first then checked items', async () => {
    const mockItems = [
      { id: 1, name: 'Task A', isChecked: false },
      { id: 2, name: 'Task B', isChecked: true },
      { id: 3, name: 'Task C', isChecked: false },
    ]
    mockItemsGet.mockResolvedValue(mockItems)
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => { expect(screen.getByText('Task A')).toBeInTheDocument() })
    const checkButtons = screen.getAllByRole('button', { name: 'Check item' })
    expect(checkButtons).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Uncheck item' })).toBeInTheDocument()
  })

  it('shows the most recently checked item first among checked items', async () => {
    const mockItems = [
      { id: 1, name: 'Checked earlier', isChecked: true, modifiedOn: new Date('2024-01-01T00:00:00Z') },
      { id: 2, name: 'Unchecked', isChecked: false },
      { id: 3, name: 'Checked latest', isChecked: true, modifiedOn: new Date('2024-01-03T00:00:00Z') },
      { id: 4, name: 'Checked in between', isChecked: true, modifiedOn: new Date('2024-01-02T00:00:00Z') },
    ]
    mockItemsGet.mockResolvedValue(mockItems)
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => { expect(screen.getByText('Checked latest')).toBeInTheDocument() })
    const names = screen.getAllByRole('listitem').map((row) => row.textContent)
    expect(names).toEqual([
      'Unchecked',
      'Checked latest',
      'Checked in between',
      'Checked earlier',
    ])
  })

  it('toggles item check', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([{ id: 1, name: 'Task A', isChecked: false }])
    mockItemsItemPut.mockResolvedValue(undefined)
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => expect(screen.getByText('Task A')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Check item' }))
    await waitFor(() => {
      expect(mockItemsItemPut).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Task A', isChecked: true, amount: null, unit: null })
      )
    })
  })

  it('does not show close list button when unchecked items remain', async () => {
    mockItemsGet.mockResolvedValue([{ id: 1, name: 'Task A', isChecked: false }])
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => expect(screen.getByText('Task A')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Close List/i })).not.toBeInTheDocument()
  })

  it('shows close list button when all items are checked', async () => {
    mockItemsGet.mockResolvedValue([{ id: 1, name: 'Task A', isChecked: true }])
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => expect(screen.getByText('Task A')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Close List/i })).toBeInTheDocument()
  })

  it('closes list when close list button is clicked', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([{ id: 1, name: 'Task A', isChecked: true }])
    mockDelete.mockResolvedValue(undefined)
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Close List/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Close List/i }))
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('List closed')
    })
  })

  it('shows error toast when toggle fails', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([{ id: 1, name: 'Task A', isChecked: false }])
    mockItemsItemPut.mockRejectedValue(new Error('fail'))
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => expect(screen.getByText('Task A')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Check item' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update item. Please try again.')
    })
  })
})

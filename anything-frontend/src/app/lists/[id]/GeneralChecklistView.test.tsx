import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import { GeneralChecklistView } from './GeneralChecklistView'
import { toast } from 'sonner'

const mockItemsGet = jest.fn()
const mockItemsItemPut = jest.fn()
const mockItemsItemDelete = jest.fn()
const mockCompletePost = jest.fn()
const mockItemsItemById = jest.fn(() => ({ put: mockItemsItemPut, delete: mockItemsItemDelete }))
const mockById = jest.fn(() => ({
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  items: { get: mockItemsGet, post: jest.fn(), byItemId: mockItemsItemById },
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

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/lists/1',
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

describe('GeneralChecklistView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => { localStorage.clear() })

  it('shows loading state', () => {
    mockItemsGet.mockImplementation(() => new Promise(() => {}))
    render(<GeneralChecklistView listId={1} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
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

  it('shows Complete List button', async () => {
    mockItemsGet.mockResolvedValue([{ id: 1, name: 'Task A', isChecked: false }])
    render(<GeneralChecklistView listId={1} />)
    await waitFor(() => expect(screen.getByText('Task A')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Complete List/i })).toBeInTheDocument()
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

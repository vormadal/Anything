import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import { GeneralChecklistEditMode } from './GeneralChecklistEditMode'
import { toast } from 'sonner'
import { useRef } from 'react'

const mockItemsGet = jest.fn()
const mockItemsPost = jest.fn()
const mockItemsItemDelete = jest.fn()
const mockItemsReorderPut = jest.fn()
const mockItemsItemById = jest.fn(() => ({ delete: mockItemsItemDelete }))
const mockListPut = jest.fn()
const mockById = jest.fn(() => ({
  get: jest.fn(),
  put: mockListPut,
  delete: jest.fn(),
  items: { get: mockItemsGet, post: mockItemsPost, byItemId: mockItemsItemById, reorder: { put: mockItemsReorderPut } },
  complete: { post: jest.fn() },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      shoppingLists: {
        byId: (...args: unknown[]) => mockById(...args),
        reorder: { put: jest.fn() },
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

function Wrapper({ list }: { list?: { id?: number; name?: string } }) {
  const ref = useRef<() => void>(() => {})
  return (
    <GeneralChecklistEditMode
      listId={1}
      list={list}
      openEditNameDialogRef={ref}
    />
  )
}

describe('GeneralChecklistEditMode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => { localStorage.clear() })

  it('shows empty state', async () => {
    mockItemsGet.mockResolvedValue([])
    render(<Wrapper />)
    await waitFor(() => { expect(screen.getByText('No items yet.')).toBeInTheDocument() })
  })

  it('shows add item form with name only (no amount/unit)', async () => {
    mockItemsGet.mockResolvedValue([])
    render(<Wrapper />)
    expect(screen.getByPlaceholderText('Add an item...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Qty')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Unit')).not.toBeInTheDocument()
  })

  it('adds an item', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([])
    mockItemsPost.mockResolvedValue({ id: 1, name: 'New Task' })
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('Add an item...')
    await user.type(input, 'New Task')
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await waitFor(() => {
      expect(mockItemsPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Task', amount: null, unit: null })
      )
    })
    expect(toast.success).toHaveBeenCalledWith('Item added')
  })

  it('shows items with delete buttons', async () => {
    mockItemsGet.mockResolvedValue([
      { id: 1, name: 'Task 1' },
      { id: 2, name: 'Task 2' },
    ])
    render(<Wrapper />)
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
    })
    const removeButtons = screen.getAllByRole('button', { name: 'Remove item' })
    expect(removeButtons).toHaveLength(2)
    const dragButtons = screen.getAllByRole('button', { name: 'Drag to reorder item' })
    expect(dragButtons).toHaveLength(2)
  })

  it('removes an item', async () => {
    const user = userEvent.setup()
    mockItemsGet.mockResolvedValue([{ id: 1, name: 'Task 1' }])
    mockItemsItemDelete.mockResolvedValue(undefined)
    render(<Wrapper />)
    await waitFor(() => expect(screen.getByText('Task 1')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Remove item' }))
    await waitFor(() => {
      expect(mockItemsItemDelete).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Item removed')
    })
  })
})

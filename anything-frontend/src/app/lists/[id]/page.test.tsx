import { screen, waitFor } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import ListDetailPage from './page'

const mockGet = jest.fn()
const mockDelete = jest.fn()
const mockItemsGet = jest.fn()
const mockCompletePost = jest.fn()
const mockItemsItemById = jest.fn(() => ({ put: jest.fn(), delete: jest.fn() }))
const mockById = jest.fn(() => ({
  get: mockGet,
  delete: mockDelete,
  put: jest.fn(),
  items: { get: mockItemsGet, post: jest.fn(), byItemId: mockItemsItemById },
  complete: { post: mockCompletePost },
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

const mockPush = jest.fn()
const mockBack = jest.fn()
// Use a stable object reference so useRouter() returns the same object on every render,
// preventing infinite re-render loops caused by the useEffect dependency on router.
const mockRouter = { push: mockPush, back: mockBack }
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: '1' }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => '/lists/1',
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

jest.mock('@/hooks/useRecommendations', () => ({
  useApprovedRecommendations: () => ({ data: [] }),
}))

describe('ListDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => { localStorage.clear() })

  it('renders ShoppingListView for Shopping type (type=1)', async () => {
    mockGet.mockResolvedValue({ id: 1, name: 'Grocery Run', type: 1 })
    mockItemsGet.mockResolvedValue([])
    render(<ListDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Grocery Run')).toBeInTheDocument()
    })
  })

  it('renders GeneralChecklistView for General type (type=0)', async () => {
    mockGet.mockResolvedValue({ id: 1, name: 'My Checklist', type: 0 })
    mockItemsGet.mockResolvedValue([])
    render(<ListDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('My Checklist')).toBeInTheDocument()
    })
  })

  it('renders when list data is loading', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))
    mockItemsGet.mockImplementation(() => new Promise(() => {}))
    render(<ListDetailPage />)
    expect(screen.getByText('List')).toBeInTheDocument()
  })
})

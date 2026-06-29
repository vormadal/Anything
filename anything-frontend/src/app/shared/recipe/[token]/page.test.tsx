import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import SharedRecipePage from './page'

const mockApiFetch = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiClient: {
    api: {
      households: {
        get: jest.fn().mockResolvedValue([]),
      },
    },
  },
}))

jest.mock('@/hooks/useAuth', () => ({
  useIsAuthenticated: () => mockIsAuthenticated(),
  useCurrentUser: () => ({ data: null }),
  getUser: () => mockGetUser(),
}))

let mockIsAuthenticated = () => false
let mockGetUser = () => null as null | { email: string; name: string; role: string }

jest.mock('@/hooks/useHouseholds', () => ({
  useHouseholds: () => ({ data: mockHouseholds }),
}))
let mockHouseholds: { id: number; name: string; createdOn: string; role: string }[] = []

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ token: 'test-token-123' }),
  usePathname: () => '/shared/recipe/test-token-123',
  useSearchParams: () => ({ get: jest.fn() }),
}))
const mockPush = jest.fn()

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

const mockRecipe = {
  recipeId: 42,
  recipeName: 'Chocolate Cake',
  notes: 'A delicious cake.',
  cookTimeMinutes: 60,
  servings: 8,
  servingsType: 'People',
  ingredients: [
    { name: 'Flour', amount: 200, unit: 'g', group: null, sortOrder: 0 },
    { name: 'Sugar', amount: 150, unit: 'g', group: null, sortOrder: 1 },
  ],
  steps: [
    { description: 'Mix dry ingredients', sortOrder: 0 },
    { description: 'Bake at 180°C for 45 min', sortOrder: 1 },
  ],
  tags: ['dessert', 'cake'],
  imageUrls: [],
  isExpired: false,
  isTargeted: false,
  targetEmail: null,
}

// Routes apiFetch calls: the share GET (`/shared/recipes/{token}`) returns the
// supplied recipe, while the clone POST (`.../clone`) returns the new recipe id.
function setupApiFetch(sharedResponse: { ok: boolean; json?: () => Promise<unknown> }) {
  mockApiFetch.mockImplementation((path: string) => {
    if (typeof path === 'string' && path.includes('/clone')) {
      return Promise.resolve({ ok: true, json: async () => ({ id: 99 }) })
    }
    return Promise.resolve(sharedResponse)
  })
}

describe('SharedRecipePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAuthenticated = () => false
    mockGetUser = () => null
    mockHouseholds = []
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows login prompt for targeted share when not authenticated', async () => {
    setupApiFetch({
      ok: true,
      json: async () => ({
        ...mockRecipe,
        isTargeted: true,
        targetEmail: 'alice@example.com',
      }),
    })

    render(<SharedRecipePage />)
    await waitFor(() => expect(screen.getByText(/Log in/)).toBeInTheDocument())
    expect(screen.queryByText('Copy to my recipes')).not.toBeInTheDocument()
  })

  it('shows not found when fetch fails', async () => {
    setupApiFetch({ ok: false })

    render(<SharedRecipePage />)
    await waitFor(() => expect(screen.getByText('Link not found')).toBeInTheDocument())
  })

  it('clones recipe and navigates on success', async () => {
    setupApiFetch({
      ok: true,
      json: async () => ({
        ...mockRecipe,
        isTargeted: true,
        targetEmail: 'alice@example.com',
      }),
    })
    mockIsAuthenticated = () => true
    mockGetUser = () => ({ email: 'alice@example.com', name: 'Alice', role: 'User' })
    mockHouseholds = [{ id: 5, name: 'Alice Home', createdOn: '2025-01-01', role: 'Owner' }]

    render(<SharedRecipePage />)
    await waitFor(() => expect(screen.getByText('Copy to my recipes')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Copy to my recipes'))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/recipes/99'))
  })
})

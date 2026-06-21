import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import SharedRecipePage from './page'

const mockApiFetch = jest.fn()
const mockFetch = jest.fn()

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

describe('SharedRecipePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAuthenticated = () => false
    mockGetUser = () => null
    mockHouseholds = []
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows login prompt for targeted share when not authenticated', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockRecipe,
        isTargeted: true,
        targetEmail: 'alice@example.com',
      }),
    })

    render(<SharedRecipePage />)
    await waitFor(() => expect(screen.getByText(/Log in/)).toBeInTheDocument())
    expect(screen.queryByText('Clone recipe')).not.toBeInTheDocument()
  })

  it('shows not found when fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false })

    render(<SharedRecipePage />)
    await waitFor(() => expect(screen.getByText('Link not found')).toBeInTheDocument())
  })

  it('clones recipe and navigates on success', async () => {
    mockFetch.mockResolvedValue({
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
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 99 }) })

    render(<SharedRecipePage />)
    await waitFor(() => expect(screen.getByText('Clone recipe')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Clone recipe'))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/recipes/99'))
  })
})

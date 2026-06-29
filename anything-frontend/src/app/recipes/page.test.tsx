import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import RecipesPage from './page'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

const mockFoodPlansGet = jest.fn()
const mockFoodPlanEntriesPost = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: {
        get: (config?: { queryParameters?: { search?: string; tag?: string } }) => {
          const qp = config?.queryParameters
          const params = new URLSearchParams()
          if (qp?.search) params.set('search', qp.search)
          if (qp?.tag) params.set('tag', qp.tag)
          const q = params.toString()
          return mockFetch(`/api/recipes${q ? `?${q}` : ''}`).then((r: Response) => {
            if (!r.ok) throw new Error(`Failed to fetch recipes: ${r.status}`)
            return r.json()
          })
        },
        tags: {
          get: (config?: { queryParameters?: { count?: number } }) =>
            mockFetch(`/api/recipes/tags?count=${config?.queryParameters?.count ?? 10}`).then((r: Response) => {
              if (!r.ok) throw new Error(`Failed to fetch top tags: ${r.status}`)
              return r.json()
            }),
        },
      },
      checklists: {
        get: jest.fn().mockResolvedValue([]),
        post: jest.fn(),
        byId: jest.fn(() => ({
          get: jest.fn(),
          delete: jest.fn(),
          items: { get: jest.fn(), post: jest.fn(), byId: jest.fn() },
          complete: { post: jest.fn() },
        })),
      },
      foodPlans: {
        get: (...args: unknown[]) => mockFoodPlansGet(...args),
        post: jest.fn(),
        byId: jest.fn(() => ({
          get: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
          entries: { get: jest.fn(), post: (...args: unknown[]) => mockFoodPlanEntriesPost(...args), byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
          addToShoppingList: { post: jest.fn() },
        })),
      },
    },
  },
}))

// Mock PageActionsContext
const mockSetHeaderActions = jest.fn()
jest.mock('@/context/PageActionsContext', () => ({
  PageActionsProvider: ({ children }: { children: React.ReactNode }) => children,
  useHeaderActions: () => ({
    headerActions: null,
    hideTitle: false,
    setHeaderActions: mockSetHeaderActions,
    setPageTitle: jest.fn(),
  }),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => '/recipes',
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

function makeJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response)
}

describe('RecipesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFoodPlansGet.mockResolvedValue([])
    // Default fetch responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes/') && url.includes('/images')) return makeJsonResponse([])
      if (url.includes('/api/recipes/') && url.includes('/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes')) return makeJsonResponse([])
      return makeJsonResponse([])
    })
  })

  it('should display loading state initially', () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes')) return new Promise(() => {})
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error message when API fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes')) return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response)
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load recipes/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no recipes exist', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes')) return makeJsonResponse([])
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText(/No recipes yet/)).toBeInTheDocument()
    })
  })

  it('should display recipe cards', async () => {
    const mockData = [
      { id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Salad', createdOn: '2024-01-02T00:00:00Z' },
    ]
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes/1/') || url.includes('/api/recipes/2/')) return makeJsonResponse([])
      if (url.includes('/api/recipes')) return makeJsonResponse(mockData)
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
      expect(screen.getByText('Salad')).toBeInTheDocument()
    })
  })

  it('should navigate to recipe when card is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }]
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes/1/')) return makeJsonResponse([])
      if (url.includes('/api/recipes')) return makeJsonResponse(mockData)
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const card = screen.getByRole('button', { name: /Pasta/ })
    await user.click(card)

    expect(mockPush).toHaveBeenCalledWith('/recipes/1')
  })

  it('should register header actions for create button', async () => {
    render(<RecipesPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })
  })

  it('should show always-visible search bar in page body', async () => {
    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /Search recipes/i })).toBeInTheDocument()
    })
  })

  it('should show tag suggestion chips when top tags are loaded', async () => {
    const topTags = [
      { name: 'Italian', count: 5 },
      { name: 'Vegan', count: 3 },
    ]
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse(topTags)
      if (url.includes('/api/recipes')) return makeJsonResponse([])
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Italian' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Vegan' })).toBeInTheDocument()
    })
  })

  it('should filter by tag when tag chip is clicked', async () => {
    const user = userEvent.setup()
    const topTags = [{ name: 'Italian', count: 5 }]
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse(topTags)
      if (url.includes('/api/recipes')) return makeJsonResponse([])
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Italian' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Italian' }))

    await waitFor(() => {
      // Tag chip should be active (aria-pressed=true)
      expect(screen.getByRole('button', { name: 'Italian' })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('should show "no matches" message when filter yields no results', async () => {
    const topTags = [{ name: 'Italian', count: 5 }]
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse(topTags)
      if (url.includes('/api/recipes')) return makeJsonResponse([])
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    const input = await screen.findByRole('textbox', { name: /Search recipes/i })
    await userEvent.type(input, 'xyz')

    await waitFor(() => {
      expect(screen.getByText(/No recipes match your search/i)).toBeInTheDocument()
    })
  })

  it('should show add-to-food-plan button on each recipe card', async () => {
    const mockData = [{ id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }]
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes/1/')) return makeJsonResponse([])
      if (url.includes('/api/recipes')) return makeJsonResponse(mockData)
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Add to food plan/i })).toBeInTheDocument()
  })

  it('should display recipe cards with time and servings when set', async () => {
    const mockData = [
      { id: 1, name: 'Pancakes', cookTimeMinutes: 20, servings: 8, servingsType: 'Pieces', createdOn: '2024-01-01T00:00:00Z' },
    ]
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/recipes/tags')) return makeJsonResponse([])
      if (url.includes('/api/recipes/1/')) return makeJsonResponse([])
      if (url.includes('/api/recipes')) return makeJsonResponse(mockData)
      return makeJsonResponse([])
    })

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
      expect(screen.getByText('20 min')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })
})


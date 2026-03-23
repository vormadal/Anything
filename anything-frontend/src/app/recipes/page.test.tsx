import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import RecipesPage from './page'

// Mock the apiClient module
const mockRecipesGet = jest.fn()
const mockImagesGet = jest.fn()
const mockFoodPlansGet = jest.fn()
const mockFoodPlanEntriesPost = jest.fn()
const mockRecipesById = jest.fn(() => ({
  delete: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  ingredients: { get: jest.fn(), post: jest.fn(), byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
  steps: { get: jest.fn(), post: jest.fn(), byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
  images: { get: (...args: unknown[]) => mockImagesGet(...args), post: jest.fn(), byId: jest.fn(() => ({ delete: jest.fn() })) },
  addToShoppingList: { post: jest.fn() },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      recipes: {
        get: (...args: unknown[]) => mockRecipesGet(...args),
        post: jest.fn(),
        byId: (...args: unknown[]) => mockRecipesById(...args),
      },
      shoppingLists: {
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

describe('RecipesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockImagesGet.mockResolvedValue([])
    mockFoodPlansGet.mockResolvedValue([])
  })

  it('should display loading state initially', () => {
    mockRecipesGet.mockImplementation(() => new Promise(() => {}))

    render(<RecipesPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error message when API fails', async () => {
    mockRecipesGet.mockRejectedValue(new Error('API error'))

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load recipes/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no recipes exist', async () => {
    mockRecipesGet.mockResolvedValue([])

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
    mockRecipesGet.mockResolvedValue(mockData)

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
      expect(screen.getByText('Salad')).toBeInTheDocument()
    })
  })

  it('should navigate to recipe when card is clicked', async () => {
    const user = userEvent.setup()
    const mockData = [{ id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }]
    mockRecipesGet.mockResolvedValue(mockData)

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const card = screen.getByRole('button', { name: /Pasta/ })
    await user.click(card)

    expect(mockPush).toHaveBeenCalledWith('/recipes/1')
  })

  it('should register header actions for search and create', async () => {
    mockRecipesGet.mockResolvedValue([])

    render(<RecipesPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })
  })

  it('should show add-to-food-plan button on each recipe card', async () => {
    const mockData = [{ id: 1, name: 'Pasta', createdOn: '2024-01-01T00:00:00Z' }]
    mockRecipesGet.mockResolvedValue(mockData)

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
    mockRecipesGet.mockResolvedValue(mockData)

    render(<RecipesPage />)

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
      expect(screen.getByText('20 min')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })
})

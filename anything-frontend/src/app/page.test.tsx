import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import Home from './page'

// Mock fetch globally (useRecipes now uses fetch directly)
const mockFetch = jest.fn()
global.fetch = mockFetch

function mockRecipesFetch(recipes: unknown[]) {
  mockFetch.mockImplementation((url: string) => {
    if ((url as string).includes('/api/recipes')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(recipes) } as Response)
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response)
  })
}

// Mock the apiClient module
const mockFoodPlanEntriesGet = jest.fn()
const mockFoodPlanNotesGet = jest.fn()
const mockShoppingListsGet = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      foodPlan: {
        settings: { get: jest.fn().mockResolvedValue({ activeDays: 31 }), put: jest.fn() },
        entries: {
          get: (...args: unknown[]) => mockFoodPlanEntriesGet(...args),
          post: jest.fn(),
          byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })),
        },
        notes: {
          get: (...args: unknown[]) => mockFoodPlanNotesGet(...args),
          byDate: jest.fn(() => ({ put: jest.fn() })),
          byNoteId: jest.fn(() => ({ delete: jest.fn() })),
        },
        addToShoppingList: { post: jest.fn() },
      },
      shoppingLists: {
        get: (...args: unknown[]) => mockShoppingListsGet(...args),
      },
    },
  },
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  usePathname: () => '/',
}))

describe('Home Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockFoodPlanNotesGet.mockResolvedValue([])
    mockRecipesFetch([])
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
    jest.useRealTimers()
  })

  it('should render "Today\'s Menu" heading when hour is before 18', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    expect(screen.getByText("Today's Menu")).toBeInTheDocument()
  })

  it('should render "Tomorrow\'s Menu" heading when hour is 18 or later', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T18:00:00'))
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    expect(screen.getByText("Tomorrow's Menu")).toBeInTheDocument()
  })

  it('should show "no meals planned" message when no entries for today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText(/No meals planned for Monday/i)).toBeInTheDocument()
    })
  })

  it('should show meal entries when entries exist for today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00')) // Monday
    mockFoodPlanEntriesGet.mockResolvedValue([
      { id: 1, name: 'Pasta', recipeId: null, date: '2025-06-16T00:00:00Z' },
    ])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })
  })

  it('should show recipe name for entry linked to a recipe', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([
      { id: 1, name: null, recipeId: 5, date: '2025-06-16T00:00:00Z' },
    ])
    mockRecipesFetch([{ id: 5, name: 'Lasagna' }])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument()
    })
  })

  it('should navigate to recipe detail when a recipe-linked entry is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([
      { id: 1, name: null, recipeId: 5, date: '2025-06-16T00:00:00Z' },
    ])
    mockRecipesFetch([{ id: 5, name: 'Lasagna' }])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Lasagna'))
    expect(mockPush).toHaveBeenCalledWith('/recipes/5')
  })

  it('should not be clickable for entries without a recipe', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([
      { id: 2, name: 'Homemade Soup', recipeId: null, date: '2025-06-16T00:00:00Z' },
    ])
    mockRecipesFetch([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Homemade Soup')).toBeInTheDocument()
    })

    // The entry should not be a button
    expect(screen.queryByRole('button', { name: 'Homemade Soup' })).not.toBeInTheDocument()
  })

  it('should navigate to food plan when "Food plan" is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Food plan' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Food plan' }))
    expect(mockPush).toHaveBeenCalledWith('/food-plans')
  })

  it('should show top 5 shopping lists', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([
      { id: 1, name: 'Grocery List' },
      { id: 2, name: 'Party Supplies' },
      { id: 3, name: 'Hardware Store' },
      { id: 4, name: 'Office Supplies' },
      { id: 5, name: 'Pharmacy Run' },
      { id: 6, name: 'Weekend Market' },
    ])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Grocery List')).toBeInTheDocument()
      expect(screen.getByText('Party Supplies')).toBeInTheDocument()
      expect(screen.getByText('Hardware Store')).toBeInTheDocument()
      expect(screen.getByText('Office Supplies')).toBeInTheDocument()
      expect(screen.getByText('Pharmacy Run')).toBeInTheDocument()
    })

    // Sixth list should not be shown directly
    expect(screen.queryByText('Weekend Market')).not.toBeInTheDocument()
    // But "View all X lists" link should be present
    expect(screen.getByText(/View all 6 lists/i)).toBeInTheDocument()
  })

  it('should show empty state when no shopping lists exist', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('No shopping lists yet.')).toBeInTheDocument()
    })
  })

  it('should navigate to shopping list detail when a list is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([
      { id: 3, name: 'My List' },
    ])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('My List')).toBeInTheDocument()
    })

    await user.click(screen.getByText('My List'))
    expect(mockPush).toHaveBeenCalledWith('/shopping-lists/3')
  })

  it('should navigate to all shopping lists when "All lists" is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All lists' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'All lists' }))
    expect(mockPush).toHaveBeenCalledWith('/shopping-lists')
  })

  it('should display unchecked item count badge on home page when count > 0', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([
      { id: 1, name: 'Grocery List', uncheckedItemCount: 5 },
      { id: 2, name: 'Hardware Store', uncheckedItemCount: 0 },
    ])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Grocery List')).toBeInTheDocument()
    })

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  // ------- Per-day note on home page -------
  it('should display day note on home page when note exists', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([
      { id: 1, name: 'Pasta', recipeId: null, date: '2025-06-16T00:00:00Z' },
    ])
    mockFoodPlanNotesGet.mockResolvedValue([
      { id: 1, date: '2025-06-16T00:00:00Z', note: 'Eating at friends tonight' },
    ])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Eating at friends tonight')).toBeInTheDocument()
    })
  })

  it('should not display note section when no day note exists', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([
      { id: 1, name: 'Pasta', recipeId: null, date: '2025-06-16T00:00:00Z' },
    ])
    mockFoodPlanNotesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    // No note should be rendered
    const italicParagraphs = document.querySelectorAll('p.italic')
    expect(italicParagraphs.length).toBe(0)
  })
})

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onlineManager } from '@tanstack/react-query'
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
const mockBillSummaryGet = jest.fn()
const mockHomeCardPreferencesGet = jest.fn()

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
      foodPlan: {
        settings: { get: jest.fn().mockResolvedValue({ activeDays: 31 }), put: jest.fn() },
        entries: {
          get: (...args: unknown[]) => mockFoodPlanEntriesGet(...args),
          post: jest.fn(),
          byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })),
        },
        notes: {
          get: (...args: unknown[]) => mockFoodPlanNotesGet(...args),
          put: jest.fn(),
          byNoteId: jest.fn(() => ({ delete: jest.fn() })),
        },
        addToShoppingList: { post: jest.fn() },
      },
      checklists: {
        get: (...args: unknown[]) => mockShoppingListsGet(...args),
        post: jest.fn(),
        templates: { get: jest.fn().mockResolvedValue([]) },
        fromTemplate: { post: jest.fn() },
      },
      bills: {
        summary: { get: (...args: unknown[]) => mockBillSummaryGet(...args) },
      },
      home: {
        cardPreferences: { get: (...args: unknown[]) => mockHomeCardPreferencesGet(...args), put: jest.fn() },
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

function setOnline(value: boolean) {
  // Covers every subscriber: the navigator property for components reading it directly
  // on first render, react-query's onlineManager singleton (which gates query fetch-pausing
  // and only reacts to a direct call, not the DOM event, before any query has subscribed),
  // and a real window event for useOnlineStatus's post-mount re-renders.
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
  onlineManager.setOnline(value)
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

describe('Home Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockFoodPlanNotesGet.mockResolvedValue([])
    mockRecipesFetch([])
    mockBillSummaryGet.mockResolvedValue(undefined)
    mockHomeCardPreferencesGet.mockResolvedValue([
      { cardKey: 'foodplan', sortOrder: 0, isVisible: true },
      { cardKey: 'lists', sortOrder: 1, isVisible: true },
      { cardKey: 'bills', sortOrder: 2, isVisible: true },
    ])
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
    jest.useRealTimers()
    setOnline(true)
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
    expect(mockPush).toHaveBeenCalledWith('/lists/3')
  })

  it('should open the create list dialog when "Create" is clicked in the Lists section', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Lists' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Create a list')).toBeInTheDocument()
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
      { id: 1, date: '2025-06-16', note: 'Eating at friends tonight' },
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

  it('should display day note on home page when no meals are planned', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockFoodPlanNotesGet.mockResolvedValue([
      { id: 1, date: '2025-06-16', note: 'Eating at friends tonight' },
    ])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText(/No meals planned for Monday/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Eating at friends tonight')).toBeInTheDocument()
  })

  it('should not display note section when no day note exists', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([
      { id: 1, name: 'Pasta', recipeId: null, date: '2025-06-16T00:00:00Z' },
    ])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    // No note should be rendered
    const italicParagraphs = document.querySelectorAll('p.italic')
    expect(italicParagraphs.length).toBe(0)
  })

  // ------- Bills card on home page -------
  it('should not show the Bills card when there are no bills', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])
    mockBillSummaryGet.mockResolvedValue({ totalBills: 0 })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Lists' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('heading', { name: 'Bills' })).not.toBeInTheDocument()
  })

  it('should show the Bills card summary when bills exist', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])
    mockBillSummaryGet.mockResolvedValue({
      totalBills: 3,
      automatedCount: 2,
      manualCount: 1,
      totalMonthlyEquivalent: 450,
      totalCurrentMonthAmount: 450,
      totalCurrentYearAmount: 5400,
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bills' })).toBeInTheDocument()
    })

    expect(screen.getByText('3 bills total')).toBeInTheDocument()
    expect(screen.getByText('2 auto')).toBeInTheDocument()
    expect(screen.getByText('1 manual')).toBeInTheDocument()
  })

  it('should navigate to create a bill when "Create" is clicked in the Bills section', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])
    mockBillSummaryGet.mockResolvedValue({
      totalBills: 1,
      automatedCount: 1,
      manualCount: 0,
      totalMonthlyEquivalent: 100,
      totalCurrentMonthAmount: 100,
      totalCurrentYearAmount: 1200,
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bills' })).toBeInTheDocument()
    })

    const billsSection = screen.getByRole('heading', { name: 'Bills' }).closest('section') as HTMLElement
    await user.click(within(billsSection).getByRole('button', { name: /Create/ }))
    expect(mockPush).toHaveBeenCalledWith('/bills/new')
  })

  it('should navigate to bills overview when the Bills card is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])
    mockBillSummaryGet.mockResolvedValue({
      totalBills: 1,
      automatedCount: 1,
      manualCount: 0,
      totalMonthlyEquivalent: 100,
      totalCurrentMonthAmount: 100,
      totalCurrentYearAmount: 1200,
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('1 bills total')).toBeInTheDocument()
    })

    await user.click(screen.getByText('1 bills total'))
    expect(mockPush).toHaveBeenCalledWith('/bills')
  })

  // ------- Home card preferences (order/visibility) -------
  it('should navigate to home preferences when the settings button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await user.click(screen.getByRole('button', { name: 'Customize home page' }))
    expect(mockPush).toHaveBeenCalledWith('/home-preferences')
  })

  it('should render cards in the order returned by preferences', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])
    mockHomeCardPreferencesGet.mockResolvedValue([
      { cardKey: 'lists', sortOrder: 0, isVisible: true },
      { cardKey: 'foodplan', sortOrder: 1, isVisible: true },
      { cardKey: 'bills', sortOrder: 2, isVisible: true },
    ])

    render(<Home />)

    await waitFor(() => {
      const headings = screen.getAllByRole('heading').map((h) => h.textContent)
      expect(headings.indexOf('Lists')).toBeLessThan(headings.indexOf("Today's Menu"))
    })
  })

  it('should hide a card whose preference marks it not visible', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])
    mockHomeCardPreferencesGet.mockResolvedValue([
      { cardKey: 'foodplan', sortOrder: 0, isVisible: true },
      { cardKey: 'lists', sortOrder: 1, isVisible: false },
      { cardKey: 'bills', sortOrder: 2, isVisible: true },
    ])

    render(<Home />)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Lists' })).not.toBeInTheDocument()
    })

    expect(screen.getByText("Today's Menu")).toBeInTheDocument()
  })

  // ------- Offline mode: edit options disabled -------
  it('should disable the Customize home page button while offline', async () => {
    setOnline(false)
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Customize home page' })).toBeDisabled()
    })
  })

  it('should disable the Lists card Create button while offline', async () => {
    setOnline(false)
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
    })
  })

  it('should disable the Bills card Create button while offline', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])
    mockBillSummaryGet.mockResolvedValue({
      totalBills: 1,
      automatedCount: 1,
      manualCount: 0,
      totalMonthlyEquivalent: 100,
      totalCurrentMonthAmount: 100,
      totalCurrentYearAmount: 1200,
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bills' })).toBeInTheDocument()
    })

    // Go offline after the bill summary has already loaded, so the card stays
    // visible (its query pauses on cached in-memory data) and only its Create
    // action becomes unavailable.
    setOnline(false)

    const billsSection = screen.getByRole('heading', { name: 'Bills' }).closest('section') as HTMLElement
    await waitFor(() => {
      expect(within(billsSection).getByRole('button', { name: /Create/ })).toBeDisabled()
    })
  })

  it('should show cached lists (not a loading spinner) after going offline', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([{ id: 1, name: 'Groceries' }])

    render(<Home />)
    await waitFor(() => { expect(screen.getByText('Groceries')).toBeInTheDocument() })

    setOnline(false)

    await waitFor(() => { expect(screen.getByText('Groceries')).toBeInTheDocument() })
  })
})

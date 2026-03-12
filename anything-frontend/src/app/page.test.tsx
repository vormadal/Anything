import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import Home from './page'

// Mock the apiClient module
const mockFoodPlansGet = jest.fn()
const mockFoodPlanEntriesGet = jest.fn()
const mockFoodPlansByIdEntriesGet = jest.fn()
const mockFoodPlansById = jest.fn(() => ({
  get: jest.fn(),
  entries: { get: mockFoodPlansByIdEntriesGet },
}))
const mockShoppingListsGet = jest.fn()
const mockRecipesGet = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      foodPlans: {
        get: (...args: unknown[]) => mockFoodPlansGet(...args),
        byId: (...args: unknown[]) => mockFoodPlansById(...args),
      },
      shoppingLists: {
        get: (...args: unknown[]) => mockShoppingListsGet(...args),
      },
      recipes: {
        get: (...args: unknown[]) => mockRecipesGet(...args),
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

// Helper to get a Monday date that contains "today"
function getMondayOfCurrentWeek(): Date {
  const now = new Date()
  const day = now.getDay() // 0=Sunday
  const diff = (day === 0 ? -6 : 1 - day) // adjust to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Convert JS day (0=Sunday) to plan day (0=Monday)
function jsDayToPlanDay(jsDay: number): number {
  return (jsDay + 6) % 7
}

describe('Home Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFoodPlanEntriesGet.mockResolvedValue([])
    mockFoodPlansByIdEntriesGet.mockResolvedValue([])
    mockRecipesGet.mockResolvedValue([])
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com', name: 'Test User', role: 'User' }))
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
    jest.useRealTimers()
  })

  it('should render "Today\'s Menu" heading when hour is before 18', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlansGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    expect(screen.getByText("Today's Menu")).toBeInTheDocument()
  })

  it('should render "Tomorrow\'s Menu" heading when hour is 18 or later', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T18:00:00'))
    mockFoodPlansGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    expect(screen.getByText("Tomorrow's Menu")).toBeInTheDocument()
  })

  it('should show "no food plan" message when no plan covers today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlansGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText(/No food plan for today/i)).toBeInTheDocument()
    })
  })

  it('should show meal entries when a plan covers today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00')) // Monday
    const monday = new Date('2025-06-16T00:00:00')
    const planDayOfWeek = jsDayToPlanDay(new Date('2025-06-16T10:00:00').getDay()) // 0 (Monday)

    const mockPlan = { id: 42, name: 'Week Plan', weekStart: monday.toISOString() }
    mockFoodPlansGet.mockResolvedValue([mockPlan])
    mockFoodPlansByIdEntriesGet.mockResolvedValue([
      { id: 1, dayOfWeek: planDayOfWeek, name: 'Pasta', recipeId: null },
    ])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })
  })

  it('should show recipe name for plan entry linked to a recipe', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    const monday = new Date('2025-06-16T00:00:00')
    const planDayOfWeek = jsDayToPlanDay(new Date('2025-06-16T10:00:00').getDay())

    mockFoodPlansGet.mockResolvedValue([
      { id: 10, name: 'My Plan', weekStart: monday.toISOString() },
    ])
    mockFoodPlansByIdEntriesGet.mockResolvedValue([
      { id: 1, dayOfWeek: planDayOfWeek, name: null, recipeId: 5 },
    ])
    mockRecipesGet.mockResolvedValue([{ id: 5, name: 'Lasagna' }])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument()
    })
  })

  it('should navigate to recipe detail when a recipe-linked entry is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    const monday = new Date('2025-06-16T00:00:00')
    const planDayOfWeek = jsDayToPlanDay(new Date('2025-06-16T10:00:00').getDay())

    mockFoodPlansGet.mockResolvedValue([
      { id: 10, name: 'My Plan', weekStart: monday.toISOString() },
    ])
    mockFoodPlansByIdEntriesGet.mockResolvedValue([
      { id: 1, dayOfWeek: planDayOfWeek, name: null, recipeId: 5 },
    ])
    mockRecipesGet.mockResolvedValue([{ id: 5, name: 'Lasagna' }])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Lasagna'))
    expect(mockPush).toHaveBeenCalledWith('/recipes/5')
  })

  it('should not be clickable for plan entries without a recipe', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    const monday = new Date('2025-06-16T00:00:00')
    const planDayOfWeek = jsDayToPlanDay(new Date('2025-06-16T10:00:00').getDay())

    mockFoodPlansGet.mockResolvedValue([
      { id: 10, name: 'My Plan', weekStart: monday.toISOString() },
    ])
    mockFoodPlansByIdEntriesGet.mockResolvedValue([
      { id: 2, dayOfWeek: planDayOfWeek, name: 'Homemade Soup', recipeId: null },
    ])
    mockRecipesGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Homemade Soup')).toBeInTheDocument()
    })

    // The entry should not be a button
    expect(screen.queryByRole('button', { name: 'Homemade Soup' })).not.toBeInTheDocument()
  })

  it('should navigate to food plan detail when "Edit plan" is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    const monday = new Date('2025-06-16T00:00:00')
    const planDayOfWeek = jsDayToPlanDay(new Date('2025-06-16T10:00:00').getDay())

    mockFoodPlansGet.mockResolvedValue([
      { id: 7, name: 'Test Plan', weekStart: monday.toISOString() },
    ])
    mockFoodPlansByIdEntriesGet.mockResolvedValue([
      { id: 1, dayOfWeek: planDayOfWeek, mealType: null, customName: 'Soup', recipeId: null },
    ])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit plan' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Edit plan' }))
    expect(mockPush).toHaveBeenCalledWith('/food-plans/7')
  })

  it('should navigate to all food plans when "All plans" is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlansGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All plans' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'All plans' }))
    expect(mockPush).toHaveBeenCalledWith('/food-plans')
  })

  it('should show top 5 shopping lists', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlansGet.mockResolvedValue([])
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
    mockFoodPlansGet.mockResolvedValue([])
    mockShoppingListsGet.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('No shopping lists yet.')).toBeInTheDocument()
    })
  })

  it('should navigate to shopping list detail when a list is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.useFakeTimers().setSystemTime(new Date('2025-06-16T10:00:00'))
    mockFoodPlansGet.mockResolvedValue([])
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
    mockFoodPlansGet.mockResolvedValue([])
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
    mockFoodPlansGet.mockResolvedValue([])
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
})

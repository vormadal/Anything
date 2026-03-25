import React from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import FoodPlanPage from './page'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Today as reference — same logic as the component
const today = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d })()

// Build a mock entry on a given day offset from today (0=today, 1=tomorrow, ...)
function buildEntry(
  id: number,
  name: string,
  dayOffset: number,
  extra: Record<string, unknown> = {},
) {
  const date = addDays(today, dayOffset)
  return {
    id,
    name,
    date: date.toISOString(),
    recipeId: null,
    addedToShoppingListOn: null,
    comment: null,
    ...extra,
  }
}

function getWeekLabel(startDate: Date): string {
  const endDate = addDays(startDate, 6)
  return `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

// ---- Mock fetch globally (useRecipes now uses fetch directly) ----
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

// ---- Mock apiClient ----
const mockSettingsGet = jest.fn()
const mockSettingsPut = jest.fn()
const mockEntriesGet = jest.fn()
const mockEntriesPost = jest.fn()
const mockEntriesItemPut = jest.fn()
const mockEntriesItemDelete = jest.fn()
const mockEntriesItemById = jest.fn(() => ({ put: mockEntriesItemPut, delete: mockEntriesItemDelete }))
const mockAddToShoppingListPost = jest.fn()
const mockShoppingListsGet = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      foodPlan: {
        settings: {
          get: (...args: unknown[]) => mockSettingsGet(...args),
          put: (...args: unknown[]) => mockSettingsPut(...args),
        },
        entries: {
          get: (...args: unknown[]) => mockEntriesGet(...args),
          post: (...args: unknown[]) => mockEntriesPost(...args),
          byEntryId: (...args: unknown[]) => mockEntriesItemById(...args),
        },
        addToShoppingList: {
          post: (...args: unknown[]) => mockAddToShoppingListPost(...args),
        },
      },
      shoppingLists: {
        get: (...args: unknown[]) => mockShoppingListsGet(...args),
        post: jest.fn(),
        completed: { get: jest.fn().mockResolvedValue([]) },
        byId: jest.fn(() => ({
          get: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
          items: { get: jest.fn(), post: jest.fn(), byItemId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })) },
          complete: { post: jest.fn() },
        })),
      },
    },
  },
}))

// ---- Mock PageActionsContext ----
const mockSetHeaderActions = jest.fn()
jest.mock('@/context/PageActionsContext', () => ({
  PageActionsProvider: ({ children }: { children: React.ReactNode }) => children,
  useHeaderActions: () => ({
    headerActions: null,
    hideTitle: false,
    setHeaderActions: mockSetHeaderActions,
    setPageTitle: jest.fn(),
    leftAction: null,
    setLeftAction: jest.fn(),
  }),
}))

// ---- Mock next/navigation ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/food-plans',
}))

// ---- Mock sonner ----
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

// ---- Mock useAuth ----
jest.mock('@/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: null }),
  useLogout: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

describe('FoodPlanPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    mockEntriesGet.mockResolvedValue([])
    mockRecipesFetch([])
    mockShoppingListsGet.mockResolvedValue([])
  })

  // ------- 1. Loading state -------
  it('should display loading state while entries are being fetched', () => {
    mockEntriesGet.mockImplementation(() => new Promise(() => {}))

    render(<FoodPlanPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should not show day columns while loading', () => {
    mockEntriesGet.mockImplementation(() => new Promise(() => {}))

    render(<FoodPlanPage />)

    expect(screen.queryByText('mandag')).not.toBeInTheDocument()
  })

  // ------- 2. Day columns for default activeDays=31 (Mon-Fri) -------
  it('should render Mon-Fri day columns with default activeDays=31', async () => {
    mockSettingsGet.mockResolvedValue({ activeDays: 31 })
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const expectedDays = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag']
    for (const day of expectedDays) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
    expect(screen.queryByText('lørdag')).not.toBeInTheDocument()
    expect(screen.queryByText('søndag')).not.toBeInTheDocument()
  })

  it('should render all 7 day columns when activeDays=127', async () => {
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const allDays = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag']
    for (const day of allDays) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it('should render only selected days based on activeDays bitmask', async () => {
    // bitmask 5 = bits 0 and 2 = Monday and Wednesday
    mockSettingsGet.mockResolvedValue({ activeDays: 5 })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    expect(screen.getByText('onsdag')).toBeInTheDocument()
    expect(screen.queryByText('tirsdag')).not.toBeInTheDocument()
    expect(screen.queryByText('torsdag')).not.toBeInTheDocument()
    expect(screen.queryByText('fredag')).not.toBeInTheDocument()
  })

  it('should show an Add button for each active day', async () => {
    mockSettingsGet.mockResolvedValue({ activeDays: 31 })
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    // Default is Mon-Fri = 5 days
    expect(addButtons).toHaveLength(5)
  })

  // ------- 3. Display entries in correct day columns -------
  it('should display food plan entries in the correct day columns', async () => {
    // Use activeDays=127 (all days) to ensure all day offsets show regardless of current weekday
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    const entries = [
      buildEntry(1, 'Pancakes', 0), // today
      buildEntry(2, 'Pasta', 2),    // 2 days from now
      buildEntry(3, 'Salad', 4),    // 4 days from now
    ]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
    })
    expect(screen.getByText('Pasta')).toBeInTheDocument()
    expect(screen.getByText('Salad')).toBeInTheDocument()
  })

  it('should display multiple entries in the same day', async () => {
    // Use activeDays=127 to ensure today is shown regardless of weekday
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    const entries = [
      buildEntry(1, 'Breakfast', 0),
      buildEntry(2, 'Lunch', 0),
      buildEntry(3, 'Dinner', 0),
    ]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Breakfast')).toBeInTheDocument()
      expect(screen.getByText('Lunch')).toBeInTheDocument()
      expect(screen.getByText('Dinner')).toBeInTheDocument()
    })
  })

  it('should show date info under each day name', async () => {
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    // Monday always appears in any 7-day window; find it and check its date string
    const monday = Array.from({ length: 7 }, (_, i) => addDays(today, i))
      .find(d => d.getDay() === 1)!
    const mondayDateStr = format(monday, 'd. MMMM', { locale: da })
    expect(screen.getByText(mondayDateStr)).toBeInTheDocument()
  })

  // ------- 4. Week navigation -------
  it('should display the current week label by default', async () => {
    render(<FoodPlanPage />)

    const expectedLabel = getWeekLabel(today)

    await waitFor(() => {
      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })
  })

  it('should navigate to previous week when clicking previous button', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const prevButton = screen.getByRole('button', { name: 'Previous week' })
    await user.click(prevButton)

    const prevStart = addDays(today, -7)
    const expectedLabel = getWeekLabel(prevStart)

    await waitFor(() => {
      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })
  })

  it('should navigate to next week when clicking next button', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const nextButton = screen.getByRole('button', { name: 'Next week' })
    await user.click(nextButton)

    const nextStart = addDays(today, 7)
    const expectedLabel = getWeekLabel(nextStart)

    await waitFor(() => {
      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })
  })

  it('should refetch entries when navigating weeks', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const prevButton = screen.getByRole('button', { name: 'Previous week' })
    await user.click(prevButton)

    await waitFor(() => {
      // Initial call + call after navigation
      expect(mockEntriesGet).toHaveBeenCalledTimes(2)
    })
  })

  // ------- 5. Clicking week label resets to current week -------
  it('should reset to the current week when clicking the week label', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    const currentWeekLabel = getWeekLabel(today)

    await waitFor(() => {
      expect(screen.getByText(currentWeekLabel)).toBeInTheDocument()
    })

    // Navigate away first
    const nextButton = screen.getByRole('button', { name: 'Next week' })
    await user.click(nextButton)

    const nextStart = addDays(today, 7)
    const nextWeekLabel = getWeekLabel(nextStart)

    await waitFor(() => {
      expect(screen.getByText(nextWeekLabel)).toBeInTheDocument()
    })

    // Click the week label to reset
    const weekLabelButton = screen.getByText(nextWeekLabel)
    await user.click(weekLabelButton)

    await waitFor(() => {
      expect(screen.getByText(currentWeekLabel)).toBeInTheDocument()
    })
  })

  // ------- 6. Adding an entry via the add dialog -------
  it('should show add dialog when Add button is clicked', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    expect(screen.getByPlaceholderText('Meal name...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Leftovers, at friends...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add meal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('should add an entry when the add dialog is submitted', async () => {
    const user = userEvent.setup()
    mockEntriesPost.mockResolvedValue({ id: 10, name: 'Burger', date: today.toISOString() })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    const input = screen.getByPlaceholderText('Meal name...')
    await user.type(input, 'Burger')

    const submitButton = screen.getByRole('button', { name: 'Add meal' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockEntriesPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Burger' }),
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Entry added')
    })
  })

  it('should add an entry with a comment', async () => {
    const user = userEvent.setup()
    mockEntriesPost.mockResolvedValue({ id: 10, name: 'Leftovers', date: today.toISOString(), comment: 'From yesterday' })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    const nameInput = screen.getByPlaceholderText('Meal name...')
    await user.type(nameInput, 'Leftovers')

    const commentInput = screen.getByPlaceholderText('e.g. Leftovers, at friends...')
    await user.type(commentInput, 'From yesterday')

    const submitButton = screen.getByRole('button', { name: 'Add meal' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockEntriesPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Leftovers', comment: 'From yesterday' }),
      )
    })
  })

  it('should close add dialog when Cancel is clicked', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    expect(screen.getByPlaceholderText('Meal name...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByPlaceholderText('Meal name...')).not.toBeInTheDocument()
  })

  it('should disable Add meal button when name input is empty', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    const submitButton = screen.getByRole('button', { name: 'Add meal' })
    expect(submitButton).toBeDisabled()
  })

  it('should show error toast when adding entry fails', async () => {
    const user = userEvent.setup()
    mockEntriesPost.mockRejectedValue(new Error('Server error'))

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    const input = screen.getByPlaceholderText('Meal name...')
    await user.type(input, 'Burger')

    const submitButton = screen.getByRole('button', { name: 'Add meal' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add entry. Please try again.')
    })
  })

  // ------- 7. Selecting a recipe suggestion -------
  it('should show recipe suggestions when typing a matching name', async () => {
    const user = userEvent.setup()
    mockRecipesFetch([
      { id: 1, name: 'Pasta Carbonara' },
      { id: 2, name: 'Pasta Bolognese' },
      { id: 3, name: 'Salad' },
    ])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    const input = screen.getByPlaceholderText('Meal name...')
    await user.type(input, 'Pasta')

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
      expect(screen.getByText('Pasta Bolognese')).toBeInTheDocument()
    })
    // Non-matching recipe should not appear as suggestion
    expect(screen.queryByText('Salad')).not.toBeInTheDocument()
  })

  it('should select a recipe suggestion and submit with recipeId', async () => {
    const user = userEvent.setup()
    mockRecipesFetch([{ id: 1, name: 'Pasta Carbonara' }])
    mockEntriesPost.mockResolvedValue({ id: 10, name: 'Pasta Carbonara', recipeId: 1 })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    const input = screen.getByPlaceholderText('Meal name...')
    await user.type(input, 'Pasta')

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    })

    // Click the suggestion (uses onMouseDown in component)
    const suggestion = screen.getByText('Pasta Carbonara')
    await user.click(suggestion)

    // Input should now have the recipe name
    expect(input).toHaveValue('Pasta Carbonara')

    const submitButton = screen.getByRole('button', { name: 'Add meal' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockEntriesPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Pasta Carbonara', recipeId: 1 }),
      )
    })
  })

  it('should not show suggestions when input is empty', async () => {
    const user = userEvent.setup()
    mockRecipesFetch([{ id: 1, name: 'Pasta' }])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('mandag')).toBeInTheDocument()
    })

    const addButtons = screen.getAllByRole('button', { name: /Add meal for/ })
    await user.click(addButtons[0])

    // Input is empty and focused, no suggestions should appear
    expect(screen.queryByText('Pasta')).not.toBeInTheDocument()
  })

  // ------- 8. Deleting an entry -------
  it('should delete an entry when the remove button is clicked', async () => {
    const user = userEvent.setup()
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    const entries = [buildEntry(42, 'Pancakes', 0)]
    mockEntriesGet.mockResolvedValue(entries)
    mockEntriesItemDelete.mockResolvedValue(undefined)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
    })

    const removeButton = screen.getByRole('button', { name: 'Remove entry' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockEntriesItemById).toHaveBeenCalledWith(42)
      expect(mockEntriesItemDelete).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Entry removed')
    })
  })

  it('should show error toast when deleting entry fails', async () => {
    const user = userEvent.setup()
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    const entries = [buildEntry(42, 'Pancakes', 0)]
    mockEntriesGet.mockResolvedValue(entries)
    mockEntriesItemDelete.mockRejectedValue(new Error('Delete failed'))

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
    })

    const removeButton = screen.getByRole('button', { name: 'Remove entry' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to remove entry. Please try again.')
    })
  })

  // ------- 9. Shopping list dialog -------
  it('should open the shopping list dialog via header action', async () => {
    mockShoppingListsGet.mockResolvedValue([{ id: 1, name: 'Weekly Groceries' }])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    // Extract the rendered header actions and trigger the shopping cart button
    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const shoppingCartButton = within(container).getByRole('button', { name: 'Add to shopping list' })

    const user = userEvent.setup()
    await user.click(shoppingCartButton)

    await waitFor(() => {
      expect(screen.getByText('Add to Shopping List')).toBeInTheDocument()
    })
  })

  it('should show shopping lists in the dialog', async () => {
    const entries = [buildEntry(1, 'Pasta', 0, { recipeId: 1 })]
    mockEntriesGet.mockResolvedValue(entries)
    mockRecipesFetch([{ id: 1, name: 'Pasta' }])
    mockShoppingListsGet.mockResolvedValue([
      { id: 1, name: 'Weekly Groceries' },
      { id: 2, name: 'Party Supplies' },
    ])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const shoppingCartButton = within(container).getByRole('button', { name: 'Add to shopping list' })

    const user = userEvent.setup()
    await user.click(shoppingCartButton)

    await waitFor(() => {
      expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
      expect(screen.getByText('Party Supplies')).toBeInTheDocument()
    })
  })

  it('should show "No shopping lists available." when none exist', async () => {
    mockEntriesGet.mockResolvedValue([buildEntry(1, 'Pasta', 0, { recipeId: 1 })])
    mockRecipesFetch([{ id: 1, name: 'Pasta' }])
    mockShoppingListsGet.mockResolvedValue([])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const shoppingCartButton = within(container).getByRole('button', { name: 'Add to shopping list' })

    const user = userEvent.setup()
    await user.click(shoppingCartButton)

    await waitFor(() => {
      expect(screen.getByText('No shopping lists available.')).toBeInTheDocument()
    })
  })

  it('should add entries to shopping list and show success toast', async () => {
    const entries = [buildEntry(1, 'Pasta', 0, { recipeId: 1 })]
    mockEntriesGet.mockResolvedValue(entries)
    mockRecipesFetch([{ id: 1, name: 'Pasta' }])
    mockShoppingListsGet.mockResolvedValue([{ id: 10, name: 'Weekly Groceries' }])
    mockAddToShoppingListPost.mockResolvedValue(undefined)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const shoppingCartButton = within(container).getByRole('button', { name: 'Add to shopping list' })

    const user = userEvent.setup()
    await user.click(shoppingCartButton)

    await waitFor(() => {
      expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    })

    const listButton = screen.getByRole('button', { name: 'Weekly Groceries' })
    await user.click(listButton)

    await waitFor(() => {
      expect(mockAddToShoppingListPost).toHaveBeenCalledWith(
        expect.objectContaining({ shoppingListId: 10 }),
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Ingredients added to shopping list')
    })
  })

  it('should show error toast when adding to shopping list fails', async () => {
    const entries = [buildEntry(1, 'Pasta', 0, { recipeId: 1 })]
    mockEntriesGet.mockResolvedValue(entries)
    mockRecipesFetch([{ id: 1, name: 'Pasta' }])
    mockShoppingListsGet.mockResolvedValue([{ id: 10, name: 'Weekly Groceries' }])
    mockAddToShoppingListPost.mockRejectedValue(new Error('Server error'))

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const shoppingCartButton = within(container).getByRole('button', { name: 'Add to shopping list' })

    const user = userEvent.setup()
    await user.click(shoppingCartButton)

    await waitFor(() => {
      expect(screen.getByText('Weekly Groceries')).toBeInTheDocument()
    })

    const listButton = screen.getByRole('button', { name: 'Weekly Groceries' })
    await user.click(listButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add ingredients. Please try again.')
    })
  })

  it('should close the shopping list dialog when Cancel is clicked', async () => {
    mockEntriesGet.mockResolvedValue([buildEntry(1, 'Pasta', 0, { recipeId: 1 })])
    mockRecipesFetch([{ id: 1, name: 'Pasta' }])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const shoppingCartButton = within(container).getByRole('button', { name: 'Add to shopping list' })

    const user = userEvent.setup()
    await user.click(shoppingCartButton)

    await waitFor(() => {
      expect(screen.getByText('Add to Shopping List')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('Add to Shopping List')).not.toBeInTheDocument()
    })
  })

  it('should show recipe multiplier controls in the shopping list dialog', async () => {
    const entries = [
      buildEntry(1, 'Pasta', 0, { recipeId: 1 }),
      buildEntry(2, 'Pasta', 2, { recipeId: 1 }), // same recipe, different day
      buildEntry(3, 'Salad', 1, { recipeId: 2 }),
    ]
    mockEntriesGet.mockResolvedValue(entries)
    mockRecipesFetch([
      { id: 1, name: 'Pasta' },
      { id: 2, name: 'Salad' },
    ])
    mockShoppingListsGet.mockResolvedValue([{ id: 1, name: 'My List' }])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const shoppingCartButton = within(container).getByRole('button', { name: 'Add to shopping list' })

    const user = userEvent.setup()
    await user.click(shoppingCartButton)

    await waitFor(() => {
      expect(screen.getByText('Set the multiplier for each recipe:')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Increase multiplier for Pasta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Increase multiplier for Salad' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decrease multiplier for Pasta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decrease multiplier for Salad' })).toBeInTheDocument()
  })

  it('should not show multiplier controls when no recipe entries exist', async () => {
    const entries = [buildEntry(1, 'Leftovers', 0)] // no recipeId
    mockEntriesGet.mockResolvedValue(entries)
    mockShoppingListsGet.mockResolvedValue([{ id: 1, name: 'My List' }])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const shoppingCartButton = within(container).getByRole('button', { name: 'Add to shopping list' })

    const user = userEvent.setup()
    await user.click(shoppingCartButton)

    await waitFor(() => {
      expect(screen.getByText('Add to Shopping List')).toBeInTheDocument()
    })

    expect(screen.queryByText('Set the multiplier for each recipe:')).not.toBeInTheDocument()
  })

  // ------- 10. Header actions registration -------
  it('should register header actions with Settings and ShoppingCart buttons', async () => {
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    expect(headerActionsJsx).not.toBeNull()

    const { container } = render(headerActionsJsx)
    expect(within(container).getByRole('button', { name: 'Food plan settings' })).toBeInTheDocument()
    expect(within(container).getByRole('button', { name: 'Add to shopping list' })).toBeInTheDocument()
  })

  it('should navigate to settings page when Settings header action is clicked', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    const headerActionsJsx = mockSetHeaderActions.mock.calls[0][0]
    const { container } = render(headerActionsJsx)
    const settingsButton = within(container).getByRole('button', { name: 'Food plan settings' })
    await user.click(settingsButton)

    expect(mockPush).toHaveBeenCalledWith('/food-plans/settings')
  })

  it('should clear header actions on unmount', async () => {
    const { unmount } = render(<FoodPlanPage />)

    await waitFor(() => {
      expect(mockSetHeaderActions).toHaveBeenCalled()
    })

    unmount()

    // The last call to setHeaderActions should be null (cleanup)
    const calls = mockSetHeaderActions.mock.calls
    const lastCall = calls[calls.length - 1][0]
    expect(lastCall).toBeNull()
  })

  // ------- 11. Entry badges: recipe links vs plain text -------
  it('should render entry as a link when recipeId is set', async () => {
    const entries = [buildEntry(1, 'Pasta Carbonara', 0, { recipeId: 42 })]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: 'Pasta Carbonara' })
    expect(link).toHaveAttribute('href', '/recipes/42')
  })

  it('should render entry as plain text when recipeId is null', async () => {
    const entries = [buildEntry(1, 'Leftovers', 0)]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Leftovers')).toBeInTheDocument()
    })

    expect(screen.queryByRole('link', { name: 'Leftovers' })).not.toBeInTheDocument()
  })

  // ------- 12. Entry badges: green vs blue styling -------
  it('should render green badge when addedToShoppingListOn is set', async () => {
    const entries = [
      buildEntry(1, 'Pasta', 0, { addedToShoppingListOn: '2026-03-10T00:00:00Z' }),
    ]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const badge = screen.getByText('Pasta').closest('[class*="bg-green-50"]')
    expect(badge).toBeInTheDocument()
    expect(badge?.className).not.toContain('bg-blue-50')
  })

  it('should render blue badge when addedToShoppingListOn is null', async () => {
    const entries = [buildEntry(1, 'Pasta', 0)]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const badge = screen.getByText('Pasta').closest('[class*="bg-blue-50"]')
    expect(badge).toBeInTheDocument()
    expect(badge?.className).not.toContain('bg-green-50')
  })

  // ------- 13. Comment display in entry badge -------
  it('should display comment in entry badge when comment is set', async () => {
    const entries = [buildEntry(1, 'Pasta', 0, { comment: 'Eating at friends' })]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    expect(screen.getByText('Eating at friends')).toBeInTheDocument()
  })

  it('should not display comment text when comment is null', async () => {
    const entries = [buildEntry(1, 'Pasta', 0)]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    // Only the entry name should be visible, no comment
    const badge = screen.getByText('Pasta').closest('[class*="rounded"]')
    const paragraphs = badge?.querySelectorAll('p')
    expect(paragraphs?.length ?? 0).toBe(0)
  })
})

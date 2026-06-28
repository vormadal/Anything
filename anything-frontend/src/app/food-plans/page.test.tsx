import React, { act } from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import FoodPlanPage from './page'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { toDateInputValue } from '@/lib/foodPlanUtils'

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
    ...extra,
  }
}

// ---- Mock fetch globally (useRecipes now uses fetch directly) ----
const mockFetch = jest.fn()
global.fetch = mockFetch

// ---- Mock window.scrollTo ----
const mockScrollTo = jest.fn()
Object.defineProperty(window, 'scrollTo', { value: mockScrollTo, writable: true })

// ---- IntersectionObserver mock (jsdom does not implement it) ----
type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void
let intersectionCallback: IntersectionCallback | null = null
const mockIntersectionObserverDisconnect = jest.fn()
const mockIntersectionObserverObserve = jest.fn()

class MockIntersectionObserver {
  constructor(callback: IntersectionCallback) {
    intersectionCallback = callback
  }
  observe = mockIntersectionObserverObserve
  disconnect = mockIntersectionObserverDisconnect
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

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
const mockEntriesItemById: jest.Mock = jest.fn(() => ({ put: mockEntriesItemPut, delete: mockEntriesItemDelete }))
const mockAddToShoppingListPost = jest.fn()
const mockShoppingListsGet = jest.fn()
const mockApiFetch = jest.fn()

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
      checklists: {
        get: (...args: unknown[]) => mockShoppingListsGet(...args),
        post: jest.fn(),
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
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
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

// Food-plan notes go through apiFetch: route the GET to the provided notes and treat
// PUT/DELETE as successful.
function mockNotesApi(notes: unknown[]) {
  mockApiFetch.mockImplementation((path: string, init?: { method?: string }) => {
    if (typeof path === 'string' && path.startsWith('/api/food-plan/notes') && !init) {
      return Promise.resolve({ ok: true, json: async () => notes })
    }
    return Promise.resolve({ ok: true })
  })
}

function findNotesCall(method?: string) {
  return mockApiFetch.mock.calls.find(
    (c) =>
      typeof c[0] === 'string' &&
      (c[0] as string).includes('/api/food-plan/notes') &&
      ((c[1] as { method?: string } | undefined)?.method ?? undefined) === method
  )
}

describe('FoodPlanPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    mockEntriesGet.mockResolvedValue([])
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => [] })
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

  // ------- 2. Day columns for activeDays bitmask -------
  it('should render Mon-Fri day columns with default activeDays=31', async () => {
    mockSettingsGet.mockResolvedValue({ activeDays: 31 })
    render(<FoodPlanPage />)

    // With 15 days shown, each weekday can appear multiple times — use getAllByText
    await waitFor(() => {
      expect(screen.getAllByText('mandag').length).toBeGreaterThan(0)
    })

    const expectedDays = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag']
    for (const day of expectedDays) {
      expect(screen.getAllByText(day).length).toBeGreaterThan(0)
    }
    expect(screen.queryAllByText('lørdag')).toHaveLength(0)
    expect(screen.queryAllByText('søndag')).toHaveLength(0)
  })

  it('should render all 7 day columns when activeDays=127', async () => {
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getAllByText('mandag').length).toBeGreaterThan(0)
    })

    const allDays = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag']
    for (const day of allDays) {
      expect(screen.getAllByText(day).length).toBeGreaterThan(0)
    }
  })

  it('should render only selected days based on activeDays bitmask', async () => {
    // bitmask 5 = bits 0 and 2 = Monday and Wednesday
    mockSettingsGet.mockResolvedValue({ activeDays: 5 })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getAllByText('mandag').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText('onsdag').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('tirsdag')).toHaveLength(0)
    expect(screen.queryAllByText('torsdag')).toHaveLength(0)
    expect(screen.queryAllByText('fredag')).toHaveLength(0)
  })

  // ------- 3. Display entries in correct day columns -------
  it('should display food plan entries in the correct day columns', async () => {
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
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    // The first Monday in the 15-day window has a unique date string
    const monday = Array.from({ length: 15 }, (_, i) => addDays(today, i - 7))
      .find(d => d.getDay() === 1)!
    const mondayDateStr = format(monday, 'd. MMMM', { locale: da })
    expect(screen.getAllByText(mondayDateStr)[0]).toBeInTheDocument()
  })

  // ------- 4. Load more buttons -------
  it('should show "Load earlier" and "Load more" buttons', async () => {
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Load earlier' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument()
  })

  it('should fetch a wider date range when "Load earlier" is clicked', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    const initialCallCount = mockEntriesGet.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'Load earlier' }))

    await waitFor(() => {
      expect(mockEntriesGet).toHaveBeenCalledTimes(initialCallCount + 1)
    })
  })

  it('should fetch a wider date range when "Load more" is clicked', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    const initialCallCount = mockEntriesGet.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() => {
      expect(mockEntriesGet).toHaveBeenCalledTimes(initialCallCount + 1)
    })
  })

  // ------- 5. Day management dialog -------
  it('should open the day management dialog when a day row is clicked', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    // Click today's row (identified by the "i dag" label)
    const todayRow = screen.getByRole('button', { name: /i dag/ })
    await user.click(todayRow)

    // Dialog is open — shows the meal input and Add meal button
    expect(screen.getByPlaceholderText('Meal name...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add meal' })).toBeInTheDocument()
  })

  it('should close the dialog when the X button is clicked', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    const todayRow = screen.getByRole('button', { name: /i dag/ })
    await user.click(todayRow)

    expect(screen.getByPlaceholderText('Meal name...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(screen.queryByPlaceholderText('Meal name...')).not.toBeInTheDocument()
  })

  it('should show existing entries in the dialog', async () => {
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    mockEntriesGet.mockResolvedValue([buildEntry(1, 'Pancakes', 0)])

    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
    })

    const todayRow = screen.getByRole('button', { name: /i dag/ })
    await user.click(todayRow)

    // Entry appears in the dialog list as well
    const dialog = screen.getByPlaceholderText('Meal name...').closest<HTMLElement>('div[class*="rounded-xl"]')!
    expect(within(dialog).getByText('Pancakes')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Remove entry' })).toBeInTheDocument()
  })

  it('should add an entry through the dialog', async () => {
    const user = userEvent.setup()
    mockEntriesPost.mockResolvedValue({ id: 10, name: 'Burger', date: today.toISOString() })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    const input = screen.getByPlaceholderText('Meal name...')
    await user.type(input, 'Burger')
    await user.click(screen.getByRole('button', { name: 'Add meal' }))

    await waitFor(() => {
      expect(mockEntriesPost).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Burger' }),
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Entry added')
    })
  })

  it('should disable Add meal button when name input is empty', async () => {
    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    expect(screen.getByRole('button', { name: 'Add meal' })).toBeDisabled()
  })

  it('should show error toast when adding entry fails', async () => {
    const user = userEvent.setup()
    mockEntriesPost.mockRejectedValue(new Error('Server error'))

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))
    await user.type(screen.getByPlaceholderText('Meal name...'), 'Burger')
    await user.click(screen.getByRole('button', { name: 'Add meal' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to add entry. Please try again.')
    })
  })

  it('should delete an entry through the dialog', async () => {
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    mockEntriesGet.mockResolvedValue([buildEntry(42, 'Pancakes', 0)])
    mockEntriesItemDelete.mockResolvedValue(undefined)

    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove entry' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Remove entry' }))

    await waitFor(() => {
      expect(mockEntriesItemById).toHaveBeenCalledWith(42)
      expect(mockEntriesItemDelete).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Entry removed')
    })
  })

  it('should show error toast when deleting entry fails', async () => {
    mockSettingsGet.mockResolvedValue({ activeDays: 127 })
    mockEntriesGet.mockResolvedValue([buildEntry(42, 'Pancakes', 0)])
    mockEntriesItemDelete.mockRejectedValue(new Error('Delete failed'))

    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove entry' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Remove entry' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to remove entry. Please try again.')
    })
  })

  // ------- 6. Recipe suggestions in dialog -------
  it('should show recipe suggestions when typing a matching name', async () => {
    const user = userEvent.setup()
    mockRecipesFetch([
      { id: 1, name: 'Pasta Carbonara' },
      { id: 2, name: 'Pasta Bolognese' },
      { id: 3, name: 'Salad' },
    ])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    const input = screen.getByPlaceholderText('Meal name...')
    await user.type(input, 'Pasta')

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
      expect(screen.getByText('Pasta Bolognese')).toBeInTheDocument()
    })
    expect(screen.queryByText('Salad')).not.toBeInTheDocument()
  })

  it('should select a recipe suggestion and submit with recipeId', async () => {
    const user = userEvent.setup()
    mockRecipesFetch([{ id: 1, name: 'Pasta Carbonara' }])
    mockEntriesPost.mockResolvedValue({ id: 10, name: 'Pasta Carbonara', recipeId: 1 })

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    const input = screen.getByPlaceholderText('Meal name...')
    await user.type(input, 'Pasta')

    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Pasta Carbonara'))

    expect(input).toHaveValue('Pasta Carbonara')

    await user.click(screen.getByRole('button', { name: 'Add meal' }))

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
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    // Input is focused but empty — no suggestions
    expect(screen.queryByText('Pasta')).not.toBeInTheDocument()
  })

  // ------- 7. Note in dialog -------
  it('should show a note preview on the day row when a note exists', async () => {
    mockNotesApi([
      { id: 1, date: toDateInputValue(today), note: 'Eating at friends' }
    ])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Eating at friends')).toBeInTheDocument()
    })

    // Verify noteDate is consistent
    expect(toDateInputValue(today)).toBeTruthy()
  })

  it('should pre-fill the note textarea with existing note text', async () => {
    mockNotesApi([
      { id: 1, date: toDateInputValue(today), note: 'Eating at friends' }
    ])

    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('Add a note...')
      expect(textarea).toHaveValue('Eating at friends')
    })
  })

  it('should save note when Save button is clicked', async () => {
    const user = userEvent.setup()
    mockNotesApi([])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    const textarea = screen.getByPlaceholderText('Add a note...')
    await user.type(textarea, 'New note')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const putCall = findNotesCall('PUT')
      expect(putCall).toBeTruthy()
      expect(JSON.parse(((putCall?.[1] as { body?: string })?.body) ?? '{}')).toEqual(
        expect.objectContaining({ note: 'New note' })
      )
    })
  })

  it('should delete note when textarea is cleared and Save is clicked', async () => {
    mockNotesApi([
      { id: 42, date: toDateInputValue(today), note: 'Old note' }
    ])

    const user = userEvent.setup()

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a note...')).toHaveValue('Old note')
    })

    // Click clear button to empty the textarea
    await user.click(screen.getByRole('button', { name: 'Clear note' }))

    expect(screen.getByPlaceholderText('Add a note...')).toHaveValue('')

    // Click Save to trigger note deletion
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/food-plan/notes/42',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('should show Clear note button only when textarea has text', async () => {
    const user = userEvent.setup()
    mockNotesApi([])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i dag/ }))

    // No text → no clear button
    expect(screen.queryByRole('button', { name: 'Clear note' })).not.toBeInTheDocument()

    // Type something → clear button appears
    await user.type(screen.getByPlaceholderText('Add a note...'), 'Hello')
    expect(screen.getByRole('button', { name: 'Clear note' })).toBeInTheDocument()
  })

  it('should fetch notes with date-only strings (not datetime strings)', async () => {
    // Regression test: the notes GET endpoint expects DateOnly query params
    // (yyyy-MM-dd), not datetime strings (yyyy-MM-ddTHH:mm:ssZ).
    // Passing datetime strings would cause a 400 and notes would never load.
    mockNotesApi([])

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(
        mockApiFetch.mock.calls.some(
          (c) => typeof c[0] === 'string' && (c[0] as string).startsWith('/api/food-plan/notes?')
        )
      ).toBe(true)
    })

    const notesCall = mockApiFetch.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).startsWith('/api/food-plan/notes?')
    )
    const params = new URL(`http://x${notesCall![0] as string}`).searchParams
    const startDate = params.get('startDate')!
    const endDate = params.get('endDate')!
    // Must be date-only strings: "yyyy-MM-dd" (10 chars, no 'T')
    expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('should show note preview on day row after saving a new note', async () => {
    // Regression test: after saving a note, the notes query is invalidated
    // and the note preview must appear on the day row.
    const savedNote = { id: 1, date: toDateInputValue(today), note: 'Dinner with family' }
    let noteGetCount = 0
    mockApiFetch.mockImplementation((path: string, init?: { method?: string }) => {
      if (typeof path === 'string' && path.startsWith('/api/food-plan/notes') && !init) {
        const notes = noteGetCount++ === 0 ? [] : [savedNote]
        return Promise.resolve({ ok: true, json: async () => notes })
      }
      return Promise.resolve({ ok: true })
    })

    const user = userEvent.setup()
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    // Open today's dialog
    await user.click(screen.getByRole('button', { name: /i dag/ }))

    // Type a note and save
    await user.type(screen.getByPlaceholderText('Add a note...'), 'Dinner with family')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const putCall = findNotesCall('PUT')
      expect(putCall).toBeTruthy()
      expect(JSON.parse(((putCall?.[1] as { body?: string })?.body) ?? '{}')).toEqual(
        expect.objectContaining({ note: 'Dinner with family' })
      )
    })

    // After save, query is invalidated → re-fetched → note preview shown on day row
    await waitFor(() => {
      expect(screen.getByText('Dinner with family')).toBeInTheDocument()
    })
  })

  // ------- 8. Shopping list dialog -------
  it('should open the shopping list dialog via header action', async () => {
    mockShoppingListsGet.mockResolvedValue([{ id: 1, name: 'Weekly Groceries' }])

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

  // ------- 9. Header actions registration -------
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

    const calls = mockSetHeaderActions.mock.calls
    const lastCall = calls[calls.length - 1][0]
    expect(lastCall).toBeNull()
  })

  // ------- 10. Entry chip: recipe links vs plain text -------
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

  // ------- 11. Entry chip colour -------
  it('should render green chip when addedToShoppingListOn is set', async () => {
    const entries = [
      buildEntry(1, 'Pasta', 0, { addedToShoppingListOn: '2026-03-10T00:00:00Z' }),
    ]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const chip = screen.getByText('Pasta').closest('[class*="bg-green-50"]')
    expect(chip).toBeInTheDocument()
    expect(chip?.className).not.toContain('bg-blue-50')
  })

  it('should render blue chip when addedToShoppingListOn is null', async () => {
    const entries = [buildEntry(1, 'Pasta', 0)]
    mockEntriesGet.mockResolvedValue(entries)

    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Pasta')).toBeInTheDocument()
    })

    const chip = screen.getByText('Pasta').closest('[class*="bg-blue-50"]')
    expect(chip).toBeInTheDocument()
    expect(chip?.className).not.toContain('bg-green-50')
  })

  // ------- 12. Floating back-to-today button -------
  it('should render the floating back-to-today button', async () => {
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Scroll to today' })).toBeInTheDocument()
    })
  })

  it('should hide the floating button initially (today is visible)', async () => {
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Scroll to today' })).toBeInTheDocument()
    })

    const floatingBtn = screen.getByRole('button', { name: 'Scroll to today' })
    expect(floatingBtn.className).toContain('opacity-0')
    expect(floatingBtn.className).toContain('pointer-events-none')
  })

  it('should show the floating button when today scrolls out of view', async () => {
    render(<FoodPlanPage />)

    // Wait until today's row is rendered (data loaded, callback ref fired, observer set)
    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    // Simulate today going out of view
    act(() => {
      intersectionCallback?.([{ isIntersecting: false } as IntersectionObserverEntry])
    })

    await waitFor(() => {
      const floatingBtn = screen.getByRole('button', { name: 'Scroll to today' })
      expect(floatingBtn.className).toContain('opacity-100')
      expect(floatingBtn.className).not.toContain('pointer-events-none')
    })
  })

  it('should hide the floating button when today scrolls back into view', async () => {
    render(<FoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    // Simulate today going out of view then back in
    act(() => {
      intersectionCallback?.([{ isIntersecting: false } as IntersectionObserverEntry])
      intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry])
    })

    await waitFor(() => {
      const floatingBtn = screen.getByRole('button', { name: 'Scroll to today' })
      expect(floatingBtn.className).toContain('opacity-0')
    })
  })

  it('should automatically scroll to today when data loads (initial centering)', async () => {
    render(<FoodPlanPage />)

    // Wait until today's row is rendered (data loaded, callback ref fired)
    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    // window.scrollTo should have been called with behavior: 'instant' from the callback ref
    expect(mockScrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }))
  })

  it('should call window.scrollTo when the floating button is clicked', async () => {
    const user = userEvent.setup()
    render(<FoodPlanPage />)

    // Wait until today's row is rendered (data loaded, callback ref fired, observer set)
    await waitFor(() => {
      expect(screen.getByText('i dag')).toBeInTheDocument()
    })

    mockScrollTo.mockClear()

    // Make button visible first
    act(() => {
      intersectionCallback?.([{ isIntersecting: false } as IntersectionObserverEntry])
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Scroll to today' }).className).toContain('opacity-100')
    })

    await user.click(screen.getByRole('button', { name: 'Scroll to today' }))

    expect(mockScrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
  })
})


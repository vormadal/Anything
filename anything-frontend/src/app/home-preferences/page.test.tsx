import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import HomePreferencesPage from './page'

const mockCardPreferencesGet = jest.fn()
const mockCardPreferencesPut = jest.fn()

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      home: {
        cardPreferences: {
          get: (...args: unknown[]) => mockCardPreferencesGet(...args),
          put: (...args: unknown[]) => mockCardPreferencesPut(...args),
        },
      },
    },
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/home-preferences',
}))

describe('HomePreferencesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCardPreferencesGet.mockResolvedValue([
      { cardKey: 'foodplan', sortOrder: 0, isVisible: true },
      { cardKey: 'lists', sortOrder: 1, isVisible: true },
      { cardKey: 'bills', sortOrder: 2, isVisible: true },
    ])
    mockCardPreferencesPut.mockResolvedValue(undefined)
  })

  it('should display a loading state', () => {
    mockCardPreferencesGet.mockImplementation(() => new Promise(() => {}))

    render(<HomePreferencesPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render one row per card with a visibility toggle', async () => {
    render(<HomePreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText('Menu of the Day')).toBeInTheDocument()
    })

    expect(screen.getByText('Lists')).toBeInTheDocument()
    expect(screen.getByText('Bills')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(3)
  })

  it('should render rows in the order returned by the API', async () => {
    mockCardPreferencesGet.mockResolvedValue([
      { cardKey: 'bills', sortOrder: 0, isVisible: true },
      { cardKey: 'foodplan', sortOrder: 1, isVisible: true },
      { cardKey: 'lists', sortOrder: 2, isVisible: true },
    ])

    render(<HomePreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText('Bills')).toBeInTheDocument()
    })

    const rowTitles = screen.getAllByRole('switch').map((el) => el.getAttribute('aria-label'))
    expect(rowTitles).toEqual([
      'Show Bills on home page',
      'Show Menu of the Day on home page',
      'Show Lists on home page',
    ])
  })

  it('should save all cards with the toggled visibility when a switch is clicked', async () => {
    const user = userEvent.setup()

    render(<HomePreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText('Lists')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('switch', { name: 'Show Lists on home page' }))

    await waitFor(() => {
      expect(mockCardPreferencesPut).toHaveBeenCalledWith({
        cards: [
          { cardKey: 'foodplan', isVisible: true },
          { cardKey: 'lists', isVisible: false },
          { cardKey: 'bills', isVisible: true },
        ],
      })
    })
  })

  it('should set the left action to back on mount', async () => {
    render(<HomePreferencesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
    })
  })
})

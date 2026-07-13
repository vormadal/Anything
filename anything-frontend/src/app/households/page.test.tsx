import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import HouseholdsPage from './page'

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const mockSetSelectedHouseholdId = jest.fn()
const defaultHouseholds = [
  { id: 1, name: 'Smith Family', role: 'Owner', createdOn: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Work Team', role: 'Member', createdOn: '2024-02-01T00:00:00Z' },
]

const mockUseHouseholdContext: jest.Mock = jest.fn(() => ({
  households: defaultHouseholds,
  isLoading: false,
  selectedHouseholdId: 1 as number | null,
  setSelectedHouseholdId: mockSetSelectedHouseholdId,
}))

jest.mock('@/context/HouseholdContext', () => ({
  useHouseholdContext: (...args: unknown[]) => mockUseHouseholdContext(...args),
  HouseholdProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockCreateMutateAsync = jest.fn()
jest.mock('@/hooks/useHouseholds', () => ({
  useCreateHousehold: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
}))

const mockAcceptInviteMutateAsync = jest.fn()
jest.mock('@/hooks/useAuth', () => ({
  useMyPendingInvites: () => ({ data: [] }),
  useAcceptHouseholdInvite: () => ({
    mutateAsync: mockAcceptInviteMutateAsync,
    isPending: false,
  }),
  useIsAuthenticated: () => false,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/households',
  useParams: () => ({}),
  useSearchParams: () => ({ get: jest.fn() }),
}))

jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  Link.displayName = 'Link'
  return Link
})

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('HouseholdsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseHouseholdContext.mockReturnValue({
      households: defaultHouseholds,
      isLoading: false,
      selectedHouseholdId: 1,
      setSelectedHouseholdId: mockSetSelectedHouseholdId,
    })
  })

  it('renders household list with names', () => {
    render(<HouseholdsPage />)
    expect(screen.getByText('Smith Family')).toBeInTheDocument()
    expect(screen.getByText('Work Team')).toBeInTheDocument()
  })

  it('shows Active badge for the selected household', () => {
    render(<HouseholdsPage />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows Switch button only for non-active households', () => {
    render(<HouseholdsPage />)
    const switchButtons = screen.getAllByRole('button', { name: /switch/i })
    expect(switchButtons).toHaveLength(1)
  })

  it('calls setSelectedHouseholdId when Switch is clicked', () => {
    render(<HouseholdsPage />)
    fireEvent.click(screen.getByRole('button', { name: /switch/i }))
    expect(mockSetSelectedHouseholdId).toHaveBeenCalledWith(2)
  })

  it('shows links to detail pages', () => {
    render(<HouseholdsPage />)
    expect(screen.getByRole('link', { name: /smith family/i })).toHaveAttribute('href', '/households/1')
    expect(screen.getByRole('link', { name: /work team/i })).toHaveAttribute('href', '/households/2')
  })

  it('shows Add Household button and create form when clicked', () => {
    render(<HouseholdsPage />)
    fireEvent.click(screen.getByRole('button', { name: /add household/i }))
    expect(screen.getByPlaceholderText('Household name')).toBeInTheDocument()
  })

  it('calls createHousehold on form submit', async () => {
    const newHousehold = { id: 3, name: 'New Home', role: 'Owner', createdOn: '2024-03-01T00:00:00Z' }
    mockCreateMutateAsync.mockResolvedValue(newHousehold)

    render(<HouseholdsPage />)
    fireEvent.click(screen.getByRole('button', { name: /add household/i }))

    const input = screen.getByPlaceholderText('Household name')
    fireEvent.change(input, { target: { value: 'New Home' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({ name: 'New Home' })
    })
  })

  it('renders loading state', () => {
    mockUseHouseholdContext.mockReturnValue({
      households: [],
      isLoading: true,
      selectedHouseholdId: null,
      setSelectedHouseholdId: jest.fn(),
    })
    render(<HouseholdsPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders empty state when no households', () => {
    mockUseHouseholdContext.mockReturnValue({
      households: [],
      isLoading: false,
      selectedHouseholdId: null,
      setSelectedHouseholdId: jest.fn(),
    })
    render(<HouseholdsPage />)
    expect(screen.getByText(/no households yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create household/i })).toBeInTheDocument()
  })

  describe('offline', () => {
    function setOnline(value: boolean) {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value })
    }

    afterEach(() => {
      setOnline(true)
    })

    it('disables creating a household while offline', () => {
      mockUseHouseholdContext.mockReturnValue({
        households: [],
        isLoading: false,
        selectedHouseholdId: null,
        setSelectedHouseholdId: jest.fn(),
      })
      setOnline(false)
      render(<HouseholdsPage />)
      expect(screen.getByRole('button', { name: /create household/i })).toBeDisabled()
    })

    it('disables the Add Household button while offline', () => {
      setOnline(false)
      render(<HouseholdsPage />)
      expect(screen.getByRole('button', { name: /add household/i })).toBeDisabled()
    })
  })
})


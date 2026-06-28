import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '@/__tests__/utils/test-utils'
import HouseholdDetailPage from './page'
import { toast } from 'sonner'

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const mockHouseholdDetail = {
  id: 1,
  name: 'Smith Family',
  createdOn: '2024-01-01T00:00:00Z',
  members: [
    { userId: 10, name: 'Alice', email: 'alice@example.com', role: 'Owner', joinedOn: '2024-01-01T00:00:00Z' },
    { userId: 11, name: 'Bob', email: 'bob@example.com', role: 'Member', joinedOn: '2024-01-02T00:00:00Z' },
  ],
}

const mockHouseholdGet = jest.fn()
const mockUpdateMutateAsync = jest.fn()
const mockCreateInviteMutateAsync = jest.fn()
const mockRemoveMutateAsync = jest.fn()
const mockUpdateRoleMutateAsync = jest.fn()

jest.mock('@/hooks/useHouseholds', () => ({
  useHousehold: (...args: unknown[]) => mockHouseholdGet(...args),
  useUpdateHousehold: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useRemoveHouseholdMember: () => ({ mutateAsync: mockRemoveMutateAsync, isPending: false }),
  useUpdateHouseholdMemberRole: () => ({ mutateAsync: mockUpdateRoleMutateAsync, isPending: false }),
}))

const mockCurrentUser = jest.fn()
jest.mock('@/hooks/useAuth', () => ({
  useCreateInvite: () => ({ mutateAsync: mockCreateInviteMutateAsync, isPending: false }),
  useCurrentUser: (...args: unknown[]) => mockCurrentUser(...args),
}))

const mockGetHouseholdRole = jest.fn()
jest.mock('@/context/HouseholdContext', () => ({
  useHouseholdContext: () => ({
    selectedHouseholdId: 1,
    setSelectedHouseholdId: jest.fn(),
    households: [],
    isLoading: false,
    currentHouseholdRole: mockGetHouseholdRole(1),
    getHouseholdRole: mockGetHouseholdRole,
  }),
  HouseholdProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockPush = jest.fn()
const mockUseParams = jest.fn(() => ({ id: '1' }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useParams: (...args: unknown[]) => mockUseParams(...args),
  usePathname: () => '/households/1',
  useSearchParams: () => ({ get: jest.fn() }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}))

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn(() => Promise.resolve()) },
  writable: true,
  configurable: true,
})

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('HouseholdDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseParams.mockReturnValue({ id: '1' })
    mockHouseholdGet.mockReturnValue({ data: mockHouseholdDetail, isLoading: false })
    mockCurrentUser.mockReturnValue({ data: { name: 'Admin', email: 'admin@test.com', role: 'Admin' } })
    mockUpdateMutateAsync.mockResolvedValue(undefined)
    mockCreateInviteMutateAsync.mockResolvedValue({ inviteUrl: '/register?token=abc', token: 'abc' })
    mockRemoveMutateAsync.mockResolvedValue(undefined)
    mockUpdateRoleMutateAsync.mockResolvedValue(undefined)
    // Default: current user is the household Owner (a manager).
    mockGetHouseholdRole.mockReturnValue('Owner')
  })

  it('renders back button', () => {
    render(<HouseholdDetailPage />)
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('renders household name', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Smith Family').length).toBeGreaterThan(0)
    })
  })

  it('renders member names', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('shows Active badge for the selected household', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('shows loading state', () => {
    mockHouseholdGet.mockReturnValue({ data: undefined, isLoading: true })
    render(<HouseholdDetailPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows not found when household is undefined after loading', async () => {
    mockHouseholdGet.mockReturnValue({ data: undefined, isLoading: false })
    render(<HouseholdDetailPage />)
    await waitFor(() => {
      expect(screen.getByText(/household not found/i)).toBeInTheDocument()
    })
  })

  it('shows invalid id error for non-numeric id', async () => {
    mockUseParams.mockReturnValue({ id: 'abc' })
    render(<HouseholdDetailPage />)
    await waitFor(() => {
      expect(screen.getByText(/invalid household id/i)).toBeInTheDocument()
    })
  })

  it('opens rename dialog when pencil button is clicked', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /rename household/i }))
    fireEvent.click(screen.getByRole('button', { name: /rename household/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Rename Household')).toBeInTheDocument()
  })

  it('calls updateHousehold when rename form is submitted', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /rename household/i }))
    fireEvent.click(screen.getByRole('button', { name: /rename household/i }))

    const input = screen.getByDisplayValue('Smith Family')
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({ id: 1, name: 'New Name' })
      expect(toast.success).toHaveBeenCalledWith('Household renamed')
    })
  })

  it('opens invite member dialog', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /invite member/i }))
    fireEvent.click(screen.getByRole('button', { name: /invite member/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Invite Member')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument()
  })

  it('creates invite link when form is submitted', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /invite member/i }))
    fireEvent.click(screen.getByRole('button', { name: /invite member/i }))

    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /create invite link/i }))

    await waitFor(() => {
      expect(mockCreateInviteMutateAsync).toHaveBeenCalledWith({ email: 'new@example.com', householdId: 1 })
      expect(toast.success).toHaveBeenCalledWith('Invite link created!')
    })

    expect(screen.getByDisplayValue(/register\?token=abc/)).toBeInTheDocument()
  })

  it('opens remove confirmation dialog when trash icon is clicked', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /remove bob/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove bob/i }))
    expect(screen.getByText('Remove Member')).toBeInTheDocument()
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(1)
  })

  it('calls removeMember when confirmed in dialog', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /remove bob/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove bob/i }))

    const confirmBtn = screen.getByRole('button', { name: /^remove$/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockRemoveMutateAsync).toHaveBeenCalledWith({ householdId: 1, userId: 11 })
      expect(toast.success).toHaveBeenCalledWith('Bob removed')
    })
  })

  it('cancels removal when Cancel is clicked in dialog', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /remove bob/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove bob/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockRemoveMutateAsync).not.toHaveBeenCalled()
  })

  it('does not show a remove button for the Owner', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByText('Alice'))
    expect(screen.queryByRole('button', { name: /remove alice/i })).not.toBeInTheDocument()
  })

  it('promotes a member to Admin via the role selector', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByLabelText(/change role for bob/i))
    fireEvent.change(screen.getByLabelText(/change role for bob/i), { target: { value: 'Admin' } })

    await waitFor(() => {
      expect(mockUpdateRoleMutateAsync).toHaveBeenCalledWith({ householdId: 1, userId: 11, role: 'Admin' })
    })
  })

  describe('Configuration section', () => {
    it('shows Configuration section for household managers', async () => {
      render(<HouseholdDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument()
      })
    })

    it('shows Lists group with Suggestions and Suggestion Categories', async () => {
      render(<HouseholdDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Lists')).toBeInTheDocument()
        expect(screen.getByText('Suggestions')).toBeInTheDocument()
        expect(screen.getByText('Suggestion Categories')).toBeInTheDocument()
      })
    })

    it('shows Recipes group with Recipe Tags', async () => {
      render(<HouseholdDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Recipes')).toBeInTheDocument()
        expect(screen.getByText('Recipe Tags')).toBeInTheDocument()
      })
    })

    it('navigates to suggestions page when Suggestions card is clicked', async () => {
      render(<HouseholdDetailPage />)
      await waitFor(() => screen.getByText('Suggestions'))
      fireEvent.click(screen.getByText('Suggestions'))
      expect(mockPush).toHaveBeenCalledWith('/households/1/lists/suggestions')
    })

    it('navigates to categories page when Suggestion Categories card is clicked', async () => {
      render(<HouseholdDetailPage />)
      await waitFor(() => screen.getByText('Suggestion Categories'))
      fireEvent.click(screen.getByText('Suggestion Categories'))
      expect(mockPush).toHaveBeenCalledWith('/households/1/lists/suggestions/categories')
    })

    it('navigates to recipe tags page when Recipe Tags card is clicked', async () => {
      render(<HouseholdDetailPage />)
      await waitFor(() => screen.getByText('Recipe Tags'))
      fireEvent.click(screen.getByText('Recipe Tags'))
      expect(mockPush).toHaveBeenCalledWith('/households/1/recipes/tags')
    })

    it('hides Configuration section for non-manager members', async () => {
      mockGetHouseholdRole.mockReturnValue('Member')
      render(<HouseholdDetailPage />)
      await waitFor(() => screen.getAllByText('Smith Family'))
      expect(screen.queryByText('Configuration')).not.toBeInTheDocument()
      expect(screen.queryByText('Suggestions')).not.toBeInTheDocument()
    })
  })
})

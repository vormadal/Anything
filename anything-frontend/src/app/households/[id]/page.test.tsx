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

jest.mock('@/hooks/useHouseholds', () => ({
  useHousehold: (...args: unknown[]) => mockHouseholdGet(...args),
  useUpdateHousehold: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useRemoveHouseholdMember: () => ({ mutateAsync: mockRemoveMutateAsync, isPending: false }),
}))

jest.mock('@/hooks/useAuth', () => ({
  useCreateInvite: () => ({ mutateAsync: mockCreateInviteMutateAsync, isPending: false }),
}))

jest.mock('@/context/HouseholdContext', () => ({
  useHouseholdContext: () => ({
    selectedHouseholdId: 1,
    setSelectedHouseholdId: jest.fn(),
    households: [],
    isLoading: false,
  }),
  HouseholdProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockUseParams = jest.fn(() => ({ id: '1' }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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
    mockUpdateMutateAsync.mockResolvedValue(undefined)
    mockCreateInviteMutateAsync.mockResolvedValue({ inviteUrl: '/register?token=abc', token: 'abc' })
    mockRemoveMutateAsync.mockResolvedValue(undefined)
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
    fireEvent.click(screen.getByRole('button', { name: /create link/i }))

    await waitFor(() => {
      expect(mockCreateInviteMutateAsync).toHaveBeenCalledWith({ email: 'new@example.com', householdId: 1 })
      expect(toast.success).toHaveBeenCalledWith('Invite link created!')
    })

    expect(screen.getByDisplayValue(/register\?token=abc/)).toBeInTheDocument()
  })

  it('opens remove confirmation dialog when trash icon is clicked', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /remove alice/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove alice/i }))
    expect(screen.getByText('Remove Member')).toBeInTheDocument()
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(1)
  })

  it('calls removeMember when confirmed in dialog', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /remove alice/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove alice/i }))

    const confirmBtn = screen.getByRole('button', { name: /^remove$/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockRemoveMutateAsync).toHaveBeenCalledWith({ householdId: 1, userId: 10 })
      expect(toast.success).toHaveBeenCalledWith('Alice removed')
    })
  })

  it('cancels removal when Cancel is clicked in dialog', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /remove alice/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove alice/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockRemoveMutateAsync).not.toHaveBeenCalled()
  })
})

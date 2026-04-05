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
const mockAddMutateAsync = jest.fn()
const mockRemoveMutateAsync = jest.fn()

jest.mock('@/hooks/useHouseholds', () => ({
  useHousehold: (...args: unknown[]) => mockHouseholdGet(...args),
  useUpdateHousehold: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useAddHouseholdMember: () => ({ mutateAsync: mockAddMutateAsync, isPending: false }),
  useRemoveHouseholdMember: () => ({ mutateAsync: mockRemoveMutateAsync, isPending: false }),
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

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('HouseholdDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseParams.mockReturnValue({ id: '1' })
    mockHouseholdGet.mockReturnValue({ data: mockHouseholdDetail, isLoading: false })
    mockUpdateMutateAsync.mockResolvedValue(undefined)
    mockAddMutateAsync.mockResolvedValue(undefined)
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

  it('opens add member dialog', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /add member/i }))
    fireEvent.click(screen.getByRole('button', { name: /add member/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter user ID')).toBeInTheDocument()
  })

  it('calls addMember when add member form is submitted', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /add member/i }))
    fireEvent.click(screen.getByRole('button', { name: /add member/i }))

    fireEvent.change(screen.getByPlaceholderText('Enter user ID'), { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: /^add member$/i }))

    await waitFor(() => {
      expect(mockAddMutateAsync).toHaveBeenCalledWith({ householdId: 1, userId: 42, role: 'Member' })
      expect(toast.success).toHaveBeenCalledWith('Member added')
    })
  })

  it('shows validation error for invalid user ID', async () => {
    render(<HouseholdDetailPage />)
    await waitFor(() => screen.getByRole('button', { name: /add member/i }))
    fireEvent.click(screen.getByRole('button', { name: /add member/i }))

    // In jsdom HTML5 form validation is not enforced, so we can directly test
    // the component's JS validation by entering a zero (invalid) user ID.
    const input = screen.getByPlaceholderText('Enter user ID')
    fireEvent.change(input, { target: { value: '0', valueAsNumber: 0 } })
    // Remove min/required so jsdom doesn't short-circuit the form submission
    input.removeAttribute('min')
    input.removeAttribute('required')
    fireEvent.click(screen.getByRole('button', { name: /^add member$/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please enter a valid user ID')
    })
    expect(mockAddMutateAsync).not.toHaveBeenCalled()
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


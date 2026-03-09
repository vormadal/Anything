import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/__tests__/utils/test-utils'
import EditFoodPlanPage from './page'
import { toast } from 'sonner'

// Mock the apiClient module
const mockGet = jest.fn()
const mockPut = jest.fn()
const mockById = jest.fn(() => ({
  get: mockGet,
  put: mockPut,
  delete: jest.fn(),
  entries: {
    get: jest.fn(),
    post: jest.fn(),
    byId: jest.fn(() => ({ put: jest.fn(), delete: jest.fn() })),
  },
  addToShoppingList: { post: jest.fn() },
}))

jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    api: {
      foodPlans: {
        get: jest.fn().mockResolvedValue([]),
        post: jest.fn(),
        byId: (...args: unknown[]) => mockById(...args),
      },
    },
  },
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/food-plans/1/edit',
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}))

const mockPlan = {
  id: 1,
  name: 'Week 1',
  weekStart: '2026-03-02T00:00:00Z',
  activeDays: 31,
  autoRenew: false,
}

describe('EditFoodPlanPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display loading state initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}))

    render(<EditFoodPlanPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display not found state when plan is missing', async () => {
    mockGet.mockResolvedValue(null)

    render(<EditFoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('Food plan not found.')).toBeInTheDocument()
    })
  })

  it('should pre-fill the form with existing plan data', async () => {
    mockGet.mockResolvedValue(mockPlan)

    render(<EditFoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Week 1')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('2026-03-02')).toBeInTheDocument()
  })

  it('should render day checkboxes with correct initial state (Mon–Fri selected)', async () => {
    mockGet.mockResolvedValue(mockPlan)

    render(<EditFoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Week 1')).toBeInTheDocument()
    })

    const monCheckbox = screen.getByRole('checkbox', { name: /Mon/i })
    const satCheckbox = screen.getByRole('checkbox', { name: /Sat/i })
    const sunCheckbox = screen.getByRole('checkbox', { name: /Sun/i })

    expect(monCheckbox).toBeChecked()
    expect(satCheckbox).not.toBeChecked()
    expect(sunCheckbox).not.toBeChecked()
  })

  it('should toggle a day when its checkbox is clicked', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue(mockPlan)

    render(<EditFoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Week 1')).toBeInTheDocument()
    })

    const satCheckbox = screen.getByRole('checkbox', { name: /Sat/i })
    expect(satCheckbox).not.toBeChecked()

    await user.click(satCheckbox)

    expect(satCheckbox).toBeChecked()
  })

  it('should submit the form with updated values', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue(mockPlan)
    mockPut.mockResolvedValue(undefined)

    render(<EditFoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Week 1')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText('Food plan name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Week')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Week', activeDays: 31 })
      )
    })

    expect(toast.success).toHaveBeenCalledWith('Food plan updated')
    expect(mockPush).toHaveBeenCalledWith('/food-plans/1')
  })

  it('should show error toast when update fails', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue(mockPlan)
    mockPut.mockRejectedValue(new Error('Server error'))

    render(<EditFoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Week 1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update food plan. Please try again.')
    })
  })

  it('should disable Save Changes button when no days are selected', async () => {
    const user = userEvent.setup()
    // activeDays = 1 → only Monday selected
    mockGet.mockResolvedValue({ ...mockPlan, activeDays: 1 })

    render(<EditFoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Week 1')).toBeInTheDocument()
    })

    // Deselect the only selected day (Monday)
    const monCheckbox = screen.getByRole('checkbox', { name: /Mon/i })
    await user.click(monCheckbox)

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
  })

  it('should navigate back to the food plan on back button click', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue(mockPlan)

    render(<EditFoodPlanPage />)

    await waitFor(() => {
      expect(screen.getByText('← Back to Food Plan')).toBeInTheDocument()
    })

    await user.click(screen.getByText('← Back to Food Plan'))

    expect(mockPush).toHaveBeenCalledWith('/food-plans/1')
  })
})
